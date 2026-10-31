import { useEffect, useState } from "react";
import { API_ORIGIN } from "../lib/apiBase";
import { api } from "../lib/api";
import { rememberHidden } from "../lib/adMemory";
import { reportAd, useSeen } from "../lib/adEvents";
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
      placement={placement}
      className={className}
      onHide={() => {
        rememberHidden(ad.id);
        reportAd("HIDE", ad.id, placement, ad.variant);
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
  placement = null,
  onHide,
}: {
  ad: ServedAd;
  className?: string;
  preview?: boolean;
  /** Where it is shown, so being seen can be counted. Left out in the admin preview, where nothing is. */
  placement?: AdPlacement | null;
  onHide?: () => void;
}) {
  const seen = useSeen<HTMLElement>(ad.id, preview ? null : placement, ad.variant);
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
      <div className="min-w-0 flex-1 pr-16">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">{ad.label}</p>
        <p className="mt-0.5 truncate font-display text-xl font-medium leading-tight sm:text-2xl">{ad.title}</p>
        {ad.body && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{ad.body}</p>}
        {ad.offerText && <p className="mt-1 truncate text-xs font-semibold text-gold">{ad.offerText}</p>}
        <span className="mt-2 inline-block rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-canvas transition group-hover:bg-gold">
          {ad.ctaLabel}
        </span>
      </div>
    </>
  );
  const shell = `group flex items-center gap-4 rounded-3xl border border-line bg-white/70 p-3 sm:p-4 ${className}`;
  if (preview) {
    return (
      <div className="relative">
        <div className={shell}>{content}</div>
        {/* In the narrow preview the button sits under the card instead of over it. */}
        {ad.hasCode && <ShowCode ad={ad} placement={null} className="mb-1 ml-auto mr-3 mt-2 w-fit" />}
      </div>
    );
  }
  return (
    <aside ref={seen} aria-label="Sponsored" className="relative">
      <a
        href={`${API_ORIGIN}${ad.clickPath}`}
        target="_blank"
        // "sponsored" tells search engines it is paid; the rest keeps the advertiser from learning where the visit came from.
        rel="sponsored noopener noreferrer"
        className={`${shell} transition hover:border-gold/60`}
      >
        {content}
      </a>
      {ad.hasCode && placement && (
        <ShowCode ad={ad} placement={placement} className="absolute bottom-3 right-4 max-[380px]:static max-[380px]:mb-3 max-[380px]:ml-auto max-[380px]:mr-4 max-[380px]:mt-1 max-[380px]:w-fit" />
      )}
      {onHide && placement && <AdMenu ad={ad} placement={placement} onHide={onHide} className="absolute right-10 top-3" />}
      {onHide && <HideButton onHide={onHide} className="absolute right-3 top-3" />}
    </aside>
  );
}

/**
 * "Show code" for an offer. The code is not part of the ad: tapping asks the server, which counts the tap and answers with the code, and the
 * code stays on screen with a copy button. It is a separate control beside the card, so the card itself still opens the advertiser's page.
 */
