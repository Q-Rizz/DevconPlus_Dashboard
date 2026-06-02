import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createServiceRoleClient } from "@/lib/supabase";

function verifyCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runRiskScan();
}

export async function POST() {
  return runRiskScan();
}

interface Signal {
  project_id: string;
  project_name: string;
  type: "overdue_tasks" | "blocked_tasks" | "critical_bugs" | "milestone_at_risk";
  description: string;
  entities: string[];
  title: string;
  category: string;
  probability: string;
  impact: string;
}

async function runRiskScan() {
  const supabase = createServiceRoleClient();
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);

  const [
    { data: projects },
    { data: rawTasks },
    { data: rawBugs },
    { data: rawMilestones },
    { data: rawExisting },
  ] = await Promise.all([
    supabase.from("projects").select("id,name"),
    supabase.from("tasks").select("id,title,status,due_date,project_id,updated_at"),
    supabase.from("bugs").select("id,title,severity,status,project_id").in("status", ["Open", "In Progress"]),
    supabase
      .from("milestones")
      .select("id,title,status,target_date,project_id,progress:milestone_progress!milestone_id(progress_percent,logged_date)")
      .not("status", "in", '("Achieved","Missed")'),
    // Only look at agent-created risks to avoid duplicates
    supabase
      .from("risks")
      .select("id,title,project_id,status")
      .in("status", ["Open", "Mitigating"])
      .ilike("title", "⚡%"),
  ]);

  type TaskRow = { id: string; title: string; status: string; due_date: string | null; project_id: string; updated_at: string };
  type BugRow = { id: string; title: string; severity: string; status: string; project_id: string };
  type MilestoneRow = {
    id: string; title: string; status: string; target_date: string; project_id: string | null;
    progress: Array<{ progress_percent: number; logged_date: string }>;
  };
  type ExistingRisk = { id: string; title: string; project_id: string; status: string };

  const tasks = (rawTasks ?? []) as unknown as TaskRow[];
  const bugs = (rawBugs ?? []) as unknown as BugRow[];
  const milestones = (rawMilestones ?? []) as unknown as MilestoneRow[];
  const existing = (rawExisting ?? []) as unknown as ExistingRisk[];

  const signals: Signal[] = [];

  for (const project of (projects ?? [])) {
    const pt = tasks.filter(t => t.project_id === project.id);
    const pb = bugs.filter(b => b.project_id === project.id);
    const pm = milestones.filter(m => m.project_id === project.id);
    const pe = existing.filter(r => r.project_id === project.id);

    // ── Signal 1: Overdue tasks (2+ tasks, 3+ days overdue) ───────────────────
    const overdue = pt.filter(t =>
      t.due_date && t.due_date <= threeDaysAgo && t.status !== "Done"
    );
    if (overdue.length >= 2 && !pe.some(r => r.title.toLowerCase().includes("overdue"))) {
      signals.push({
        project_id: project.id,
        project_name: project.name,
        type: "overdue_tasks",
        description: `${overdue.length} tasks are overdue by 3+ days in project "${project.name}".`,
        entities: overdue.slice(0, 5).map(t => t.title),
        title: `⚡ Auto: ${overdue.length} overdue tasks — schedule slipping`,
        category: "Schedule",
        probability: overdue.length >= 5 ? "High" : "Medium",
        impact: "High",
      });
    }

    // ── Signal 2: Blocked tasks (Help / I am Stuck for 2+ days) ───────────────
    const blocked = pt.filter(t =>
      (t.status === "Help" || t.status === "I am Stuck") &&
      new Date(t.updated_at) <= twoDaysAgo
    );
    if (blocked.length >= 1 && !pe.some(r => r.title.toLowerCase().includes("blocked") || r.title.toLowerCase().includes("stuck"))) {
      signals.push({
        project_id: project.id,
        project_name: project.name,
        type: "blocked_tasks",
        description: `${blocked.length} team member(s) have been stuck or need help for 2+ days in "${project.name}".`,
        entities: blocked.map(t => `${t.title} (${t.status})`),
        title: `⚡ Auto: ${blocked.length} task(s) blocked — resource risk`,
        category: "Resource",
        probability: "Medium",
        impact: blocked.length >= 3 ? "High" : "Medium",
      });
    }

    // ── Signal 3: Critical bugs accumulating (3+) ─────────────────────────────
    const critical = pb.filter(b => b.severity === "Critical");
    if (critical.length >= 3 && !pe.some(r => r.title.toLowerCase().includes("critical") || r.title.toLowerCase().includes("quality"))) {
      signals.push({
        project_id: project.id,
        project_name: project.name,
        type: "critical_bugs",
        description: `${critical.length} critical bugs are unresolved in "${project.name}", threatening release quality.`,
        entities: critical.slice(0, 5).map(b => b.title),
        title: `⚡ Auto: ${critical.length} critical bugs unresolved — quality at risk`,
        category: "Quality",
        probability: "High",
        impact: "High",
      });
    }

    // ── Signal 4: Milestone at risk (< 30% complete, ≤ 7 days left) ──────────
    for (const m of pm) {
      const sorted = [...(m.progress ?? [])].sort((a, b) => b.logged_date.localeCompare(a.logged_date));
      const pct = sorted[0]?.progress_percent ?? 0;
      const daysLeft = Math.ceil((new Date(m.target_date).getTime() - Date.now()) / 86400000);

      if (pct < 30 && daysLeft > 0 && daysLeft <= 7) {
        const slug = m.title.toLowerCase().slice(0, 20);
        if (!pe.some(r => r.title.toLowerCase().includes(slug))) {
          signals.push({
            project_id: project.id,
            project_name: project.name,
            type: "milestone_at_risk",
            description: `Milestone "${m.title}" is only ${pct}% complete with ${daysLeft} day(s) remaining.`,
            entities: [m.title],
            title: `⚡ Auto: Milestone "${m.title.slice(0, 35)}" at risk`,
            category: "Schedule",
            probability: daysLeft <= 3 ? "High" : "Medium",
            impact: "High",
          });
        }
      }
    }
  }

  if (signals.length === 0) {
    return NextResponse.json({ ok: true, created: 0, message: "No new risks detected — project health looks good." });
  }

  // Use Groq to write description + mitigation_plan for each signal
  type EnrichedRisk = {
    project_id: string; title: string; description: string;
    category: string; probability: string; impact: string;
    mitigation_plan: string; status: string;
  };

  let risksToInsert: EnrichedRisk[] = [];

  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const resp = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 800,
        temperature: 0.3,
        messages: [{
          role: "user",
          content:
            `You are a software project manager. For each risk signal, write:\n` +
            `- description: 1-2 sentences, factual, explains the risk clearly\n` +
            `- mitigation_plan: 2-3 concise action items as plain text (no markdown)\n\n` +
            `Return ONLY a JSON array. No markdown, no explanation outside the JSON.\n\n` +
            `Signals:\n${JSON.stringify(signals.map((s, i) => ({
              index: i,
              type: s.type,
              project: s.project_name,
              detail: s.description,
              affected: s.entities,
            })), null, 2)}\n\n` +
            `Format: [{"index":0,"description":"...","mitigation_plan":"..."},...]`,
        }],
      });

      const raw = resp.choices[0]?.message?.content?.trim() ?? "";
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]) as Array<{ index: number; description: string; mitigation_plan: string }>;
        risksToInsert = signals.map((s, i) => {
          const enriched = parsed.find(p => p.index === i);
          return {
            project_id: s.project_id,
            title: s.title,
            description: enriched?.description ?? s.description,
            category: s.category,
            probability: s.probability,
            impact: s.impact,
            mitigation_plan: enriched?.mitigation_plan ?? "Review and resolve the flagged items promptly.",
            status: "Open",
          };
        });
      }
    } catch (err) {
      console.error("[risk-scan] Groq error:", err);
    }
  }

  // Fallback if Groq unavailable or errored
  if (risksToInsert.length === 0) {
    risksToInsert = signals.map(s => ({
      project_id: s.project_id,
      title: s.title,
      description: s.description,
      category: s.category,
      probability: s.probability,
      impact: s.impact,
      mitigation_plan: "Review the flagged items and coordinate with the team to address them.",
      status: "Open",
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabase as any)
    .from("risks")
    .insert(risksToInsert)
    .select("id,title");

  if (error) {
    console.error("[risk-scan] insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const titles = ((inserted ?? []) as Array<{ id: string; title: string }>).map(r => r.title);
  return NextResponse.json({ ok: true, created: titles.length, risks: titles });
}
