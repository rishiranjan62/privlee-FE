import { useState } from "react";
import { api } from "../lib/api";
import { labelClass } from "../lib/ui";
import type { Photo, Profile } from "../lib/types";

interface Props {
  photos: Photo[];
  /** Called with the server's new photo list after any change. */
  onPhotosChanged: (profile: Profile) => void;
  onAdd: () => void;
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

export default function PhotoManager({ photos, onPhotosChanged, onAdd }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  // Two-step delete: the × arms it, a second click confirms. Avoids a blocking dialog.
  const [confirming, setConfirming] = useState<string | null>(null);

  async function run(photoId: string, action: () => Promise<Profile>) {
    setBusy(photoId);
    try {
      onPhotosChanged(await action());
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  function move(index: number, delta: number) {
    const next = [...photos];
    const [moved] = next.splice(index, 1);
    next.splice(index + delta, 0, moved);
    run(
      photos[index].id,
      () => api.reorderPhotos(next.map((p) => p.id)),
    );
  }

  return (
    <div>
      <label className={labelClass}>Photos</label>
      <p className="-mt-1 mb-3 text-sm text-muted">
        New photos start blurred. Tap the label to make one public, and use the arrows to reorder —
        the first photo is the one people see first.
      </p>

      <div className="flex flex-wrap gap-3">
        {photos.map((p, i) => (
          <div key={p.id} className="group relative">
            <img
              src={p.url}
              alt=""
              className={`h-24 w-24 rounded-2xl object-cover ${busy === p.id ? "opacity-50" : ""}`}
            />

            {i === 0 && (
              <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold">
                Main
              </span>
            )}

            {/* Remove: armed on first click, applied on the second. */}
            <button
              type="button"
              onClick={() =>
                confirming === p.id ? run(p.id, () => api.deletePhoto(p.id)) : setConfirming(p.id)
              }
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
                disabled={i === photos.length - 1 || busy === p.id}
                aria-label="Move right"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-white transition hover:bg-ink disabled:invisible"
              >
                <Arrow dir="right" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => run(p.id, () => api.setPhotoVisibility(p.id, !p.blurred))}
              disabled={busy === p.id}
              title={
                p.blurred
                  ? "Only you and people you approve can see this. Tap to show it to everyone."
                  : "Everyone can see this. Tap to blur it again."
              }
              className={`absolute inset-x-0 bottom-0 rounded-b-2xl py-1 text-[10px] font-medium uppercase tracking-wider transition disabled:opacity-60 ${
                p.blurred ? "bg-ink/70 text-canvas hover:bg-ink/85" : "bg-gold/85 text-white hover:bg-gold"
              }`}
            >
              {p.blurred ? "Blurred" : "Public"}
            </button>
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
  );
}
