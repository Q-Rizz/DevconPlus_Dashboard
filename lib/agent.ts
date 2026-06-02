import { createServiceRoleClient } from "@/lib/supabase";

// Tokenize a string into lowercase words (3+ chars, alphanumeric only)
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2);
}

// Score how well a PR (title + branch) matches a task title.
// Returns 0–1: ratio of task-title words found in the PR tokens.
export function scoreMatch(prTitle: string, branchFrom: string | null, taskTitle: string): number {
  const prTokens = new Set([
    ...tokenize(prTitle),
    ...tokenize(branchFrom ?? ""),
  ]);
  const taskTokens = tokenize(taskTitle);
  if (taskTokens.length === 0) return 0;
  return taskTokens.filter(t => prTokens.has(t)).length / taskTokens.length;
}

// Attempt to link a PR to the best-matching unlinked task in a project.
// Writes pr_link on the task if score >= 0.4 (40% of task words match).
export async function linkPRToTask(
  projectId: string,
  pr: { title: string; branch_from: string | null; url: string }
): Promise<{ linked: boolean; task_id?: string; task_title?: string; score?: number }> {
  const supabase = createServiceRoleClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id,title,pr_link")
    .eq("project_id", projectId)
    .is("pr_link", null);

  if (!tasks || tasks.length === 0) return { linked: false };

  type T = { id: string; title: string; pr_link: string | null };
  let best: T | null = null;
  let bestScore = 0;

  for (const t of tasks as unknown as T[]) {
    const score = scoreMatch(pr.title, pr.branch_from, t.title);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  if (!best || bestScore < 0.4) return { linked: false };

  await supabase.from("tasks").update({ pr_link: pr.url }).eq("id", best.id);

  return { linked: true, task_id: best.id, task_title: best.title, score: bestScore };
}
