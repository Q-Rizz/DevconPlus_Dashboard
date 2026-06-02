export function calcScore(probability: string, impact: string): number {
  const p = probability === "High" ? 3 : probability === "Medium" ? 2 : 1;
  const i = impact === "High" ? 3 : impact === "Medium" ? 2 : 1;
  return p * i;
}

export function getRiskLevel(score: number) {
  if (score >= 9) return { label: "Critical", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", border: "border-red-200" };
  if (score >= 6) return { label: "High",     bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500", border: "border-orange-200" };
  if (score >= 3) return { label: "Medium",   bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500", border: "border-yellow-200" };
  return             { label: "Low",      bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500",  border: "border-green-200" };
}

interface Props {
  probability: string;
  impact: string;
  showLabel?: boolean;
}

export default function RiskScoreBadge({ probability, impact, showLabel = true }: Props) {
  const score = calcScore(probability, impact);
  const level = getRiskLevel(score);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${level.bg} ${level.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${level.dot}`} />
      {score}{showLabel && <span>· {level.label}</span>}
    </span>
  );
}
