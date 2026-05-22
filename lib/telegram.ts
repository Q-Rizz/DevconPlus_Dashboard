import { Bot, InlineKeyboard } from "grammy";
import { createServiceRoleClient } from "@/lib/supabase";
import type { TaskStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContributorRow {
  id: string;
  email: string;
  full_name: string | null;
  role_id: string | null;
  deleted_at: string | null;
  role: { name: string } | null;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  project: { name: string } | null;
  group?: { name: string } | null;
}

interface MeetingRow {
  id: string;
  title: string;
  type: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  google_meet_link: string | null;
}

interface MilestoneRow {
  id: string;
  title: string;
  status: string;
  target_date: string;
  progress: Array<{ progress_percent: number; progress_note: string; logged_date: string }>;
}

interface EssentialSectionRow {
  id: string;
  title: string;
  icon: string | null;
  entries: Array<{ id: string; label: string; data_type: string; value_text: string | null; note: string | null }>;
}

// ─── Bot singleton ────────────────────────────────────────────────────────────

let _bot: Bot | null = null;

export function getBot(): Bot {
  if (!_bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
    _bot = new Bot(token);
    registerHandlers(_bot);
  }
  return _bot;
}

// ─── Contributor lookup ───────────────────────────────────────────────────────

async function getContributor(telegramUsername: string): Promise<ContributorRow | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("contributors")
    .select("id,email,full_name,role_id,deleted_at,role:roles(name)")
    .eq("telegram_username", telegramUsername)
    .is("deleted_at", null)
    .single();
  return (data as unknown as ContributorRow) ?? null;
}

function notLinkedMessage(): string {
  return (
    "Your Telegram username is not linked to a DEVCON+ PM account.\n" +
    "Ask your PM to add your Telegram username in the Contributors page."
  );
}

