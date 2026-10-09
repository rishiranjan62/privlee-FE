/** "4m 12s", "1h 03m", "45s". Whole seconds in, a person-sized duration out. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

export function formatValue(value: number, unit: "count" | "seconds"): string {
  return unit === "seconds" ? formatDuration(value) : value.toLocaleString();
}
