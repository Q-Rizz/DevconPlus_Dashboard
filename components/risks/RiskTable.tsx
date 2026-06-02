"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import RiskScoreBadge, { calcScore } from "./RiskScoreBadge";
import type { Risk, RiskStatus } from "@/types";

const STATUS_PILL: Record<RiskStatus, string> = {
  Open:       "bg-red-50 text-red-600",
  Mitigating: "bg-blue-50 text-blue-600",
  Resolved:   "bg-green-50 text-green-600",
  Accepted:   "bg-gray-100 text-gray-500",
};

const CAT_DOT: Record<string, string> = {
  Technical:  "bg-purple-400",
  Schedule:   "bg-orange-400",
  Resource:   "bg-cyan-400",
  Scope:      "bg-pink-400",
  Quality:    "bg-blue-400",
  Dependency: "bg-yellow-400",
  Budget:     "bg-emerald-400",
};

type SortKey = "score" | "title" | "category" | "status" | "due_date";

interface Props {
  risks: Risk[];
  onRowClick: (risk: Risk) => void;
}

export default function RiskTable({ risks, onRowClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sorted = [...risks].sort((a, b) => {
    let cmp: number;
    if (sortKey === "score") {
      cmp = calcScore(a.probability, a.impact) - calcScore(b.probability, b.impact);
    } else if (sortKey === "due_date") {
      cmp = (a.due_date ?? "").localeCompare(b.due_date ?? "");
    } else {
      cmp = ((a[sortKey] as string) ?? "").localeCompare((b[sortKey] as string) ?? "");
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-gray-300 ml-1 text-[10px]">↕</span>;
    return <span className="text-brand-500 ml-1 text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  if (risks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-300 gap-3">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="text-sm text-gray-400">No risks match your filters</p>
      </div>
    );
  }

  const th = "px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none whitespace-nowrap";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50/60 border-b border-gray-100 sticky top-0 z-10">
          <tr>
            <th className={th} onClick={() => toggleSort("score")}>Score<SortIcon col="score" /></th>
            <th className={th} onClick={() => toggleSort("title")}>Risk<SortIcon col="title" /></th>
            <th className={th} onClick={() => toggleSort("category")}>Category<SortIcon col="category" /></th>
            <th className={th}>Prob × Impact</th>
            <th className={th}>Owner</th>
            <th className={th} onClick={() => toggleSort("due_date")}>Due<SortIcon col="due_date" /></th>
            <th className={th} onClick={() => toggleSort("status")}>Status<SortIcon col="status" /></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map(risk => (
            <tr
              key={risk.id}
              onClick={() => onRowClick(risk)}
              className="hover:bg-brand-50/40 cursor-pointer transition-colors group/row"
            >
              <td className="px-4 py-3">
                <RiskScoreBadge probability={risk.probability} impact={risk.impact} />
              </td>
              <td className="px-4 py-3 max-w-xs">
                <p className="font-medium text-gray-800 group-hover/row:text-brand-700 transition-colors truncate">{risk.title}</p>
                {risk.description && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{risk.description}</p>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", CAT_DOT[risk.category] ?? "bg-gray-300")} />
                  {risk.category}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                {risk.probability} × {risk.impact}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                {risk.owner ? (risk.owner.full_name ?? risk.owner.email) : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                {risk.due_date ? formatDate(risk.due_date) : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3">
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", STATUS_PILL[risk.status])}>
                  {risk.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
