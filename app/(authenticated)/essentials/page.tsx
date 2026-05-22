export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase";
import EssentialsClient from "@/components/essentials/EssentialsClient";
import type { EssentialSection, Contributor, Project } from "@/types";

export default async function EssentialsPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: projects }, { data: contributors }, { data: sections }] = await Promise.all([
    supabase.from("projects").select("id,name").order("created_at"),
    supabase
      .from("contributors")
      .select("id,email,full_name,role_id,telegram_username,deleted_at,created_at")
      .is("deleted_at", null)
      .order("full_name"),
    supabase
      .from("essential_sections")
      .select("*, entries:essential_entries(*)")
      .order("position", { ascending: true }),
  ]);

  return (
    <EssentialsClient
      initialSections={(sections as unknown as EssentialSection[]) ?? []}
      projects={(projects as Project[]) ?? []}
      contributors={(contributors as unknown as Contributor[]) ?? []}
    />
  );
}
