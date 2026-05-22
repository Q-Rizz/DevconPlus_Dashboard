"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import type { EssentialSection } from "@/types";

const ICON_OPTIONS = [
  { icon: "🐙", label: "GitHub" },
  { icon: "🖥️", label: "Server" },
  { icon: "🔗", label: "Links" },
  { icon: "📄", label: "Docs" },
  { icon: "🔒", label: "Credentials" },
  { icon: "💻", label: "CLI" },
  { icon: "🗄️", label: "Database" },
  { icon: "☁️", label: "Cloud" },
  { icon: "💡", label: "Tips" },
  { icon: "🚀", label: "Deploy" },
  { icon: "🛡️", label: "Security" },
  { icon: "🌐", label: "Web" },
  { icon: "📧", label: "Email" },
  { icon: "📅", label: "Schedule" },
  { icon: "🔑", label: "Keys" },
  { icon: "📁", label: "Files" },
  { icon: "⚙️", label: "Config" },
  { icon: "👥", label: "Team" },
  { icon: "📋", label: "Board" },
  { icon: "📚", label: "Reference" },
];

interface Props {
  section?: EssentialSection | null;
  projectId: string;
  contributorId?: string;
  onSaved: (section: EssentialSection) => void;
  onClose: () => void;
}

export default function AddSectionModal({ section, projectId, contributorId, onSaved, onClose }: Props) {
  const [form, setForm] = useState({
    title: section?.title ?? "",
    description: section?.description ?? "",
    icon: section?.icon ?? "📋",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(section);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || saving) return;
    setSaving(true);
    setError(null);

    const url = isEdit ? `/api/essentials/sections/${section!.id}` : "/api/essentials/sections";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        title: form.title.trim(),
        description: form.description || null,
        icon: form.icon || null,
        created_by: contributorId ?? null,
      }),
    });

    const json = await res.json();
    if (!json.ok) {
      setError(json.error ?? "Failed to save section.");
      setSaving(false);
      return;
    }

    onSaved(json.section as EssentialSection);
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? "Edit Section" : "Add Section"} className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Git Standards, Environments, Useful Links"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional subtitle shown under the section header"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Icon</label>
          <div className="grid grid-cols-10 gap-1">
            {ICON_OPTIONS.map((o) => (
              <button
                key={o.icon}
                type="button"
                title={o.label}
                onClick={() => setForm((f) => ({ ...f, icon: o.icon }))}
                className={`text-lg p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${
                  form.icon === o.icon ? "ring-2 ring-brand-400 bg-brand-50" : ""
                }`}
              >
                {o.icon}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!form.title.trim() || saving}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 font-medium"
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Section"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
