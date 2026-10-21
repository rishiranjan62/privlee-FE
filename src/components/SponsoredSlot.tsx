import { useEffect, useState } from "react";
import { API_ORIGIN } from "../lib/apiBase";
import { api } from "../lib/api";
import { rememberHidden } from "../lib/adMemory";
import type { AdPlacement, ServedAd } from "../lib/types";

/**
 * One sponsored item for a screen, or nothing at all. It is always labelled, never looks like a person, and sits between
 * sections - never inside a conversation or on a photo.
 *
 * Asking the server for it is what counts it as shown, so it asks once when the screen opens. The click goes through
 * Privlee's own address (which counts it and sends the visitor on without telling the advertiser where they came from),
 * and opens in a new tab so the member's place in the app is kept. The small cross hides the ad for good on this device.
 */
export default function SponsoredSlot({ placement, className = "mb-12" }: { placement: AdPlacement; className?: string }) {
  const [ad, setAd] = useState<ServedAd | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getAds(placement)
      .then((ads) => {
        if (!cancelled) setAd(ads[0] ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [placement]);

  if (!ad) return null;
  return (
    <SponsoredCard
      ad={ad}
      className={className}
      onHide={() => {
        rememberHidden(ad.id);
        setAd(null);
      }}
    />
  );
}

const src = (path: string) => (path.startsWith("blob:") || path.startsWith("http") ? path : `${API_ORIGIN}${path}`);

/** The card itself, also used by the admin console's live preview (where nothing is counted). */
export function SponsoredCard({
  ad,
  className = "",
  preview = false,
  onHide,
}: {
  ad: ServedAd;
  className?: string;
  preview?: boolean;
  onHide?: () => void;
}) {
  const content = (
    <>
      {ad.imagePath ? (
        <img src={src(ad.imagePath)} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24" />
      ) : (
        <div
          aria-hidden
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#e8c9a0] to-[#c98f6b] font-display text-3xl text-white/80 sm:h-24 sm:w-24"
        >
          {ad.title.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">{ad.label}</p>
        <p className="mt-0.5 truncate font-display text-xl font-medium leading-tight sm:text-2xl">{ad.title}</p>
        {ad.body && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{ad.body}</p>}
        <span className="mt-2 inline-block rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-canvas transition group-hover:bg-gold">
          {ad.ctaLabel}
        </span>
      </div>
    </>
  );
  const shell = `group flex items-center gap-4 rounded-3xl border border-line bg-white/70 p-3 sm:p-4 ${className}`;
  if (preview) return <div className={shell}>{content}</div>;
  return (
    <aside aria-label="Sponsored" className="relative">
      <a
        href={`${API_ORIGIN}${ad.clickPath}`}
        target="_blank"
        // "sponsored" tells search engines it is paid; the rest keeps the advertiser from learning where the visit came from.
        rel="sponsored noopener noreferrer"
        className={`${shell} transition hover:border-gold/60`}
      >
        {content}
      </a>
      {onHide && <HideButton onHide={onHide} className="absolute right-3 top-3" />}
    </aside>
  );
}

function HideButton({ onHide, className = "" }: { onHide: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onHide}
      aria-label="Hide this ad"
      title="Hide this ad"
      className={`flex h-6 w-6 items-center justify-center rounded-full text-muted transition hover:bg-ink/10 hover:text-ink ${className}`}
    >
      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/**
 * A sponsored card between two messages of a conversation. It is centred, tinted and labelled so it can never be taken for a message
 * from the other person, and it says plainly that it is not part of the conversation. Nothing of the conversation is used to choose
 * it or sent anywhere; the cross hides it for good on this device.
 */
export function SponsoredChatRow({ ad, onHide }: { ad: ServedAd; onHide: () => void }) {
  return (
    <aside aria-label="Sponsored" className="relative mx-auto my-4 w-full max-w-sm">
      <a
        href={`${API_ORIGIN}${ad.clickPath}`}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group flex items-center gap-3 rounded-2xl border border-dashed border-line bg-[#f6efe3]/70 p-3 pr-9 transition hover:border-gold/60 hover:bg-[#f6efe3]"
      >
        {ad.imagePath ? (
          <img src={src(ad.imagePath)} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
        ) : (
          <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#e8c9a0] to-[#c98f6b] font-display text-lg text-white/90">
            {ad.title.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{ad.label} · not part of your conversation</span>
          <span className="block truncate font-display text-base font-medium leading-tight">{ad.title}</span>
          {ad.body && <span className="block truncate text-xs text-muted">{ad.body}</span>}
          <span className="mt-1 inline-block rounded-full bg-ink px-3 py-0.5 text-[11px] font-medium text-canvas transition group-hover:bg-gold">{ad.ctaLabel}</span>
        </span>
      </a>
      <HideButton onHide={onHide} className="absolute right-2 top-2" />
    </aside>
  );
}

/**
 * A sponsored item as a row of the Messages list. Quieter than a conversation and clearly labelled, so it cannot be mistaken
 * for one - a different background, the word "Sponsored", and no unread badge or time.
 */
export function SponsoredListRow({ ad, onHide }: { ad: ServedAd; onHide: () => void }) {
  return (
    <div className="relative bg-[#f6efe3]/70">
      <a
        href={`${API_ORIGIN}${ad.clickPath}`}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group flex items-center gap-3 px-4 py-3 pr-10 transition hover:bg-[#f6efe3]"
      >
        {ad.imagePath ? (
          <img src={src(ad.imagePath)} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
        ) : (
          <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#e8c9a0] to-[#c98f6b] font-display text-base text-white/90">
            {ad.title.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">{ad.label}</span>
          <span className="block truncate font-display text-base font-medium leading-tight">{ad.title}</span>
          <span className="block truncate text-xs text-muted">{ad.body || ad.ctaLabel}</span>
        </span>
        <span className="hidden shrink-0 rounded-full bg-ink px-3 py-1 text-[11px] font-medium text-canvas transition group-hover:bg-gold sm:inline-block">
          {ad.ctaLabel}
        </span>
      </a>
      <HideButton onHide={onHide} className="absolute right-2 top-2" />
    </div>
  );
}
