import { useEffect, useState } from "react";
import type { Photo } from "../lib/types";

/** Every photo you may see, as a grid. A tap opens one large; the arrow keys and Esc work too. */
export default function PhotoGallery({ photos, label }: { photos: Photo[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`${label}, photo ${i + 1} of ${photos.length}`}
            className="aspect-square overflow-hidden rounded-2xl bg-line/40 transition hover:opacity-90"
          >
            <img src={p.url} alt="" loading="lazy" className={`h-full w-full object-cover ${p.blurred ? "blur-md" : ""}`} />
          </button>
        ))}
      </div>

      {open !== null && photos[open] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
        >
          <img
            src={photos[open].url}
            alt=""
            onClick={(e) => e.stopPropagation()}
            // Not draggable or savable by a long-press: these were shared in confidence.
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className={`max-h-full max-w-full rounded-2xl object-contain ${photos[open].blurred ? "blur-md" : ""}`}
          />
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white transition hover:bg-white/25"
          >
            ×
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open - 1 + photos.length) % photos.length);
                }}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open + 1) % photos.length);
                }}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
