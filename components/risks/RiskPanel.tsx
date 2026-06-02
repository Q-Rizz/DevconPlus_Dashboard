"use client";

import { useState } from "react";
import { calcScore, getRiskLevel } from "./RiskScoreBadge";
import RiskForm from "./RiskForm";
import type { Risk, Contributor, RiskStatus } from "@/types";
import { formatDate } from "@/lib/utils";

const STATUS_PILL: Record<RiskStatus, string> = {
  Open:       "bg-red-100 text-red-700",
  Mitigating: "bg-blue-100 text-blue-700",
  Resolved:   "bg-green-100 text-green-700",
  Accepted:   "bg-gray-100 text-gray-500",
};

const CAT_PILL: Record<string, string> = {
  Technical:  "bg-purple-100 text-purple-700",
  Schedule:   "bg-orange-100 text-orange-700",
  Resource:   "bg-cyan-100 text-cyan-700",
  Scope:      "bg-pink-100 text-pink-700",
  Quality:    "bg-blue-100 text-blue-700",
  Dependency: "bg-yellow-100 text-yellow-700",
  Budget:     "bg-emerald-100 text-emerald-700",
};

interface Props {
  risk: Risk | null;
  mode: "view" | "edit" | "add";
  contributors: Contributor[];
  onClose: () => void;
  onEdit: () => void;
  onSave: (data: Partial<Risk>) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: RiskStatus) => void;
  loading?: boolean;
}

export default function RiskPanel({ risk, mode, contributors, onClose, onEdit, onSave, onDelete, onStatusChange, loading }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const score = risk ? calcScore(risk.probability, risk.impact) : 0;
  const level = risk ? getRiskLevel(score) : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-20" onClick={onClose} />

      {/* Panel */}
      <aside className="fixed inset-y-0 right-0 w-[500px] max-w-full bg-white shadow-2xl border-l border-gray-100 flex flex-col z-30">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0 gap-3">
          <h2 className="text-sm font-semibold text-gray-900 truncate">
            {mode === "add" ? "Log New Risk" : mode === "edit" ? "Edit Risk" : (risk?.title ?? "")}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {mode === "view" && risk && (
              <>
                <button onClick={onEdit} className="text-xs px-3 py-1.5 text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors font-medium">
                  Edit
                </button>
                <button onClick={() => setConfirmDelete(true)} className="text-xs px-3 py-1.5 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium">
                  Delete
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {(mode === "add" || mode === "edit") ? (
            <RiskForm
              initialData={mode === "edit" ? (risk ?? {}) : {}}
              contributors={contributors}
              onSubmit={onSave}
              onCancel={onClose}
              loading={loading}
            />
          ) : risk ? (
            <div className="flex flex-col gap-5">
              {/* Score + badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold ${level!.bg} ${level!.text}`}>
                  <span className={`w-2 h-2 rounded-full ${level!.dot}`} />
                  Score {score} · {level!.label}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_PILL[risk.status]}`}>
                  {risk.status}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CAT_PILL[risk.category] ?? "bg-gray-100 text-gray-600"}`}>
                  {risk.category}
                </span>
              </div>

              {/* Prob × Impact grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Probability</p>
                  <p className="text-sm font-semibold text-gray-800">{risk.probability}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Impact</p>
                  <p className="text-sm font-semibold text-gray-800">{risk.impact}</p>
                </div>
              </div>

              {/* Quick status change */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Change Status</p>
                <div className="flex flex-wrap gap-2">
                  {(["Open", "Mitigating", "Resolved", "Accepted"] as RiskStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => onStatusChange(risk.id, s)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        risk.status === s
                          ? `${STATUS_PILL[s]} border-current font-semibold`
                          : "text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Owner + Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Owner</p>
                  <p className="text-sm text-gray-800">{risk.owner ? (risk.owner.full_name ?? risk.owner.email) : <span className="text-gray-300">—</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Mitigation Due</p>
                  <p className="text-sm text-gray-800">{risk.due_date ? formatDate(risk.due_date) : <span className="text-gray-300">—</span>}</p>
                </div>
              </div>

              {/* Description */}
              {risk.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{risk.description}</p>
                </div>
              )}

              {/* Mitigation Plan */}
              {risk.mitigation_plan && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Mitigation Plan</p>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{risk.mitigation_plan}</p>
                  </div>
                </div>
              )}

              {/* Contingency Plan */}
              {risk.contingency_plan && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Contingency Plan</p>
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3.5">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{risk.contingency_plan}</p>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <p className="text-xs text-gray-300 pt-3 border-t border-gray-50">
                Created {new Date(risk.created_at).toLocaleDateString()} · Updated {new Date(risk.updated_at).toLocaleDateString()}
              </p>
            </div>
          ) : null}
        </div>

        {/* Delete confirm overlay */}
        {confirmDelete && risk && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center gap-5 z-10 p-8">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900">Delete this risk?</p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs">&ldquo;{risk.title}&rdquo; will be permanently removed.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { onDelete(risk.id); setConfirmDelete(false); }}
                className="px-5 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
