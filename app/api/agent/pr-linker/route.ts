import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { linkPRToTask } from "@/lib/agent";

function verifyCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// Vercel Cron — re-scan recent PR events for unlinked tasks
export async function GET(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runPRLinker();
}

// Manual trigger — also useful for retroactively linking past events
export async function POST() {
  return runPRLinker();
}

async function runPRLinker() {
  const supabase = createServiceRoleClient();

  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();

  // Get recent PR events with their connection's project_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events } = await (supabase as any)
    .from("github_events")
    .select("id, pr_title, pr_url, branch_from, connection:github_connections!connection_id(project_id)")
    .eq("event_type", "pull_request")
    .in("action", ["opened", "merged"])
    .not("pr_url", "is", null)
    .gte("created_at", fourteenDaysAgo)
    .order("created_at", { ascending: false })
    .limit(100);

  type EventRow = {
    id: string;
    pr_title: string | null;
    pr_url: string | null;
    branch_from: string | null;
    connection: { project_id: string | null } | null;
  };

  const rows = (events ?? []) as EventRow[];
  const results: Array<{ pr_url: string; linked: boolean; task_title?: string; score?: number }> = [];

  for (const ev of rows) {
    const projectId = ev.connection?.project_id;
    if (!projectId || !ev.pr_url || !ev.pr_title) continue;

    // Skip PRs already linked to a task
    const { data: alreadyLinked } = await supabase
      .from("tasks")
      .select("id")
      .eq("pr_link", ev.pr_url)
      .limit(1);

    if (alreadyLinked && alreadyLinked.length > 0) continue;

    const result = await linkPRToTask(projectId, {
      title: ev.pr_title,
      branch_from: ev.branch_from,
      url: ev.pr_url,
    });

    results.push({ pr_url: ev.pr_url, ...result });
  }

  const linked = results.filter(r => r.linked);

  return NextResponse.json({
    ok: true,
    scanned: rows.length,
    linked: linked.length,
    matches: linked.map(r => ({ pr_url: r.pr_url, task: r.task_title, score: r.score })),
  });
}
