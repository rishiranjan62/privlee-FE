import { useEffect, useState } from "react";
import { api } from "../lib/api";
import PhotoGallery from "./PhotoGallery";
import type { PrivateAlbum } from "../lib/types";

interface Props {
  ownerId: string;
  pseudonym: string;
  album: PrivateAlbum;
  /** Reload the profile after the album's state has changed. */
  onChanged: () => void;
}

function Lock({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/**
 * Someone's private album. Locked, it shows only how many photos there are - never a picture, blurred or not, and
 * whether or not the two have matched. They can ask the owner, or pay to open it at once. Once let in, the photos.
 */
export default function PrivateAlbumSection({ ownerId, pseudonym, album, onChanged }: Props) {
  const [requestCost, setRequestCost] = useState(0);
  const [busy, setBusy] = useState<"ask" | "unlock" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPrivatePhotoPricing().then((p) => setRequestCost(p.requestCost)).catch(() => {});
  }, []);

  const letIn = album.photos.length > 0;
  const waiting = album.access === "PENDING";

  async function run(kind: "ask" | "unlock") {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "ask") await api.requestPrivatePhotos(ownerId);
      else await api.unlockPrivatePhotos(ownerId);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-white/60 p-6" aria-label="Private photos">
      <div className="flex items-center gap-2">
        <Lock />
        <h2 className="font-display text-2xl font-medium">Private photos</h2>
        <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">{album.count}</span>
      </div>

      {letIn ? (
        <div className="mt-4">
          <PhotoGallery photos={album.photos} label={`${pseudonym}'s private photos`} />
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: Math.min(album.count, 4) }).map((_, i) => (
              <div key={i} className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-line bg-canvas text-muted">
                <Lock className="h-6 w-6" />
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            {pseudonym} keeps {album.count === 1 ? "a photo" : `${album.count} photos`} private. They stay hidden even from
            people they've matched with. {waiting
              ? `You've asked. ${pseudonym} hasn't answered yet - or you can unlock them now.`
              : album.access === "DECLINED"
                ? `${pseudonym} isn't sharing them right now, but you can unlock them yourself.`
                : "Ask to see them, or unlock them now."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {!waiting && (
              <button
                onClick={() => run("ask")}
                disabled={busy !== null}
                className="rounded-full border border-line bg-white px-5 py-2 text-sm font-medium text-gold transition hover:border-gold disabled:opacity-60"
              >
                {busy === "ask" ? "Asking..." : requestCost > 0 ? `Ask to see them · ${requestCost} credits` : "Ask to see them"}
              </button>
            )}
            <button
              onClick={() => run("unlock")}
              disabled={busy !== null}
              className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-60"
            >
              {busy === "unlock" ? "Unlocking..." : `Unlock now · ${album.unlockCost} credits`}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}
