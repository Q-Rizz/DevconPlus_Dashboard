export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase";
import RisksClient from "@/components/risks/RisksClient";
import type { Risk, Contributor, Project } from "@/types";

export default async function RisksPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: projects }, { data: contributors }, { data: risks }] = await Promise.all([
    supabase.from("projects").select("id,name").order("created_at"),
    supabase
      .from("contributors")
      .select("id,email,full_name,role_id,telegram_username,deleted_at,created_at")
      .is("deleted_at", null)
      .order("full_name"),
    supabase
      .from("risks")
      .select("*, owner:contributors!owner_id(id,email,full_name,role_id,telegram_username,deleted_at,created_at), linked_task:tasks!linked_task_id(id,title)")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <RisksClient
      initialRisks={(risks as unknown as Risk[]) ?? []}
      projects={(projects as Project[]) ?? []}
      contributors={(contributors as unknown as Contributor[]) ?? []}
    />
  );
}
