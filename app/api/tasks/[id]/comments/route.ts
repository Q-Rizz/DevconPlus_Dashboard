import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("task_comments")
    .select("*, author:contributors(id,full_name,email)")
    .eq("task_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { body, author_id } = await request.json();
  if (!body?.trim()) return NextResponse.json({ error: "Empty comment" }, { status: 400 });

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("task_comments")
    .insert({ task_id: id, author_id: author_id ?? null, body: body.trim() })
    .select("*, author:contributors(id,full_name,email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
