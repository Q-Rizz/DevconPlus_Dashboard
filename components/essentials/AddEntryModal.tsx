"use client";

import { useState, useRef } from "react";
import Modal from "@/components/ui/Modal";
import type { EssentialEntry, EntryDataType } from "@/types";

const TYPE_OPTIONS: Array<{ value: EntryDataType; label: string; description: string }> = [
  { value: "text",       label: "Text",       description: "Instructions, rules, notes" },
  { value: "link",       label: "Link",       description: "URLs, GitHub, Figma, Vercel" },
  { value: "code",       label: "Code",       description: "Code snippets, CLI commands" },
  { value: "file",       label: "File",       description: "PDFs, images, documents" },
  { value: "email",      label: "Email",      description: "Contact email addresses" },
  { value: "credential", label: "Credential", description: "API keys, passwords (non-production)" },
];

interface Props {
  entry?: EssentialEntry | null;
  sectionId: string;
  projectId: string;
  contributorId?: string;
  onSaved: (entry: EssentialEntry) => void;
  onClose: () => void;
}

export default function AddEntryModal({ entry, sectionId, projectId, contributorId, onSaved, onClose }: Props) {
  const [form, setForm] = useState({
    label: entry?.label ?? "",
    data_type: (entry?.data_type ?? "text") as EntryDataType,
    value_text: entry?.value_text ?? "",
    is_sensitive: entry?.is_sensitive ?? false,
    note: entry?.note ?? "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = Boolean(entry);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim() || saving) return;
    setSaving(true);
    setError(null);

    try {
      let res: Response;

      if (form.data_type === "file" && file) {
        // File upload via multipart form
        const fd = new FormData();
        fd.append("file", file);
        fd.append("section_id", sectionId);
        fd.append("project_id", projectId);
        fd.append("label", form.label.trim());
        if (form.note) fd.append("note", form.note);
        if (contributorId) fd.append("created_by", contributorId);

        res = await fetch("/api/essentials/entries", { method: "POST", body: fd });
      } else {
        const url = isEdit ? `/api/essentials/entries/${entry!.id}` : "/api/essentials/entries";
        const method = isEdit ? "PATCH" : "POST";

        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section_id: sectionId,
            project_id: projectId,
            label: form.label.trim(),
            data_type: form.data_type,
            value_text: form.value_text || null,
            is_sensitive: form.is_sensitive,
            note: form.note || null,
            created_by: contributorId ?? null,
          }),
        });
      }

      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Failed to save entry.");
        setSaving(false);
        return;
      }

      onSaved(json.entry as EssentialEntry);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSaving(false);
    }
  }

  const selectedType = TYPE_OPTIONS.find((t) => t.value === form.data_type);

  return (
    <Modal open onClose={onClose} title={isEdit ? "Edit Entry" : "Add Entry"} className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Label */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Label <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="e.g. Main branch, Staging URL, Commit format"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        {/* Data type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Data Type</label>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, data_type: t.value }))}
                className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                  form.data_type === t.value
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-gray-200 hover:bg-gray-50 text-gray-600"
                }`}
              >
                <div className="font-medium">{t.label}</div>
                <div className="text-gray-400 text-[10px] mt-0.5">{t.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Credential warning */}
        {form.data_type === "credential" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            ⚠️ <strong>Only store non-production or non-critical credentials here.</strong> For production secrets, use your Vercel environment variables.
          </div>
        )}

        {/* Value field (changes by type) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
          {form.data_type === "text" && (
            <textarea
              value={form.value_text}
              onChange={(e) => setForm((f) => ({ ...f, value_text: e.target.value }))}
              rows={3}
              placeholder="Enter text, instructions, or notes..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          )}
          {form.data_type === "link" && (
            <input
              type="url"
              value={form.value_text}
              onChange={(e) => setForm((f) => ({ ...f, value_text: e.target.value }))}
              placeholder="https://..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          )}
          {form.data_type === "code" && (
            <textarea
              value={form.value_text}
              onChange={(e) => setForm((f) => ({ ...f, value_text: e.target.value }))}
              rows={4}
              placeholder="Enter code, command, or format string..."
              className="w-full text-sm font-mono border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 bg-gray-50"
            />
          )}
          {form.data_type === "file" && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.zip,.docx,.doc"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
              {file && <p className="text-xs text-gray-500 mt-1">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
              {isEdit && entry?.value_file_name && !file && (
                <p className="text-xs text-gray-400 mt-1">Current: {entry.value_file_name}</p>
              )}
            </div>
          )}
          {form.data_type === "email" && (
            <input
              type="email"
              value={form.value_text}
              onChange={(e) => setForm((f) => ({ ...f, value_text: e.target.value }))}
              placeholder="name@example.com"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          )}
          {form.data_type === "credential" && (
            <input
              type="password"
              value={form.value_text}
              onChange={(e) => setForm((f) => ({ ...f, value_text: e.target.value }))}
              placeholder="Enter credential value..."
              className="w-full text-sm font-mono border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          )}
        </div>

        {/* Sensitive checkbox (credential only) */}
        {form.data_type === "credential" && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_sensitive}
              onChange={(e) => setForm((f) => ({ ...f, is_sensitive: e.target.checked }))}
              className="rounded border-gray-300 text-brand-600"
            />
            <span className="text-sm text-gray-600">Mark as sensitive</span>
            <span className="text-xs text-gray-400">(non-PM users always see ••••••)</span>
          </label>
        )}

        {/* Note */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="Optional helper text shown below the value"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!form.label.trim() || saving}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 font-medium"
          >
            {saving ? "Saving…" : "Save Entry"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
