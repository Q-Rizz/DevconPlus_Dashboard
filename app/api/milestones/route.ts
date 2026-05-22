import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import type { Milestone } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, target_date, status, project_id, created_by } = body;

    if (!title || !target_date) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: milestone, error } = await supabase
      .from("milestones")
      .insert({
        project_id: project_id || null,
        title,
        description: description || null,
        target_date,
        status: status ?? "Not Started",
        created_by: created_by || null,
      })
      .select("*")
      .single();

    if (error || !milestone) {
      return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, milestone: milestone as Milestone });
  } catch (err) {
    console.error("[POST /api/milestones]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
