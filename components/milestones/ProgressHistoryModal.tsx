"use client";

import Modal from "@/components/ui/Modal";
import type { Milestone, MilestoneProgress } from "@/types";
import { progressColor } from "./milestone-utils-client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface Props {
  milestone: Milestone;
  onClose: () => void;
}

function ProgressBadge({ pct }: { pct: number }) {
  const color = progressColor(pct);
  return (
    <span
      className="inline-block text-xs font-bold px-2 py-0.5 rounded-full text-white"
      style={{ backgroundColor: color }}
    >
      {pct}%
    </span>
  );
}

export default function ProgressHistoryModal({ milestone, onClose }: Props) {
  const entries = [...(milestone.progress ?? [])].sort(
    (a, b) => b.logged_date.localeCompare(a.logged_date) || b.created_at.localeCompare(a.created_at)
  );

  // Chart data (oldest → newest for left-to-right)
  const chartData = [...entries]
    .reverse()
    .map((e) => ({ date: e.logged_date, percent: e.progress_percent }));

  return (
    <Modal open onClose={onClose} title={`Progress History — ${milestone.title}`} className="max-w-2xl">
      <div className="max-h-[75vh] overflow-y-auto space-y-4 pr-1">
        {/* Header info */}
        <div className="flex items-center gap-4 text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-2.5">
          <span>Target: <strong className="text-gray-700">{new Date(milestone.target_date + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</strong></span>
          <span>Status: <strong className="text-gray-700">{milestone.status}</strong></span>
          <span>Entries: <strong className="text-gray-700">{entries.length}</strong></span>
        </div>

        {/* Line chart (only if 2+ entries) */}
        {chartData.length >= 2 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-medium text-gray-500 mb-3">Progress Over Time</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => {
                  const dt = new Date(d + "T00:00:00");
                  return dt.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
                }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: unknown) => [`${val}%`, "Progress"]}
                  labelFormatter={(label) => new Date(label + "T00:00:00").toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
                />
                <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="percent"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#3b82f6" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Timeline */}
        {entries.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No progress entries yet.</div>
        ) : (
          <div className="space-y-3">
            {entries.map((e, i) => (
              <div key={e.id} className="flex gap-3">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                  {i < entries.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                </div>

                {/* Content */}
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-gray-700">
                      {new Date(e.logged_date + "T00:00:00").toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <ProgressBadge pct={e.progress_percent} />
                    {e.logger && (
                      <span className="text-[11px] text-gray-400">
                        by {(e.logger as unknown as { full_name: string | null; email: string }).full_name ?? (e.logger as unknown as { email: string }).email}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-700">{e.progress_note}</p>

                  {e.blockers && (
                    <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800">
                      <strong>Blockers:</strong> {e.blockers}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
