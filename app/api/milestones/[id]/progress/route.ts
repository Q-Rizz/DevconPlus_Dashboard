import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import type { MilestoneProgress } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: milestone_id } = await context.params;
    const body = await request.json();
    const { logged_by, progress_note, progress_percent, blockers, logged_date, status } = body;

    if (!progress_note) {
      return NextResponse.json({ ok: false, error: "progress_note is required." }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: progress, error } = await supabase
      .from("milestone_progress")
      .insert({
        milestone_id,
        logged_by: logged_by || null,
        progress_note,
        progress_percent: progress_percent ?? 0,
        blockers: blockers || null,
        logged_date: logged_date ?? new Date().toISOString().split("T")[0],
      })
      .select("*")
      .single();

    if (error || !progress) {
      return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
    }

    // Determine if we need to update milestone status
    let newStatus: string | null = status ?? null;
    if (!newStatus && progress_percent === 100) {
      newStatus = "Achieved";
    }

    let updatedMilestone = null;
    if (newStatus) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/milestones/${milestone_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      const json = await res.json();
      updatedMilestone = json.milestone ?? null;
    } else {
      // Just update updated_at
      await supabase
        .from("milestones")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", milestone_id);
    }

    return NextResponse.json({
      ok: true,
      progress: progress as MilestoneProgress,
      milestone: updatedMilestone,
    });
  } catch (err) {
    console.error("[POST /api/milestones/[id]/progress]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
