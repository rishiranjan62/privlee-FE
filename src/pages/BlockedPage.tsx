import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { BlockedUser } from "../lib/types";

export default function BlockedPage() {
  const [blocked, setBlocked] = useState<BlockedUser[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api.getBlockedUsers().then(setBlocked).catch(() => setBlocked([]));
  }, []);

  useEffect(load, [load]);

  async function unblock(userId: string) {
    setBusy(userId);
    try {
      await api.unblockUser(userId);
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="rise mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Privacy</p>
        <h1 className="mt-2 font-display text-4xl font-medium leading-tight">Blocked profiles</h1>
        <p className="mt-3 text-muted">
          Nobody here can see you, and you can't see them. They were never told.
        </p>
      </header>

      {blocked === null ? (
        <p className="py-12 text-center text-muted">Loading...</p>
      ) : blocked.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white/50 px-6 py-16 text-center">
          <p className="font-display text-2xl">You haven't blocked anyone.</p>
          <p className="mt-2 text-sm text-muted">
            You can block someone from the menu on their profile.
          </p>
          <Link
            to="/discover"
            className="mt-8 inline-block rounded-full bg-ink px-8 py-3 font-medium text-canvas transition hover:-translate-y-0.5 hover:bg-gold"
          >
            Back to Discover
          </Link>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-3xl border border-line bg-card shadow-[0_30px_60px_-40px_rgba(120,80,30,0.4)]">
          {blocked.map((b) => (
            <li
              key={b.userId}
              className="flex items-center justify-between gap-4 border-b border-line/70 px-5 py-4 last:border-b-0"
            >
              <span>
                <span className="block font-display text-xl font-medium">{b.pseudonym}</span>
                <span className="text-xs text-muted">
                  Blocked {new Date(b.blockedAt).toLocaleDateString()}
                </span>
              </span>
              <button
                onClick={() => unblock(b.userId)}
                disabled={busy === b.userId}
                className="shrink-0 rounded-full border border-line bg-white/70 px-5 py-2 text-sm transition hover:border-gold disabled:opacity-60"
              >
                {busy === b.userId ? "..." : "Unblock"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
