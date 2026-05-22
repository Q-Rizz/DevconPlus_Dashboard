import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("essential_entries")
      .update(body)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, entry: data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createServiceRoleClient();

    // Get file path before deleting to clean up storage
    const { data: entry } = await supabase
      .from("essential_entries")
      .select("value_file_url,data_type")
      .eq("id", id)
      .single();

    if (entry?.data_type === "file" && entry.value_file_url) {
      await supabase.storage.from("essentials-files").remove([entry.value_file_url]);
    }

    const { error } = await supabase.from("essential_entries").delete().eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
