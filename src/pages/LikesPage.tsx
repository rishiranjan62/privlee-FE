import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import ProfileTile from "../components/ProfileTile";
import { tileGrid } from "../lib/ui";
import { lookingForLabels } from "../lib/labels";
import type { Admirer, Profile } from "../lib/types";

type Tab = "received" | "sent";

export default function LikesPage() {
  const [tab, setTab] = useState<Tab>("received");
  const [received, setReceived] = useState<Admirer[] | null>(null);
  const [sent, setSent] = useState<Profile[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [r, s] = await Promise.all([api.getReceivedLikes(), api.getSentLikes()]);
    setReceived(r);
    setSent(s);
  }, []);

  useEffect(() => {
    load().catch(() => {
      setReceived([]);
      setSent([]);
    });
  }, [load]);

  async function takeBack(userId: string) {
    setBusy(userId);
    try {
      await api.unlike(userId);
      await load();
    } finally {
      setBusy(null);
    }
  }


  return (
    <div>
      <header className="rise mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Likes</p>
        <h1 className="mt-3 font-display text-5xl font-medium leading-tight">
          {tab === "received" ? (
            <>
              People who said <span className="gold-text italic">hello.</span>
            </>
          ) : (
            <>
              Waiting on <span className="gold-text italic">them.</span>
            </>
          )}
        </h1>
      </header>

      <div className="mb-6 flex gap-2">
        {(
          [
            ["received", "Likes you"],
            ["sent", `Sent${sent?.length ? ` (${sent.length})` : ""}`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-5 py-2 text-sm transition ${
              tab === key
                ? "bg-ink text-canvas"
                : "border border-line bg-white/60 text-muted hover:border-gold"
            }`}
          >
            {label}
          </button>
        ))}
      </div>


      {tab === "received" ? (
        received === null ? (
          <p className="py-12 text-center text-muted">Loading...</p>
        ) : received.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-white/50 px-6 py-16 text-center">
            <p className="font-display text-2xl">Nobody yet.</p>
            <p className="mt-2 text-sm text-muted">
              When someone likes you, you'll see it here — without their name.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-muted">
              {received.length === 1 ? "One person likes" : `${received.length} people like`} you.
              Who stays hidden — like them back in Discover and it becomes a match.
            </p>
            <ul className={tileGrid}>
              {received.map((a, i) => (
                <li
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-xl border border-line bg-gradient-to-br from-[#e6d2b0] to-[#bf9a66]"
                >
                  {a.photoUrl ? (
                    // Heavily blurred and scaled up so no edge of the real image survives.
                    <img
                      src={a.photoUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center pb-10">
                      <span className="font-display text-3xl text-white/50">?</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-2.5">
                    <p className="font-display text-base font-medium leading-tight text-white">
                      Someone <span className="text-xs font-normal text-white/70">{a.age}</span>
                    </p>
                    <p className="truncate text-[11px] leading-tight text-white/70">
                      {lookingForLabels[a.lookingFor] ?? a.lookingFor}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )
      ) : sent === null ? (
        <p className="py-12 text-center text-muted">Loading...</p>
      ) : sent.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white/50 px-6 py-16 text-center">
          <p className="font-display text-2xl">You haven't liked anyone.</p>
          <p className="mt-2 text-sm text-muted">Likes you send show up here until they answer.</p>
          <Link
            to="/discover"
            className="mt-8 inline-block rounded-full bg-ink px-8 py-3 font-medium text-canvas transition hover:-translate-y-0.5 hover:bg-gold"
          >
            Browse Discover
          </Link>
        </div>
      ) : (
        <ul className={tileGrid}>
          {sent.map((p: Profile) => (
            <ProfileTile
              key={p.userId}
              profile={p}
              actionLabel="Take it back"
              actionTone="danger"
              onAction={() => takeBack(p.userId)}
              disabled={busy === p.userId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
