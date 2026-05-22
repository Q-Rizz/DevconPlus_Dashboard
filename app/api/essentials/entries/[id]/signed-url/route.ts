import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createServiceRoleClient();

    const { data: entry } = await supabase
      .from("essential_entries")
      .select("value_file_url,data_type")
      .eq("id", id)
      .single();

    if (!entry || entry.data_type !== "file" || !entry.value_file_url) {
      return NextResponse.json({ ok: false, error: "File entry not found." }, { status: 404 });
    }

    const { data: signedData, error } = await supabase.storage
      .from("essentials-files")
      .createSignedUrl(entry.value_file_url, 3600); // 1 hour

    if (error || !signedData) {
      return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, signedUrl: signedData.signedUrl });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
