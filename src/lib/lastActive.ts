/**
 * "Active 3 h ago" for someone you are talking to. The server sends the time to the minute, and only when the person
 * has not hidden it - so a null means nothing is shown, which looks the same as "never seen" and gives nothing away.
 * Deliberately coarse: the older it gets, the less exact it says.
 */
export function lastActiveLabel(iso: string | null | undefined, now: number = Date.now()): string | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  const minutes = Math.max(0, Math.floor((now - then) / 60_000));
  if (minutes < 5) return "Active now";
  if (minutes < 60) return `Active ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Active yesterday";
  if (days < 7) return `Active ${days} days ago`;
  return "Active over a week ago";
}