function formatDue(due: string | null): string {
  if (!due) return "No due date";
  return new Date(due).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Command handlers ─────────────────────────────────────────────────────────

function registerHandlers(bot: Bot) {
  // /help
  bot.command("help", (ctx) => {
    ctx.reply(
      "📖 *DEVCON\\+ PM Bot Commands*\n\n" +
        "/mytasks — View your currently assigned tasks\n" +
        "/deadlines — Tasks due in the next 7 days\n" +
        "/status <keyword> — Search your tasks and update status\n" +
        "/meetings — Your upcoming meetings this week\n" +
        "/standup — Get a quick standup summary\n" +
        "/milestones — Current milestone status and progress\n" +
        "/essentials [term] — Browse or search the team essentials wiki\n" +
        "/announce <message> — \\(PM only\\) Send announcement to all contributors\n" +
        "/help — Show this message",
      { parse_mode: "MarkdownV2" }
    );
  });

  // /mytasks
  bot.command("mytasks", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) {
      return ctx.reply("Could not determine your Telegram username. Please set one in Telegram settings.");
    }

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const supabase = createServiceRoleClient();
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id,title,status,due_date,project:projects(name),group:groups(name)")
      .eq("assignee_id", contributor.id)
      .not("status", "eq", "Done")
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("[/mytasks]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const rows = tasks as unknown as TaskRow[];

    if (!rows || rows.length === 0) {
      return ctx.reply("You have no assigned tasks right now. 🎉");
    }

    const lines = rows.map((t, i) => {
      const due = formatDue(t.due_date);
      const project = t.project?.name ?? "Unknown";
      const group = t.group?.name ?? "Unknown";
      return (
        `${i + 1}. ${t.title} — ${t.status} — Due: ${due}\n` +
        `   Project: ${project} | Group: ${group}`
      );
    });

    await ctx.reply(`📋 Your open tasks:\n\n${lines.join("\n\n")}`);
  });

  // /deadlines
  bot.command("deadlines", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) {
      return ctx.reply("Could not determine your Telegram username.");
    }

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const now = new Date();
    const sevenDays = new Date();
    sevenDays.setDate(now.getDate() + 7);

    const supabase = createServiceRoleClient();
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id,title,status,due_date,project:projects(name)")
      .eq("assignee_id", contributor.id)
      .not("status", "eq", "Done")
      .gte("due_date", now.toISOString().split("T")[0])
      .lte("due_date", sevenDays.toISOString().split("T")[0])
      .order("due_date", { ascending: true });

    if (error) {
      console.error("[/deadlines]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const rows = tasks as unknown as TaskRow[];

    if (!rows || rows.length === 0) {
      return ctx.reply("No deadlines in the next 7 days. You're all good! ✅");
    }

    const lines = rows.map(
      (t) => `• ${t.title} — Due ${formatDue(t.due_date)} — ${t.status}`
    );

    await ctx.reply(`⏰ Upcoming deadlines (next 7 days):\n\n${lines.join("\n")}`);
  });

  // /status [keyword] — inline keyboards keep state in callback data (stateless)
  bot.command("status", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) {
      return ctx.reply("Could not determine your Telegram username.");
    }

    const keyword = ctx.match?.trim();
    if (!keyword) {
      return ctx.reply("Usage: /status <task keyword>\nExample: /status login page");
    }

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const supabase = createServiceRoleClient();
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id,title,status,due_date")
      .eq("assignee_id", contributor.id)
      .ilike("title", `%${keyword}%`)
      .limit(5);

    if (error) {
      console.error("[/status search]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    if (!tasks || tasks.length === 0) {
      return ctx.reply(`No tasks found matching "${keyword}". Try a different keyword.`);
    }

    if (tasks.length === 1) {
      await ctx.reply(
        `Found: ${(tasks[0] as unknown as TaskRow).title}\n\nUpdate status to:`,
        { reply_markup: buildStatusKeyboard(tasks[0].id) }
      );
    } else {
      const keyboard = new InlineKeyboard();
      (tasks as unknown as TaskRow[]).forEach((t) => {
        keyboard.text(t.title.slice(0, 64), `pick_task:${t.id}`).row();
      });
      await ctx.reply(`Found ${tasks.length} matching tasks. Which one?`, {
        reply_markup: keyboard,
      });
    }
  });

  // Callback: user picked a task → show status picker
  bot.callbackQuery(/^pick_task:(.+)$/, async (ctx) => {
    const taskId = ctx.match[1];
    const supabase = createServiceRoleClient();
    const { data: task } = await supabase
      .from("tasks")
      .select("id,title,status")
      .eq("id", taskId)
      .single();

    await ctx.answerCallbackQuery();

    if (!task) {
      return ctx.editMessageText("Task not found. It may have been deleted.");
    }

    await ctx.editMessageText(
      `Task: ${(task as unknown as TaskRow).title}\n\nUpdate status to:`,
      { reply_markup: buildStatusKeyboard(taskId) }
    );
  });

  // Callback: user picked a status → update DB
  bot.callbackQuery(/^set_status:(.+):(.+)$/, async (ctx) => {
    const taskId = ctx.match[1];
    const newStatus = decodeURIComponent(ctx.match[2]) as TaskStatus;

    const supabase = createServiceRoleClient();
    const { data: task, error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId)
      .select("id,title,status")
      .single();

    await ctx.answerCallbackQuery();

    if (error || !task) {
      console.error("[/status update]", error);
      return ctx.editMessageText(
        "Something went wrong. Please try again or check the dashboard."
      );
    }

    await ctx.editMessageText(
      `✅ Updated "${(task as unknown as TaskRow).title}" → ${newStatus}`
    );
  });

  // /announce [message]
  bot.command("announce", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) {
      return ctx.reply("Could not determine your Telegram username.");
    }

    const message = ctx.match?.trim();
    if (!message) {
      return ctx.reply(
        "Usage: /announce <message>\nExample: /announce Sprint 3 starts Monday!"
      );
    }

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    // Check PM role
    const roleName = contributor.role?.name?.toLowerCase() ?? "";
    const isPM =
      roleName.includes("product manager") || roleName.includes("project manager");

    if (!isPM) {
      return ctx.reply("Only Project Managers can send announcements.");
    }

    const supabase = createServiceRoleClient();

    const { data: announcement, error: insertError } = await supabase
      .from("announcements")
      .insert({
        title: `Telegram Announcement from @${username}`,
        body: message,
        created_by: contributor.id,
      })
      .select("id")
      .single();

    if (insertError || !announcement) {
      console.error("[/announce insert]", insertError);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/announce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcement_id: (announcement as { id: string }).id }),
    });
    const json = await res.json();

    if (!json.ok) {
      return ctx.reply(`Failed to send: ${json.error ?? "unknown error"}`);
    }

    await ctx.reply(
      `📣 Announcement sent to ${json.sent} contributor${json.sent !== 1 ? "s" : ""}.`
    );
  });

  // /meetings — list the contributor's upcoming meetings (next 7 days)
  bot.command("meetings", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) return ctx.reply("Could not determine your Telegram username.");

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const now = new Date();
    const sevenDays = new Date();
    sevenDays.setDate(now.getDate() + 7);
    const todayStr = now.toISOString().split("T")[0];
    const endStr = sevenDays.toISOString().split("T")[0];

    const supabase = createServiceRoleClient();
    const { data: attendeeRows, error } = await supabase
      .from("meeting_attendees")
      .select("meeting:meetings(id,title,type,meeting_date,start_time,end_time,timezone,google_meet_link)")
      .eq("contributor_id", contributor.id)
      .gte("meeting.meeting_date", todayStr)
      .lte("meeting.meeting_date", endStr)
      .eq("meeting.status", "Scheduled");

    if (error) {
      console.error("[/meetings]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const meetings = (attendeeRows ?? [])
      .map((r) => r.meeting)
      .filter(Boolean) as unknown as MeetingRow[];

    if (meetings.length === 0) {
      return ctx.reply("No meetings scheduled in the next 7 days. 📅");
    }

    meetings.sort((a, b) => a.meeting_date.localeCompare(b.meeting_date) || a.start_time.localeCompare(b.start_time));

    const lines = meetings.map((m) => {
      const date = new Date(m.meeting_date + "T00:00:00").toLocaleDateString("en-PH", {
        weekday: "short", month: "short", day: "numeric",
      });
      const time = `${m.start_time.slice(0, 5)} – ${m.end_time.slice(0, 5)}`;
      const link = m.google_meet_link ? `\n   🔗 ${m.google_meet_link}` : "";
      return `• [${m.type}] ${m.title}\n   ${date} at ${time} (${m.timezone})${link}`;
    });

    await ctx.reply(`📅 Your upcoming meetings:\n\n${lines.join("\n\n")}`);
  });

  // /standup — prompt contributor to post today's standup update
  bot.command("standup", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) return ctx.reply("Could not determine your Telegram username.");

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const supabase = createServiceRoleClient();
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id,title,status")
      .eq("assignee_id", contributor.id)
      .not("status", "eq", "Done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5);

    const rows = (tasks as unknown as TaskRow[]) ?? [];

    const greeting = `Good day, ${contributor.full_name ?? contributor.email}! 👋\n\nHere are your active tasks:\n`;
    const taskLines = rows.length > 0
      ? rows.map((t, i) => `${i + 1}. ${t.title} — ${t.status}`).join("\n")
      : "No active tasks right now.";

    await ctx.reply(
      greeting + taskLines +
      "\n\nUse /status <keyword> to update any task, or head to the dashboard for full details."
    );
  });

  // /milestones — show current milestone statuses and progress
  bot.command("milestones", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) return ctx.reply("Could not determine your Telegram username.");

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("milestones")
      .select("id,title,status,target_date,progress:milestone_progress(progress_percent,progress_note,logged_date)")
      .not("status", "in", '("Achieved","Missed")')
      .order("target_date", { ascending: true })
      .limit(10);

    if (error) {
      console.error("[/milestones]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const milestones = (data as unknown as MilestoneRow[]) ?? [];

    if (milestones.length === 0) {
      return ctx.reply("No active milestones right now.");
    }

    const lines = milestones.map((m) => {
      const sortedProgress = [...(m.progress ?? [])].sort((a, b) => b.logged_date.localeCompare(a.logged_date));
      const latest = sortedProgress[0];
      const pct = latest?.progress_percent ?? 0;
      const note = latest?.progress_note ? `"${latest.progress_note.slice(0, 80)}${latest.progress_note.length > 80 ? "…" : ""}"` : "No updates yet";
      const statusEmoji = m.status === "At Risk" ? "⚠️" : m.status === "In Progress" ? "🔵" : "⬜";
      const due = new Date(m.target_date + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
      return `${statusEmoji} ${m.title} — ${m.status} — ${pct}% — Due ${due}\n   Latest: ${note}`;
    });

    await ctx.reply(`🏁 Project milestones:\n\n${lines.join("\n\n")}`);
  });

  // /essentials [term] — browse sections or search entries
  bot.command("essentials", async (ctx) => {
    const username = ctx.from?.username;
    if (!username) return ctx.reply("Could not determine your Telegram username.");

    const contributor = await getContributor(username).catch(() => null);
    if (!contributor) return ctx.reply(notLinkedMessage());

    const term = ctx.match?.trim().toLowerCase();
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("essential_sections")
      .select("id,title,icon,entries:essential_entries(id,label,data_type,value_text,note)")
      .order("position", { ascending: true });

    if (error) {
      console.error("[/essentials]", error);
      return ctx.reply("Something went wrong. Please try again or check the dashboard.");
    }

    const sections = (data as unknown as EssentialSectionRow[]) ?? [];

    if (sections.length === 0) {
      return ctx.reply("No essentials sections found. Ask your PM to set them up.");
    }

    if (!term) {
      // List section titles with entry counts
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const lines = sections.map((s) => {
        const count = (s.entries ?? []).length;
        const icon = s.icon ? `${s.icon} ` : "";
        return `• ${icon}${s.title} (${count} ${count === 1 ? "entry" : "entries"})`;
      });
      await ctx.reply(
        `📚 Essentials sections:\n\n${lines.join("\n")}\n\nView all: ${appUrl}/essentials`
      );
      return;
    }

    // Search mode: match label or value_text
    const matches: Array<{ section: string; icon: string | null; label: string; value: string | null; note: string | null }> = [];
    for (const s of sections) {
      for (const e of s.entries ?? []) {
        const inLabel = e.label.toLowerCase().includes(term);
        const inValue = e.data_type !== "credential" && e.value_text?.toLowerCase().includes(term);
        if (inLabel || inValue) {
          matches.push({ section: s.title, icon: s.icon, label: e.label, value: e.data_type === "credential" ? "••••••" : e.value_text, note: e.note });
        }
      }
    }

    if (matches.length === 0) {
      return ctx.reply(`No essentials entries found for "${term}".`);
    }

    const lines = matches.slice(0, 15).map((m) => {
      const icon = m.icon ? `${m.icon} ` : "";
      const val = m.value ? `\n   Value: ${m.value.slice(0, 100)}${m.value.length > 100 ? "…" : ""}` : "";
      const note = m.note ? `\n   Note: ${m.note}` : "";
      return `• [${icon}${m.section}] ${m.label}${val}${note}`;
    });

    const suffix = matches.length > 15 ? `\n\n…and ${matches.length - 15} more. Check the dashboard for the full list.` : "";
    await ctx.reply(`🔍 Essentials matching "${term}":\n\n${lines.join("\n\n")}${suffix}`);
  });
  bot.on("message:text", (ctx) => {
    if (ctx.message.text?.startsWith("/")) {
      ctx.reply("Unknown command. Type /help to see what I can do.");
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: TaskStatus[] = [
  "In Progress",
  "Done",
  "Help",
  "I am Stuck",
  "For Improvements",
  "Not Started",
];

function buildStatusKeyboard(taskId: string): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  STATUS_OPTIONS.forEach((s) => {
    keyboard.text(s, `set_status:${taskId}:${encodeURIComponent(s)}`).row();
  });
  return keyboard;
}

// ─── Legacy helpers kept for any future direct-message usage ──────────────────

export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_GROUP_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_GROUP_CHAT_ID not set");
    return;
  }
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function sendTelegramDM(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN not set");
    return;
  }
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
