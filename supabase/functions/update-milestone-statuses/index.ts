// supabase/functions/update-milestone-statuses/index.ts
// Scheduled daily at 8:00 AM Asia/Manila.
// Automatically sets At Risk / Missed status based on target date and progress.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface MilestoneRow {
  id: string;
  target_date: string;
  status: string;
  created_at: string;
}

interface ProgressRow {
  progress_percent: number;
  logged_date: string;
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const { data: milestones, error } = await supabase
    .from("milestones")
    .select("id,target_date,status,created_at")
    .not("status", "in", '("Achieved","Missed")');

  if (error) {
    console.error("[update-milestone-statuses] fetch error:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  const rows = (milestones ?? []) as MilestoneRow[];
  const updates: Array<{ id: string; newStatus: string }> = [];

  for (const m of rows) {
    const targetDate = new Date(m.target_date + "T00:00:00");

    // Overdue → Missed
    if (targetDate < today) {
      updates.push({ id: m.id, newStatus: "Missed" });
      continue;
    }

    // Calculate time window for At Risk detection
    const createdAt = new Date(m.created_at);
    const totalDurationMs = targetDate.getTime() - createdAt.getTime();
    const atRiskThreshold = new Date(targetDate.getTime() - totalDurationMs * 0.2);

    if (today >= atRiskThreshold) {
      // Check latest progress
      const { data: progressRows } = await supabase
        .from("milestone_progress")
        .select("progress_percent,logged_date")
        .eq("milestone_id", m.id)
        .order("logged_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);

      const latestPct = ((progressRows ?? []) as ProgressRow[])[0]?.progress_percent ?? 0;

      if (latestPct < 50 && m.status !== "At Risk") {
        updates.push({ id: m.id, newStatus: "At Risk" });
      }
    }
  }

  let changed = 0;
  for (const u of updates) {
    const { error: updateErr } = await supabase
      .from("milestones")
      .update({ status: u.newStatus })
      .eq("id", u.id);

    if (updateErr) {
      console.warn(`[update-milestone-statuses] failed to update ${u.id}:`, updateErr);
    } else {
      console.log(`[update-milestone-statuses] ${u.id} → ${u.newStatus}`);
      changed++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, checked: rows.length, changed, date: todayStr }),
    { headers: { "Content-Type": "application/json" } }
  );
});
