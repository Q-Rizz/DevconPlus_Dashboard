import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

const TEMPLATE = [
  {
    title: "Git Standards",
    description: "Branch strategy, commit rules, and PR process",
    icon: "🐙",
    entries: [
      { label: "Main branch", data_type: "text", value_text: "main — protected, no direct pushes" },
      { label: "Develop branch", data_type: "text", value_text: "develop — all PRs merge here first" },
      { label: "Feature branches", data_type: "text", value_text: "feature/[task-name] — branch from develop" },
      { label: "Commit format", data_type: "code", value_text: "type(scope): short description\nExample: feat(auth): add Google OAuth" },
      { label: "PR rules", data_type: "text", value_text: "1 approval required · no WIP merges · squash merge into develop" },
    ],
  },
  {
    title: "Environments",
    description: "Deployment URLs and configuration",
    icon: "🖥️",
    entries: [
      { label: "Production URL", data_type: "link", value_text: "[placeholder — not set]" },
      { label: "Staging URL", data_type: "link", value_text: "[placeholder — not set]" },
      { label: "Local dev port", data_type: "text", value_text: "http://localhost:3000" },
    ],
  },
  {
    title: "Useful Links",
    description: "External resources and tools",
    icon: "🔗",
    entries: [
      { label: "GitHub repo", data_type: "link", value_text: "[placeholder — not set]" },
      { label: "Figma / Design", data_type: "link", value_text: "[placeholder — not set]" },
      { label: "Supabase dashboard", data_type: "link", value_text: "[placeholder — not set]" },
      { label: "Vercel dashboard", data_type: "link", value_text: "[placeholder — not set]" },
    ],
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, created_by } = body;

    if (!project_id) {
      return NextResponse.json({ ok: false, error: "project_id is required." }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Check if sections already exist
    const { data: existing } = await supabase
      .from("essential_sections")
      .select("id")
      .eq("project_id", project_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: false, error: "Sections already exist for this project." }, { status: 409 });
    }

    const created: unknown[] = [];

    for (let si = 0; si < TEMPLATE.length; si++) {
      const tpl = TEMPLATE[si];

      const { data: section, error: sErr } = await supabase
        .from("essential_sections")
        .insert({ project_id, title: tpl.title, description: tpl.description, icon: tpl.icon, position: si, created_by: created_by || null })
        .select("*")
        .single();

      if (sErr || !section) continue;
      created.push(section);

      for (let ei = 0; ei < tpl.entries.length; ei++) {
        const e = tpl.entries[ei];
        await supabase.from("essential_entries").insert({
          section_id: (section as { id: string }).id,
          project_id,
          label: e.label,
          data_type: e.data_type,
          value_text: e.value_text,
          position: ei,
          created_by: created_by || null,
        });
      }
    }

    return NextResponse.json({ ok: true, sections: created });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
