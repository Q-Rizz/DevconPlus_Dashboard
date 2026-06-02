"use client";

import { cn } from "@/lib/utils";
import { calcScore, getRiskLevel } from "./RiskScoreBadge";
import type { Risk } from "@/types";

const PROBS  = ["Low", "Medium", "High"] as const;
const IMPACTS = ["High", "Medium", "Low"] as const; // top-to-bottom: high impact at top

interface Props {
  risks: Risk[];
  activeFilter: { probability: string; impact: string } | null;
  onCellClick: (probability: string, impact: string) => void;
}

export default function RiskHeatmap({ risks, activeFilter, onCellClick }: Props) {
  function count(prob: string, imp: string) {
    return risks.filter(r => r.probability === prob && r.impact === imp).length;
  }

  return (
    <div className="flex items-start gap-2">
      {/* Y-axis label */}
      <div className="flex items-center justify-center self-stretch pb-6">
        <span className="text-[10px] text-gray-400 [writing-mode:vertical-lr] rotate-180 tracking-widest uppercase">
          Impact ↑
        </span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Column headers */}
        <div className="grid grid-cols-[44px_1fr_1fr_1fr] mb-1.5">
          <div />
          {PROBS.map(p => (
            <div key={p} className="text-center text-[11px] font-medium text-gray-500">{p}</div>
          ))}
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-1.5">
          {IMPACTS.map(imp => (
            <div key={imp} className="grid grid-cols-[44px_1fr_1fr_1fr] gap-1.5 items-center">
              <div className="text-[11px] font-medium text-gray-500 text-right pr-2 leading-none">{imp}</div>
              {PROBS.map(prob => {
                const score = calcScore(prob, imp);
                const level = getRiskLevel(score);
                const n = count(prob, imp);
                const isActive = activeFilter?.probability === prob && activeFilter?.impact === imp;
                return (
                  <button
                    key={prob}
                    onClick={() => onCellClick(prob, imp)}
                    title={`${prob} × ${imp} = score ${score} (${level.label})`}
                    className={cn(
                      "h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-150 border-2 select-none",
                      level.bg, level.text,
                      isActive
                        ? `${level.border} shadow-md scale-[1.04]`
                        : `border-transparent hover:${level.border} hover:shadow-sm`
                    )}
                  >
                    <span className="text-2xl font-bold leading-none">{n}</span>
                    <span className="text-[10px] opacity-60 leading-none">{level.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* X-axis label */}
        <div className="text-center text-[10px] text-gray-400 mt-2 tracking-widest uppercase ml-11">
          Probability →
        </div>
      </div>
    </div>
  );
}
