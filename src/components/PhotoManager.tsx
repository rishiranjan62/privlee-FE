import { useState } from "react";
import { api } from "../lib/api";
import { labelClass } from "../lib/ui";
import type { Photo, Profile } from "../lib/types";

interface Props {
  /** All of your photos, the private album included. */
  photos: Photo[];
  /** Called with the server's new photo list after any change. */
  onPhotosChanged: (profile: Profile) => void;
  onAdd: () => void;
  /** Adds a photo straight into the private album. */
  onAddPrivate: () => void;
}

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-3.5 w-3.5">
      <path
        d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Lock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function PhotoManager({ photos, onPhotosChanged, onAdd, onAddPrivate }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Two-step delete: the × arms it, a second click confirms. Avoids a blocking dialog.
  const [confirming, setConfirming] = useState<string | null>(null);

  const open = photos.filter((p) => !p.privatePhoto);
  const album = photos.filter((p) => p.privatePhoto);
  const main = open.find((p) => p.primary) ?? open[0];

  async function run(photoId: string, action: () => Promise<Profile>) {
    setBusy(photoId);
    setError(null);
    try {
      onPhotosChanged(await action());
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work. Please try again.");
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  function move(index: number, delta: number) {
    const next = [...open];
    const [moved] = next.splice(index, 1);
    next.splice(index + delta, 0, moved);
    // The server wants every photo in the list; the private album simply follows the others.
    run(open[index].id, () => api.reorderPhotos([...next, ...album].map((p) => p.id)));
  }

  function Remove({ p }: { p: Photo }) {
    return (
      <button
        type="button"
        onClick={() => (confirming === p.id ? run(p.id, () => api.deletePhoto(p.id)) : setConfirming(p.id))}
        onBlur={() => setConfirming((c) => (c === p.id ? null : c))}
        disabled={busy === p.id}
        aria-label={confirming === p.id ? "Confirm remove" : "Remove photo"}
        className={`absolute right-1.5 top-1.5 flex h-6 items-center justify-center rounded-full text-[10px] font-semibold transition disabled:opacity-50 ${
          confirming === p.id
            ? "bg-danger px-2 text-white"
            : "w-6 bg-ink/70 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        }`}
      >
        {confirming === p.id ? "Remove?" : "×"}
      </button>
    );
  }

  return (
    <div className="space-y-8">
      {/* ---- the main photo: the one thing people see before anything else */}
      <div>
        <label className={labelClass}>Profile picture</label>
        <p className="-mt-1 mb-3 text-sm text-muted">
          Your main photo is the first thing people see. Choose whether everyone sees it clearly, or it stays blurred
          until you let someone in.
        </p>
        {main ? (
          <div className="flex flex-wrap items-center gap-4">
            <img src={main.url} alt="" className="h-20 w-20 rounded-2xl object-cover" />
            <div role="group" aria-label="Who sees your profile picture" className="flex overflow-hidden rounded-full border border-line bg-white/70 text-sm">
              <button
                type="button"
                aria-pressed={main.blurred}
                disabled={busy === main.id}
                onClick={() => !main.blurred && run(main.id, () => api.setPhotoVisibility(main.id, { blurred: true }))}
                className={`px-4 py-2 transition ${main.blurred ? "bg-ink text-canvas" : "hover:bg-white"}`}
              >
                Blurred
              </button>
              <button
                type="button"
                aria-pressed={!main.blurred}
                disabled={busy === main.id}
                onClick={() => main.blurred && run(main.id, () => api.setPhotoVisibility(main.id, { blurred: false }))}
                className={`px-4 py-2 transition ${!main.blurred ? "bg-ink text-canvas" : "hover:bg-white"}`}
              >
                Visible to everyone
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Add a photo to choose how it shows.</p>
        )}
      </div>

      {/* ---- the other photos */}
      <div>
        <label className={labelClass}>Photos</label>
        <p className="-mt-1 mb-3 text-sm text-muted">
          New photos start blurred. Tap the label to make one public, and use the arrows to reorder. People you
          approve see all of these clearly. The 🔒 button moves a photo to your private album.
        </p>

        <div className="flex flex-wrap gap-3">
          {open.map((p, i) => (
            <div key={p.id} className="group relative">
              <img src={p.url} alt="" className={`h-24 w-24 rounded-2xl object-cover ${busy === p.id ? "opacity-50" : ""}`} />

              {p === main && (
                <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold">
                  Main
                </span>
              )}

              <Remove p={p} />

              <div className="absolute inset-x-1.5 bottom-9 flex justify-between opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || busy === p.id}
                  aria-label="Move left"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-white transition hover:bg-ink disabled:invisible"
                >
                  <Arrow dir="left" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === open.length - 1 || busy === p.id}
                  aria-label="Move right"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-white transition hover:bg-ink disabled:invisible"
                >
                  <Arrow dir="right" />
                </button>
              </div>

              <div className="absolute inset-x-0 bottom-0 flex overflow-hidden rounded-b-2xl text-[10px] font-medium uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => run(p.id, () => api.setPhotoVisibility(p.id, { blurred: !p.blurred }))}
                  disabled={busy === p.id}
                  title={
                    p.blurred
                      ? "Only you and people you approve can see this. Tap to show it to everyone."
                      : "Everyone can see this. Tap to blur it again."
                  }
                  className={`flex-1 py-1 transition disabled:opacity-60 ${
                    p.blurred ? "bg-ink/70 text-canvas hover:bg-ink/85" : "bg-gold/85 text-white hover:bg-gold"
                  }`}
                >
                  {p.blurred ? "Blurred" : "Public"}
                </button>
                {p !== main && (
                  <button
                    type="button"
                    onClick={() => run(p.id, () => api.setPhotoVisibility(p.id, { privatePhoto: true }))}
                    disabled={busy === p.id}
                    aria-label="Move to private album"
                    title="Move to your private album"
                    className="flex items-center justify-center border-l border-white/30 bg-ink/70 px-2 text-canvas transition hover:bg-ink/85 disabled:opacity-60"
                  >
                    <Lock />
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onAdd}
            className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line bg-white/50 text-muted transition hover:border-gold hover:text-gold"
          >
            <span className="text-2xl leading-none">+</span>
            <span className="text-[11px]">Add</span>
          </button>
        </div>
      </div>

      {/* ---- the private album */}
      <div>
        <label className={labelClass}>Private album</label>
        <p className="-mt-1 mb-3 text-sm text-muted">
          These are never shown to anyone - not even people you have matched with, or people you let see your other
          photos. Someone sees them only if you say yes to their request, or they pay to unlock them. You can take it
          back at any time.
        </p>

        <div className="flex flex-wrap gap-3">
          {album.map((p) => (
            <div key={p.id} className="group relative">
              <img src={p.url} alt="" className={`h-24 w-24 rounded-2xl object-cover ${busy === p.id ? "opacity-50" : ""}`} />
              <span className="pointer-events-none absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink">
                <Lock /> Private
              </span>
              <Remove p={p} />
              <button
                type="button"
                onClick={() => run(p.id, () => api.setPhotoVisibility(p.id, { privatePhoto: false }))}
                disabled={busy === p.id}
                title="Take it out of the private album. It goes back to your other photos, still blurred."
                className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-ink/70 py-1 text-[10px] font-medium uppercase tracking-wider text-canvas transition hover:bg-ink/85 disabled:opacity-60"
              >
                Make not private
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={onAddPrivate}
            className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line bg-white/50 text-muted transition hover:border-gold hover:text-gold"
          >
            <span className="text-2xl leading-none">+</span>
            <span className="text-[11px]">Add private</span>
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