function ShowCode({ ad, placement, className = "" }: { ad: ServedAd; placement: AdPlacement | null; className?: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function reveal() {
    if (placement === null || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      setCode(await api.revealAdCode(ad.id, placement));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (code) {
    return (
      <div className={`flex items-center gap-2 rounded-full border border-gold/60 bg-[#fffdf9] py-1 pl-3 pr-1 shadow-sm ${className}`}>
        <span className="font-mono text-sm font-semibold tracking-wider" aria-label="Offer code">{code}</span>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(code).then(() => setCopied(true), () => setCopied(false))}
          className="rounded-full bg-ink px-3 py-1 text-[11px] font-medium text-canvas transition hover:bg-gold"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={reveal}
      disabled={busy || placement === null}
      className={`rounded-full border border-gold/70 bg-[#fffdf9] px-4 py-1.5 text-xs font-medium text-gold shadow-sm transition hover:bg-gold hover:text-white disabled:opacity-60 ${className}`}
    >
      {busy ? "..." : failed ? "Try again" : "Show code"}
    </button>
  );
}

const REPORT_REASONS: [string, string][] = [
  ["MISLEADING", "It is misleading"],
  ["SCAM", "It looks like a scam"],
  ["OFFENSIVE", "It is offensive"],
  ["IRRELEVANT", "It is not relevant to me"],
  ["OTHER", "Something else"],
];

/**
 * The small "..." beside an ad's cross: why this ad is shown, and how to report it. The explanation is the server's own sentence about who the
 * advertiser chose to reach; nothing about the member is used to pick an ad. A report says what is wrong and where, never who is saying it,
 * and hides the ad on this device.
 */
function AdMenu({ ad, placement, onHide, className = "" }: { ad: ServedAd; placement: AdPlacement; onHide: () => void; className?: string }) {
  const [view, setView] = useState<"closed" | "menu" | "why" | "report" | "thanks">("closed");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function send() {
    if (!reason || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await api.reportAdProblem(ad.id, { reason, note: note.trim(), placement });
      setView("thanks");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setView(view === "closed" ? "menu" : "closed")}
        aria-label="About this ad"
        aria-expanded={view !== "closed"}
        title="About this ad"
        className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition hover:bg-ink/10 hover:text-ink"
      >
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
          <circle cx="2" cy="6" r="1.1" fill="currentColor" />
          <circle cx="6" cy="6" r="1.1" fill="currentColor" />
          <circle cx="10" cy="6" r="1.1" fill="currentColor" />
        </svg>
      </button>
      {view !== "closed" && (
        <div role="dialog" aria-label="About this ad" className="absolute right-0 top-8 z-30 w-72 rounded-2xl border border-line bg-white p-4 text-left text-sm shadow-lg">
          {view === "menu" && (
            <div className="space-y-1">
              <button type="button" onClick={() => setView("why")} className="block w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-canvas">Why am I seeing this?</button>
              <button type="button" onClick={() => setView("report")} className="block w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-canvas">Report this ad</button>
              <button type="button" onClick={() => setView("closed")} className="block w-full rounded-lg px-2 py-1.5 text-left text-muted transition hover:bg-canvas">Close</button>
            </div>
          )}
          {view === "why" && (
            <div>
              <p className="font-medium">Why am I seeing this?</p>
              <p className="mt-2 text-muted">{ad.why || "Privlee shows ads from businesses that pay us. Nothing about you was used to pick this one."}</p>
              <p className="mt-2 text-muted">Advertisers never learn who you are, and nothing from your messages, photos or profile is shared with them.</p>
              <button type="button" onClick={() => setView("closed")} className="mt-3 rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-canvas transition hover:bg-gold">Got it</button>
            </div>
          )}
          {view === "report" && (
            <div>
              <p className="font-medium">Report this ad</p>
              <fieldset className="mt-2 space-y-1">
                <legend className="sr-only">What is wrong</legend>
                {REPORT_REASONS.map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2">
                    <input type="radio" name={`ad-report-${ad.id}`} value={value} checked={reason === value} onChange={() => setReason(value)} />
                    {label}
                  </label>
                ))}
              </fieldset>
              <label className="mt-3 block text-xs text-muted">
                Anything to add (optional)
                <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} rows={2} className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-gold" />
              </label>
              <p className="mt-1 text-xs text-muted">We keep what you tell us about the ad, not who you are.</p>
              {failed && <p role="alert" className="mt-1 text-xs text-danger">That did not send. Please try again.</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={!reason || busy} onClick={send} className="rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-canvas transition hover:bg-gold disabled:opacity-50">{busy ? "Sending..." : "Send report"}</button>
                <button type="button" onClick={() => setView("closed")} className="rounded-full border border-line px-4 py-1.5 text-xs transition hover:border-gold">Cancel</button>
              </div>
            </div>
          )}
          {view === "thanks" && (
            <div>
              <p className="font-medium">Thank you</p>
              <p className="mt-2 text-muted">We will look at this ad. It will not be shown to you again on this device.</p>
              <button type="button" onClick={onHide} className="mt-3 rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-canvas transition hover:bg-gold">Done</button>
            </div>
          )}
        </div>
      )}
    </div>
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
  const seen = useSeen<HTMLElement>(ad.id, "CONVERSATION", ad.variant);
  return (
    <aside ref={seen} aria-label="Sponsored" className="relative mx-auto my-4 w-full max-w-sm">
      <a
        href={`${API_ORIGIN}${ad.clickPath}`}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group flex items-center gap-3 rounded-2xl border border-dashed border-line bg-[#f6efe3]/70 p-3 pr-16 transition hover:border-gold/60 hover:bg-[#f6efe3]"
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
          {(ad.offerText || ad.body) && <span className="block truncate text-xs text-muted">{ad.offerText || ad.body}</span>}
          <span className="mt-1 inline-block rounded-full bg-ink px-3 py-0.5 text-[11px] font-medium text-canvas transition group-hover:bg-gold">{ad.ctaLabel}</span>
        </span>
      </a>
      <AdMenu ad={ad} placement="CONVERSATION" onHide={onHide} className="absolute right-9 top-2" />
      <HideButton
        onHide={() => {
          reportAd("HIDE", ad.id, "CONVERSATION", ad.variant);
          onHide();
        }}
        className="absolute right-2 top-2"
      />
    </aside>
  );
}

/**
 * A sponsored item as a row of the Messages list. Quieter than a conversation and clearly labelled, so it cannot be mistaken
 * for one - a different background, the word "Sponsored", and no unread badge or time.
 */
export function SponsoredListRow({ ad, onHide }: { ad: ServedAd; onHide: () => void }) {
  const seen = useSeen<HTMLDivElement>(ad.id, "MESSAGES", ad.variant);
  return (
    <div ref={seen} className="relative bg-[#f6efe3]/70">
      <a
        href={`${API_ORIGIN}${ad.clickPath}`}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group flex items-center gap-3 px-4 py-3 pr-16 transition hover:bg-[#f6efe3]"
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
          <span className="block truncate text-xs text-muted">{ad.offerText || ad.body || ad.ctaLabel}</span>
        </span>
        <span className="hidden shrink-0 rounded-full bg-ink px-3 py-1 text-[11px] font-medium text-canvas transition group-hover:bg-gold sm:inline-block">
          {ad.ctaLabel}
        </span>
      </a>
      <AdMenu ad={ad} placement="MESSAGES" onHide={onHide} className="absolute right-9 top-2" />
      <HideButton
        onHide={() => {
          reportAd("HIDE", ad.id, "MESSAGES", ad.variant);
          onHide();
        }}
        className="absolute right-2 top-2"
      />
    </div>
  );
}
