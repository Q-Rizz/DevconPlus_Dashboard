"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import type { Milestone, MilestoneStatus, MilestoneProgress } from "@/types";
import { progressColor } from "./milestone-utils-client";

const STATUS_OPTIONS: Array<{ value: MilestoneStatus | ""; label: string }> = [
  { value: "", label: "Keep current status" },
  { value: "Not Started", label: "Not Started" },
  { value: "In Progress", label: "In Progress" },
  { value: "At Risk", label: "At Risk" },
  { value: "Achieved", label: "Achieved" },
  { value: "Missed", label: "Missed" },
];

interface Props {
  milestone: Milestone;
  contributorId?: string;
  onLogged: (progress: MilestoneProgress, updatedMilestone: Milestone | null) => void;
  onClose: () => void;
}

export default function LogProgressModal({ milestone, contributorId, onLogged, onClose }: Props) {
  const [form, setForm] = useState({
    logged_date: new Date().toISOString().split("T")[0],
    progress_percent: 0,
    progress_note: "",
    blockers: "",
    status: "" as MilestoneStatus | "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = form.progress_note.trim();
  const color = progressColor(form.progress_percent);

  // Build CSS gradient for slider track
  const sliderStyle = {
    background: `linear-gradient(to right, ${color} ${form.progress_percent}%, #e5e7eb ${form.progress_percent}%)`,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/milestones/${milestone.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        logged_by: contributorId ?? null,
        progress_note: form.progress_note.trim(),
        progress_percent: form.progress_percent,
        blockers: form.blockers || null,
        logged_date: form.logged_date,
        status: form.status || null,
      }),
    });

    const json = await res.json();
    if (!json.ok) {
      setError(json.error ?? "Failed to log progress.");
      setSaving(false);
      return;
    }

    onLogged(json.progress as MilestoneProgress, json.milestone ?? null);
  }

  return (
    <Modal open onClose={onClose} title={`Log Progress — ${milestone.title}`} className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input
            type="date"
            value={form.logged_date}
            onChange={(e) => setForm((f) => ({ ...f, logged_date: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        {/* Progress slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">Progress</label>
            <span className="text-sm font-bold" style={{ color }}>{form.progress_percent}% complete</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={form.progress_percent}
            onChange={(e) => setForm((f) => ({ ...f, progress_percent: Number(e.target.value) }))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={sliderStyle}
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
          </div>
        </div>

        {/* What was accomplished */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            What was accomplished today <span className="text-red-400">*</span>
          </label>
          <textarea
            value={form.progress_note}
            onChange={(e) => setForm((f) => ({ ...f, progress_note: e.target.value }))}
            rows={3}
            placeholder="Describe what the team completed toward this milestone..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder-gray-300"
          />
        </div>

        {/* Blockers */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Blockers</label>
          <textarea
            value={form.blockers}
            onChange={(e) => setForm((f) => ({ ...f, blockers: e.target.value }))}
            rows={2}
            placeholder="Any blockers or risks? Leave blank if none."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder-gray-300"
          />
        </div>

        {/* Status override */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Update milestone status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MilestoneStatus | "" }))}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <p className="text-[11px] text-gray-400 mt-1">Leave blank to keep the current status.</p>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 font-medium"
          >
            {saving ? "Logging…" : "Log Progress"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
