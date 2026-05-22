import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import type { EssentialSection } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, title, description, icon, created_by } = body;

    if (!project_id || !title) {
      return NextResponse.json({ ok: false, error: "project_id and title are required." }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Get max position for this project
    const { data: maxRow } = await supabase
      .from("essential_sections")
      .select("position")
      .eq("project_id", project_id)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const position = (maxRow?.position ?? -1) + 1;

    const { data: section, error } = await supabase
      .from("essential_sections")
      .insert({ project_id, title, description: description || null, icon: icon || null, position, created_by: created_by || null })
      .select("*")
      .single();

    if (error || !section) {
      return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, section: section as EssentialSection });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
