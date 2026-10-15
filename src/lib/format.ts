/** "4m 12s", "1h 03m", "45s". Whole seconds in, a person-sized duration out. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

/** Paise in, "₹1,234.50" out. Whole rupees drop the ".00". */
export function formatMoney(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: paise % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function formatValue(value: number, unit: "count" | "seconds" | "paise"): string {
  if (unit === "paise") return formatMoney(value);
  return unit === "seconds" ? formatDuration(value) : value.toLocaleString();
}
