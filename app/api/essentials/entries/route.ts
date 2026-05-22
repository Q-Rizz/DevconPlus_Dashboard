import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import type { EssentialEntry } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      // File upload path
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const section_id = formData.get("section_id") as string;
      const project_id = formData.get("project_id") as string;
      const label = formData.get("label") as string;
      const note = formData.get("note") as string | null;
      const created_by = formData.get("created_by") as string | null;

      if (!file || !section_id || !project_id || !label) {
        return NextResponse.json({ ok: false, error: "Missing required fields for file upload." }, { status: 400 });
      }

      const supabase = createServiceRoleClient();
      const ext = file.name.split(".").pop() ?? "bin";
      const filePath = `${project_id}/${crypto.randomUUID()}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadErr } = await supabase.storage
        .from("essentials-files")
        .upload(filePath, arrayBuffer, { contentType: file.type });

      if (uploadErr) {
        return NextResponse.json({ ok: false, error: uploadErr.message }, { status: 500 });
      }

      const { data: urlData } = supabase.storage.from("essentials-files").getPublicUrl(filePath);

      const { data: maxRow } = await supabase
        .from("essential_entries")
        .select("position")
        .eq("section_id", section_id)
        .order("position", { ascending: false })
        .limit(1)
        .single();

      const { data: entry, error: insertErr } = await supabase
        .from("essential_entries")
        .insert({
          section_id, project_id, label, data_type: "file",
          value_file_url: filePath, value_file_name: file.name,
          position: (maxRow?.position ?? -1) + 1,
          note: note || null, created_by: created_by || null,
        })
        .select("*")
        .single();

      if (insertErr || !entry) return NextResponse.json({ ok: false, error: insertErr?.message }, { status: 500 });
      return NextResponse.json({ ok: true, entry: entry as EssentialEntry });
    }

    // JSON path
    const body = await request.json();
    const { section_id, project_id, label, data_type, value_text, is_sensitive, note, created_by } = body;

    if (!section_id || !project_id || !label || !data_type) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: maxRow } = await supabase
      .from("essential_entries")
      .select("position")
      .eq("section_id", section_id)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const { data: entry, error } = await supabase
      .from("essential_entries")
      .insert({
        section_id, project_id, label, data_type,
        value_text: value_text || null,
        is_sensitive: is_sensitive ?? false,
        position: (maxRow?.position ?? -1) + 1,
        note: note || null, created_by: created_by || null,
      })
      .select("*")
      .single();

    if (error || !entry) return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
    return NextResponse.json({ ok: true, entry: entry as EssentialEntry });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
