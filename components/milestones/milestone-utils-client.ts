// Pure client-safe utility — no React imports, no "use client" needed

export function progressColor(pct: number): string {
  if (pct >= 100) return "#22c55e";
  if (pct >= 67) return "#3b82f6";
  if (pct >= 34) return "#f59e0b";
  return "#ef4444";
}

export function progressLabel(pct: number): string {
  if (pct >= 100) return "Complete";
  if (pct >= 67) return "Good progress";
  if (pct >= 34) return "Underway";
  return "Early stage";
}
