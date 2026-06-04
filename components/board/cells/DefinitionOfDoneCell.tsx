"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useBoardContext } from "../BoardContext";
import type { Task } from "@/types";

interface Props {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

export default function DefinitionOfDoneCell({ task, onUpdate }: Props) {
  const { canEdit } = useBoardContext();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(task.definition_of_done ?? "");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasDod = Boolean(task.definition_of_done?.trim());

  // Sync draft when task changes externally
  useEffect(() => {
    if (!open) setDraft(task.definition_of_done ?? "");
  }, [task.definition_of_done, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !popoverRef.current?.contains(t)) {
        save();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft]);

  function save() {
    const trimmed = draft.trim() || null;
    if (trimmed !== (task.definition_of_done ?? null)) {
      onUpdate({ definition_of_done: trimmed });
    }
  }

  function handleOpen() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const POPOVER_W = 300;
    const POPOVER_H = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < POPOVER_H ? rect.top - POPOVER_H - 4 : rect.bottom + 4;
    const left = Math.min(rect.left, window.innerWidth - POPOVER_W - 12);
    setPos({ top, left });
    setDraft(task.definition_of_done ?? "");
    setOpen((v) => !v);
    if (!open) setTimeout(() => textareaRef.current?.focus(), 50);
  }

  return (
    <td className="px-3 py-2">
      <button
        ref={triggerRef}
        onClick={handleOpen}
        title={hasDod ? task.definition_of_done! : "Set Definition of Done"}
        className="inline-flex items-center gap-1.5 text-xs transition-all duration-100 group/dod"
      >
        {hasDod ? (
          <>
            <svg
              className="w-4 h-4 text-emerald-500 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-500 truncate max-w-[120px] group-hover/dod:text-brand-600">
              {task.definition_of_done}
            </span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4 text-gray-300 shrink-0 group-hover/dod:text-brand-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-300 group-hover/dod:text-brand-400">Add DoD</span>
          </>
        )}
      </button>

      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999, width: 300 }}
            className="bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Definition of Done
              </span>
              <button
                onClick={() => { save(); setOpen(false); }}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-3 py-3">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                readOnly={!canEdit}
                rows={5}
                placeholder={canEdit ? "e.g. Unit tests pass, PR reviewed, deployed to staging…" : "No Definition of Done set."}
                className="w-full text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-300 placeholder-gray-300 transition-shadow read-only:bg-gray-50 read-only:text-gray-500"
              />
            </div>

            {canEdit && (
              <div className="px-3 pb-3 flex justify-end gap-2">
                <button
                  onClick={() => { setDraft(""); onUpdate({ definition_of_done: null }); setOpen(false); }}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => { save(); setOpen(false); }}
                  className="px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors font-medium"
                >
                  Save
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </td>
  );
}
