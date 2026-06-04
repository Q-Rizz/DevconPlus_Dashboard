"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority } from "@/types";

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; classes: string; dot: string }[] = [
  { value: "Low",      label: "Low",      classes: "bg-gray-100 text-gray-500",   dot: "bg-gray-400"   },
  { value: "Medium",   label: "Medium",   classes: "bg-blue-100 text-blue-700",   dot: "bg-blue-500"   },
  { value: "High",     label: "High",     classes: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  { value: "Critical", label: "Critical", classes: "bg-red-100 text-red-700",     dot: "bg-red-500"    },
];

function getBadgeClasses(priority: TaskPriority) {
  return PRIORITY_OPTIONS.find((o) => o.value === priority)?.classes ?? "bg-gray-100 text-gray-500";
}

interface Props {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

export default function PriorityCell({ task, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const priority: TaskPriority = task.priority ?? "Medium";

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleOpen() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const DROPDOWN_H = 180;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < DROPDOWN_H ? rect.top - DROPDOWN_H - 4 : rect.bottom + 4;
    setPos({ top, left: rect.left });
    setOpen((v) => !v);
  }

  return (
    <td className="px-3 py-2">
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all duration-100 hover:opacity-80 hover:shadow-sm whitespace-nowrap",
          getBadgeClasses(priority)
        )}
      >
        {priority}
        <svg className="w-2.5 h-2.5 opacity-60" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
            className="w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setOpen(false);
                  if (opt.value !== priority) onUpdate({ priority: opt.value });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-sm"
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", opt.dot)} />
                <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", opt.classes)}>
                  {opt.label}
                </span>
                {opt.value === priority && (
                  <span className="ml-auto text-brand-500 text-xs">✓</span>
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </td>
  );
}
