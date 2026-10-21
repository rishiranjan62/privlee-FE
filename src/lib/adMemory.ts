/**
 * What this browser remembers about the ads it has shown - kept on the device only, never tied to the account.
 *
 * It exists so the same ad does not keep coming back to the same person. With each request for an ad the browser tells the
 * server "this one I showed twice today, the last time 40 minutes ago", and the server uses that once to choose and then
 * forgets it. The server itself keeps no record of who saw what.
 *
 * Clearing the browser's data resets it, and a second device has its own memory: this limits repeats, it does not track a person.
 */

const KEY = "dd_ads";
const KEEP_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LISTED = 60;

interface State {
  /** The local calendar day the counts below are for. */
  day: string;
  /** Per ad: times shown on that day, and when it was last shown (kept for a week, for the "wait between" rule). */
  shown: Record<string, { n: number; last: number }>;
  hidden: string[];
  /** Ads of any kind shown that day. */
  total: number;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    const s: State = raw ? JSON.parse(raw) : { day: today(), shown: {}, hidden: [], total: 0 };
    if (s.day !== today()) {
      // A new day: the daily counts start again, the memory of when each was last shown stays.
      s.day = today();
      s.total = 0;
      for (const v of Object.values(s.shown)) v.n = 0;
    }
    const now = Date.now();
    for (const [id, v] of Object.entries(s.shown)) if (now - v.last > KEEP_MS) delete s.shown[id];
    return { day: s.day, shown: s.shown ?? {}, hidden: s.hidden ?? [], total: s.total ?? 0 };
  } catch {
    return { day: today(), shown: {}, hidden: [], total: 0 };
  }
}

function save(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private mode or no room: ads then simply repeat a little more.
  }
}

/** What to send with a request for an ad. */
export function adMemoryQuery(): { seen: string; hidden: string; today: number } {
  const s = load();
  const now = Date.now();
  return {
    seen: Object.entries(s.shown)
      .slice(0, MAX_LISTED)
      .map(([id, v]) => `${id}:${v.n}:${Math.max(0, Math.floor((now - v.last) / 60000))}`)
      .join(","),
    hidden: s.hidden.slice(-MAX_LISTED).join(","),
    today: s.total,
  };
}

/** Call with the ads the server just handed out. */
export function rememberShown(ids: string[]) {
  if (ids.length === 0) return;
  const s = load();
  const now = Date.now();
  for (const id of ids) {
    const v = s.shown[id] ?? { n: 0, last: now };
    s.shown[id] = { n: v.n + 1, last: now };
  }
  s.total += ids.length;
  save(s);
}

/** The person closed this ad: it is not shown to them again. */
export function rememberHidden(id: string) {
  const s = load();
  if (!s.hidden.includes(id)) s.hidden.push(id);
  s.hidden = s.hidden.slice(-MAX_LISTED);
  save(s);
}
