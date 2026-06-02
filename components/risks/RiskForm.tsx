"use client";

import { useState } from "react";
import { calcScore, getRiskLevel } from "./RiskScoreBadge";
import type { Risk, Contributor, RiskCategory, RiskProbability, RiskImpact, RiskStatus } from "@/types";

const CATEGORIES: RiskCategory[] = ["Technical", "Schedule", "Resource", "Scope", "Quality", "Dependency", "Budget"];
const PROBS: RiskProbability[]    = ["Low", "Medium", "High"];
const IMPACTS: RiskImpact[]       = ["Low", "Medium", "High"];
const STATUSES: RiskStatus[]      = ["Open", "Mitigating", "Resolved", "Accepted"];

interface Props {
  initialData?: Partial<Risk>;
  contributors: Contributor[];
  onSubmit: (data: Partial<Risk>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function RiskForm({ initialData, contributors, onSubmit, onCancel, loading }: Props) {
  const [form, setForm] = useState({
    title:             initialData?.title            ?? "",
    description:       initialData?.description      ?? "",
    category:          initialData?.category         ?? "Technical" as RiskCategory,
    probability:       initialData?.probability      ?? "Medium"    as RiskProbability,
    impact:            initialData?.impact           ?? "Medium"    as RiskImpact,
    status:            initialData?.status           ?? "Open"      as RiskStatus,
    owner_id:          initialData?.owner_id         ?? "",
    due_date:          initialData?.due_date         ?? "",
    mitigation_plan:   initialData?.mitigation_plan  ?? "",
    contingency_plan:  initialData?.contingency_plan ?? "",
  });

  const score = calcScore(form.probability, form.impact);
  const level = getRiskLevel(score);

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      ...form,
      owner_id:         form.owner_id        || null,
      due_date:         form.due_date         || null,
      description:      form.description      || null,
      mitigation_plan:  form.mitigation_plan  || null,
      contingency_plan: form.contingency_plan || null,
    });
  }

  const input = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-300 transition-shadow bg-white";
  const label = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Title */}
      <div>
        <label className={label}>Title *</label>
        <input
          required
          type="text"
          value={form.title}
          onChange={e => set("title", e.target.value)}
          placeholder="e.g. Third-party API unavailability"
          className={input}
        />
      </div>

      {/* Category */}
      <div>
        <label className={label}>Category</label>
        <select value={form.category} onChange={e => set("category", e.target.value as RiskCategory)} className={input}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Probability + Impact */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Probability</label>
          <select value={form.probability} onChange={e => set("probability", e.target.value as RiskProbability)} className={input}>
            {PROBS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Impact</label>
          <select value={form.impact} onChange={e => set("impact", e.target.value as RiskImpact)} className={input}>
            {IMPACTS.map(i => <option key={i}>{i}</option>)}
          </select>
        </div>
      </div>

      {/* Live score preview */}
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${level.bg} ${level.text}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${level.dot}`} />
        Risk Score: <span className="font-bold">{score}</span>
        <span className="opacity-70">· {level.label}</span>
      </div>

      {/* Status */}
      <div>
        <label className={label}>Status</label>
        <select value={form.status} onChange={e => set("status", e.target.value as RiskStatus)} className={input}>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Owner */}
      <div>
        <label className={label}>Owner</label>
        <select value={form.owner_id} onChange={e => set("owner_id", e.target.value)} className={input}>
          <option value="">— No owner —</option>
          {contributors.map(c => (
            <option key={c.id} value={c.id}>{c.full_name ?? c.email}</option>
          ))}
        </select>
      </div>

      {/* Mitigation Due Date */}
      <div>
        <label className={label}>Mitigation Due Date</label>
        <input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} className={input} />
      </div>

      {/* Description */}
      <div>
        <label className={label}>Description</label>
        <textarea
          rows={2}
          value={form.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Describe the risk scenario..."
          className={`${input} resize-none`}
        />
      </div>

      {/* Mitigation Plan */}
      <div>
        <label className={label}>Mitigation Plan</label>
        <textarea
          rows={3}
          value={form.mitigation_plan}
          onChange={e => set("mitigation_plan", e.target.value)}
          placeholder="Steps to reduce the likelihood or impact..."
          className={`${input} resize-none`}
        />
      </div>

      {/* Contingency Plan */}
      <div>
        <label className={label}>Contingency Plan</label>
        <textarea
          rows={3}
          value={form.contingency_plan}
          onChange={e => set("contingency_plan", e.target.value)}
          placeholder="What to do if the risk materialises..."
          className={`${input} resize-none`}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !form.title.trim()}
          className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Saving…" : "Save Risk"}
        </button>
      </div>
    </form>
  );
}
