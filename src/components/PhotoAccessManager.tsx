import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useStreamEvent } from "../context/StreamContext";
import { cardClass } from "../lib/ui";
import type { PhotoAccessRequest } from "../lib/types";

/** The two kinds of access the owner manages: the blurred photos, and the private album. */
const KINDS = {
  photos: {
    title: "Who can see your photos",
    blurb: "Nobody sees them unless you say yes, and you can take that back at any time.",
    incoming: () => api.getIncomingPhotoRequests(),
    approved: () => api.getApprovedPhotoViewers(),
    respond: (id: string, approve: boolean) => api.respondToPhotoRequest(id, approve),
    revoke: (viewerId: string) => api.revokePhotoAccess(viewerId),
    events: ["PHOTO_ACCESS_REQUESTED", "PHOTO_ACCESS_REVOKED"],
  },
  private: {
    title: "Who can see your private album",
    blurb:
      "Matching doesn't open it. People get in only because you said yes, or because they paid to unlock it. You can take it back at any time.",
    incoming: () => api.getIncomingPrivateRequests(),
    approved: () => api.getApprovedPrivateViewers(),
    respond: (id: string, approve: boolean) => api.respondToPrivateRequest(id, approve),
    revoke: (viewerId: string) => api.revokePrivateAccess(viewerId),
    events: ["PRIVATE_ACCESS_REQUESTED", "PRIVATE_ACCESS_UNLOCKED", "PRIVATE_ACCESS_REVOKED"],
  },
} as const;

/** Pending asks to see my photos (or my private album), plus everyone I have already let in. */
export default function PhotoAccessManager({ kind = "photos" }: { kind?: keyof typeof KINDS }) {
  const config = KINDS[kind];
  const [pending, setPending] = useState<PhotoAccessRequest[] | null>(null);
  const [approved, setApproved] = useState<PhotoAccessRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const [incoming, allowed] = await Promise.all([config.incoming(), config.approved()]);
    setPending(incoming);
    setApproved(allowed);
  }

  useEffect(() => {
    load().catch(() => setPending([]));
  }, []);

  useStreamEvent((event) => {
    if ((config.events as readonly string[]).includes(event.type)) {
      load().catch(() => {});
    }
  });

  async function respond(requestId: string, approve: boolean) {
    setBusy(requestId);
    try {
      await config.respond(requestId, approve);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function revoke(viewerId: string) {
    setBusy(viewerId);
    try {
      await config.revoke(viewerId);
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
        <h2 className="font-display text-2xl font-medium">{config.title}</h2>
        <p className="mt-1 text-sm text-muted">{config.blurb}</p>
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
