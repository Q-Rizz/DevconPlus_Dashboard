"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuthStore } from "@/lib/store";
import type { Task, TaskComment } from "@/types";

interface Props {
  task: Task;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function CommentsCell({ task }: Props) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contributor = useAuthStore((s) => s.contributor);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !popoverRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function fetchComments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`);
      const json = await res.json();
      if (json.data) setComments(json.data);
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const POPOVER_W = 320;
    const POPOVER_H = 400;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < POPOVER_H ? rect.top - POPOVER_H - 4 : rect.bottom + 4;
    const left = Math.min(rect.left, window.innerWidth - POPOVER_W - 12);
    setPos({ top, left });
    setOpen((v) => {
      if (!v) fetchComments();
      return !v;
    });
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, author_id: contributor?.id ?? null }),
      });
      const json = await res.json();
      if (json.data) {
        setComments((prev) => [...prev, json.data]);
        setBody("");
      }
    } finally {
      setPosting(false);
      textareaRef.current?.focus();
    }
  }

  const count = comments.length;

  return (
    <td className="px-3 py-2">
      <button
        ref={triggerRef}
        onClick={handleOpen}
        title={`${count} comment${count !== 1 ? "s" : ""}`}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-all duration-100"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
        {count > 0 && <span className="font-medium">{count}</span>}
      </button>

      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999, width: 320 }}
            className="bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Comments</span>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto max-h-60 px-4 py-3 space-y-3">
              {loading && (
                <p className="text-xs text-gray-400 text-center py-4">Loading…</p>
              )}
              {!loading && comments.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No comments yet. Be the first!</p>
              )}
              {!loading && comments.map((c) => (
                <div key={c.id} className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-gray-700">
                      {c.author?.full_name ?? c.author?.email ?? "Anonymous"}
                    </span>
                    <span className="text-[10px] text-gray-400">{formatTime(c.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{c.body}</p>
                </div>
              ))}
            </div>

            {/* Add comment */}
            {contributor && (
              <form onSubmit={handlePost} className="border-t border-gray-100 px-3 py-2.5 flex gap-2 items-end bg-white">
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handlePost(e as unknown as React.FormEvent);
                    }
                  }}
                  rows={2}
                  placeholder="Add a comment… (Enter to send)"
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-300 placeholder-gray-300 transition-shadow"
                />
                <button
                  type="submit"
                  disabled={!body.trim() || posting}
                  className="shrink-0 px-2.5 py-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white rounded-lg disabled:opacity-40 transition-colors font-medium"
                >
                  Send
                </button>
              </form>
            )}
          </div>,
          document.body
        )}
    </td>
  );
}
