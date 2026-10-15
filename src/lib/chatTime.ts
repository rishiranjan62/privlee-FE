/** The time a message was sent, in the reader's own clock: "3:07 PM". */
export function messageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** The full date and time, for the hover title: "Wednesday, 15 October 2026 at 3:07 PM". */
export function messageFullTime(iso: string): string {
  return new Date(iso).toLocaleString([], { dateStyle: "full", timeStyle: "short" });
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Which day a message belongs to, as a stable key, so a divider is drawn when the day changes. */
export function dayKey(iso: string): number {
  return startOfDay(new Date(iso));
}

/** "Today", "Yesterday", the weekday for the last week, then the date. */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { day: "numeric", month: "long", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}
