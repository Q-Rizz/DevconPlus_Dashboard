"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { calcScore, getRiskLevel } from "./RiskScoreBadge";
import RiskHeatmap from "./RiskHeatmap";
import type { Risk, RiskStatus } from "@/types";

const CAT_COLOR: Record<string, string> = {
  Technical:  "#a855f7",
  Schedule:   "#f97316",
  Resource:   "#06b6d4",
  Scope:      "#ec4899",
  Quality:    "#3b82f6",
  Dependency: "#eab308",
  Budget:     "#10b981",
};

const STATUS_BAR: Record<RiskStatus, string> = {
  Open:       "bg-red-400",
  Mitigating: "bg-blue-400",
  Resolved:   "bg-green-400",
  Accepted:   "bg-gray-300",
};

function StatCard({ label, value, sub, highlight }: { label: string; value: number; sub?: string; highlight?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-3xl font-bold ${highlight && value > 0 ? "text-red-600" : "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

interface Props {
  risks: Risk[];
  activeFilter: { probability: string; impact: string } | null;
  onHeatmapClick: (probability: string, impact: string) => void;
}

export default function RiskSummaryView({ risks, activeFilter, onHeatmapClick }: Props) {
  const total      = risks.length;
  const critical   = risks.filter(r => calcScore(r.probability, r.impact) >= 9).length;
  const highPlus   = risks.filter(r => calcScore(r.probability, r.impact) >= 6).length;
  const open       = risks.filter(r => r.status === "Open").length;
  const mitigating = risks.filter(r => r.status === "Mitigating").length;

  const categoryData = (["Technical", "Schedule", "Resource", "Scope", "Quality", "Dependency", "Budget"] as const)
    .map(cat => ({ name: cat, count: risks.filter(r => r.category === cat).length, color: CAT_COLOR[cat] }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count);

  const statusRows = (["Open", "Mitigating", "Resolved", "Accepted"] as RiskStatus[])
    .map(label => ({ label, count: risks.filter(r => r.status === label).length }))
    .filter(s => s.count > 0);

  const atRisk = risks
    .filter(r => calcScore(r.probability, r.impact) >= 6 && r.status !== "Resolved" && r.status !== "Accepted")
    .sort((a, b) => calcScore(b.probability, b.impact) - calcScore(a.probability, a.impact));

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Risks"    value={total} />
        <StatCard label="Critical"       value={critical}  sub="score = 9"   highlight />
        <StatCard label="High or Above"  value={highPlus}  sub="score ≥ 6"   highlight />
        <StatCard label="Open"           value={open}      sub={`${mitigating} mitigating`} />
      </div>

      {/* Heatmap + Category chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Heatmap */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-4 gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Risk Heatmap</h3>
              <p className="text-xs text-gray-400 mt-0.5">Click a cell to filter the register</p>
            </div>
            {activeFilter && (
              <span className="text-xs text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full font-medium shrink-0">
                {activeFilter.probability} × {activeFilter.impact}
              </span>
            )}
          </div>
          <RiskHeatmap risks={risks} activeFilter={activeFilter} onCellClick={onHeatmapClick} />
        </div>

        {/* Category bar chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Risks by Category</h3>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} width={80} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [v, "Risks"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  cursor={{ fill: "#f9fafb" }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Status breakdown */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Status Breakdown</h3>
        {total === 0 ? (
          <p className="text-sm text-gray-300">No risks logged yet</p>
        ) : (
          <div className="space-y-3">
            {statusRows.map(({ label, count }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-[88px] text-xs text-gray-500 font-medium shrink-0">{label}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${STATUS_BAR[label]}`}
                    style={{ width: `${Math.round((count / total) * 100)}%` }}
                  />
                </div>
                <div className="w-6 text-xs text-gray-600 font-semibold text-right shrink-0">{count}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Critical & High risks list */}
      {atRisk.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">
            Critical & High Risks
            <span className="ml-2 text-xs font-normal text-gray-400">score ≥ 6 · not resolved</span>
          </h3>
          <div className="divide-y divide-gray-50 mt-3">
            {atRisk.map(risk => {
              const sc = calcScore(risk.probability, risk.impact);
              const lv = getRiskLevel(sc);
              return (
                <div key={risk.id} className="py-3 flex items-start gap-3">
                  <span className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${lv.bg} ${lv.text}`}>
                    {sc}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{risk.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {risk.category} · {risk.probability} prob × {risk.impact} impact
                      {risk.owner && ` · ${risk.owner.full_name ?? risk.owner.email}`}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                    risk.status === "Open" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                  }`}>
                    {risk.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
