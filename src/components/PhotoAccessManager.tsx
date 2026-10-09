import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useStreamEvent } from "../context/StreamContext";
import { cardClass } from "../lib/ui";
import type { PhotoAccessRequest } from "../lib/types";

/** Pending asks to see my photos, plus everyone I have already let in. */
export default function PhotoAccessManager() {
  const [pending, setPending] = useState<PhotoAccessRequest[] | null>(null);
  const [approved, setApproved] = useState<PhotoAccessRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const [incoming, allowed] = await Promise.all([
      api.getIncomingPhotoRequests(),
      api.getApprovedPhotoViewers(),
    ]);
    setPending(incoming);
    setApproved(allowed);
  }

  useEffect(() => {
    load().catch(() => setPending([]));
  }, []);

  useStreamEvent((event) => {
    if (event.type === "PHOTO_ACCESS_REQUESTED" || event.type === "PHOTO_ACCESS_REVOKED") {
      load().catch(() => {});
    }
  });

  async function respond(requestId: string, approve: boolean) {
    setBusy(requestId);
    try {
      await api.respondToPhotoRequest(requestId, approve);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function revoke(viewerId: string) {
    setBusy(viewerId);
    try {
      await api.revokePhotoAccess(viewerId);
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (pending === null) return null;
  if (pending.length === 0 && approved.length === 0) return null;

  return (
    <section className={`${cardClass} space-y-6 p-7`}>
      <div>
        <h2 className="font-display text-2xl font-medium">Who can see your photos</h2>
        <p className="mt-1 text-sm text-muted">
          Nobody sees them unless you say yes, and you can take that back at any time.
        </p>
      </div>

      {pending.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-gold">
            Waiting on you ({pending.length})
          </p>
          <ul className="space-y-2">
            {pending.map((r) => (
              <li
                key={r.requestId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/70 px-4 py-3"
              >
                <Link to={`/u/${r.requesterId}`} className="min-w-0">
                  <span className="font-display text-lg">{r.requesterPseudonym}</span>
                  {r.requesterCity && (
                    <span className="ml-2 text-sm text-muted">{r.requesterCity}</span>
                  )}
                </Link>
                <span className="flex shrink-0 gap-2">
                  <button
                    onClick={() => respond(r.requestId, true)}
                    disabled={busy === r.requestId}
                    className="rounded-full bg-ink px-5 py-1.5 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-60"
                  >
                    Allow
                  </button>
                  <button
                    onClick={() => respond(r.requestId, false)}
                    disabled={busy === r.requestId}
                    className="rounded-full border border-line px-5 py-1.5 text-sm text-muted transition hover:border-danger hover:text-danger disabled:opacity-60"
                  >
                    Decline
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {approved.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Allowed ({approved.length})
          </p>
          <ul className="space-y-2">
            {approved.map((r) => (
              <li
                key={r.requestId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/50 px-4 py-3"
              >
                <Link to={`/u/${r.requesterId}`} className="min-w-0">
                  <span className="font-display text-lg">{r.requesterPseudonym}</span>
                </Link>
                <button
                  onClick={() => revoke(r.requesterId)}
                  disabled={busy === r.requesterId}
                  className="shrink-0 text-sm text-muted underline-offset-4 transition hover:text-danger hover:underline disabled:opacity-60"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
