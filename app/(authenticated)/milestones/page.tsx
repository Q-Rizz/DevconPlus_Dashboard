import { createServerSupabaseClient } from "@/lib/supabase";
import MilestonesClient from "@/components/milestones/MilestonesClient";
import type { Milestone, Contributor, Project } from "@/types";

export default async function MilestonesPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: projects }, { data: contributors }, { data: milestones }] = await Promise.all([
    supabase.from("projects").select("id,name").order("created_at"),
    supabase
      .from("contributors")
      .select("id,email,full_name,role_id,telegram_username,deleted_at,created_at")
      .is("deleted_at", null)
      .order("full_name"),
    supabase
      .from("milestones")
      .select("*, progress:milestone_progress(id,milestone_id,logged_by,progress_note,progress_percent,blockers,logged_date,created_at,logger:contributors(id,full_name,email,role_id,telegram_username,deleted_at,created_at))")
      .order("target_date", { ascending: true }),
  ]);

  return (
    <MilestonesClient
      initialMilestones={(milestones as unknown as Milestone[]) ?? []}
      projects={(projects as Project[]) ?? []}
      contributors={(contributors as unknown as Contributor[]) ?? []}
    />
  );
}
