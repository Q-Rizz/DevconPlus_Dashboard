"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Milestone } from "@/types";
import { latestProgress } from "@/components/milestones/milestone-utils";
import { progressColor } from "@/components/milestones/milestone-utils-client";

const STATUS_BADGE: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-500",
  "In Progress": "bg-blue-100 text-blue-700",
  "At Risk":     "bg-orange-100 text-orange-700",
  "Achieved":    "bg-green-100 text-green-700",
  "Missed":      "bg-red-100 text-red-600",
};

function MiniRing({ percent }: { percent: number }) {
  const size = 32, sw = 3;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color = progressColor(percent);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

interface Props {
  projectId?: string;
}

export default function MilestonesWidget({ projectId }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let q = supabase
      .from("milestones")
      .select("*, progress:milestone_progress(id,progress_percent,logged_date)")
      .not("status", "in", '("Achieved","Missed")')
      .order("status")
      .order("target_date")
      .limit(5);
    if (projectId) q = q.eq("project_id", projectId);

    q.then(({ data }) => {
      setMilestones((data as unknown as Milestone[]) ?? []);
      setLoading(false);
    });
  }, [projectId]);

  if (loading || milestones.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Milestones</h3>
        <Link href="/milestones" className="text-xs text-brand-600 hover:underline">View all</Link>
      </div>
      <div className="space-y-2">
        {milestones.map((m) => {
          const pct = latestProgress(m);
          return (
            <div key={m.id} className="flex items-center gap-2.5">
              <MiniRing percent={pct} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{m.title}</p>
                <p className="text-[10px] text-gray-400">
                  {new Date(m.target_date + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                </p>
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[m.status] ?? STATUS_BADGE["Not Started"]}`}>
                {m.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
