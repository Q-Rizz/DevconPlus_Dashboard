"use client";

import type { EssentialSection, EssentialEntry, Project } from "@/types";

interface Props {
  sections: EssentialSection[];
  projects: Project[];
  projectFilter: string;
}

export default function FlatListView({ sections, projects, projectFilter }: Props) {
  const allEntries: Array<{ section: EssentialSection; entry: EssentialEntry }> = sections
    .filter((s) => projectFilter === "all" || s.project_id === projectFilter)
    .flatMap((s) => (s.entries ?? []).map((e) => ({ section: s, entry: e })));

  function copyAsMarkdown() {
    const projectName = projectFilter !== "all"
      ? projects.find((p) => p.id === projectFilter)?.name ?? "Project"
      : "All Projects";

    const grouped = sections.filter((s) => projectFilter === "all" || s.project_id === projectFilter);

    const lines = [
      `# ${projectName} — Essentials`,
      "",
      ...grouped.flatMap((s) => {
        const entries = s.entries ?? [];
        return [
          `## ${s.title}`,
          s.description ? s.description : "",
          "",
          "| Label | Value | Note |",
          "|-------|-------|------|",
          ...entries.map((e) => {
            const val = e.data_type === "credential" ? "••••••" : (e.value_text ?? e.value_file_name ?? "—");
            return `| ${e.label} | ${val.replace(/\n/g, " ")} | ${e.note ?? ""} |`;
          }),
          "",
        ];
      }),
    ];

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      alert("Copied as Markdown!");
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">All Entries ({allEntries.length})</h3>
        <button
          onClick={copyAsMarkdown}
          className="text-xs text-brand-600 border border-brand-200 rounded-lg px-3 py-1.5 hover:bg-brand-50 flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          Copy all as Markdown
        </button>
      </div>

      {allEntries.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No entries yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Section</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Label</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Value</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Note</th>
              </tr>
            </thead>
            <tbody>
              {allEntries.map(({ section: s, entry: e }) => {
                const val = e.data_type === "credential"
                  ? "••••••"
                  : e.data_type === "file"
                  ? (e.value_file_name ?? "—")
                  : (e.value_text ?? "—");

                return (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{s.icon} {s.title}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{e.label}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{e.data_type}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-xs truncate">{val}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 italic">{e.note ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
