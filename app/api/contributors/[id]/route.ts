import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceRoleClient();

  // Get the contributor's email to find the auth user
  const { data: contributor, error: fetchError } = await supabase
    .from("contributors")
    .select("id, email")
    .eq("id", params.id)
    .single();

  if (fetchError || !contributor) {
    return NextResponse.json({ error: "Contributor not found" }, { status: 404 });
  }

  // Delete from contributors table first (removes FK references)
  const { error: dbError } = await supabase
    .from("contributors")
    .delete()
    .eq("id", params.id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Delete from auth.users via admin API
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers?.users?.find((u) => u.email === contributor.email);

  if (authUser) {
    await supabase.auth.admin.deleteUser(authUser.id);
  }

  return NextResponse.json({ ok: true });
}
