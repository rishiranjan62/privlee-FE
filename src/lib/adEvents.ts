import { useEffect, useRef } from "react";
import { api } from "./api";
import type { AdPlacement } from "./types";

/**
 * What the page tells the server about an ad it showed: that it was really on screen, or that the member closed it. Only totals change on
 * the server (see AdService.report); nothing says who. Sent in small batches, and lost quietly if the page goes away first.
 */
type AdEventType = "SEEN" | "HIDE";

const FLUSH_MS = 1500;
const MAX_BATCH = 20;
let queue: { ad: string; placement: AdPlacement; type: AdEventType; variant?: string }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  if (queue.length === 0) return;
  const events = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);
  api.reportAdEvents(events).catch(() => {});
  if (queue.length > 0) timer = setTimeout(flush, FLUSH_MS);
}

export function reportAd(type: AdEventType, ad: string, placement: AdPlacement, variant?: string) {
  queue.push({ ad, placement, type, variant });
  if (timer === null) timer = setTimeout(flush, FLUSH_MS);
}

if (typeof document !== "undefined") {
  // Best effort when the tab is hidden or closed.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && timer !== null) {
      clearTimeout(timer);
      flush();
    }
  });
}

/** Counts the ad as seen once it has been at least half on screen for a second. Attach the returned ref to the card. */
export function useSeen<T extends Element>(adId: string, placement: AdPlacement | null, variant?: string) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    // No placement means a preview in the admin console: nothing is counted.
    if (!el || placement === null || typeof IntersectionObserver === "undefined") return;
    let wait: ReturnType<typeof setTimeout> | null = null;
    let done = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const onScreen = entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5) && document.visibilityState === "visible";
        if (onScreen && wait === null && !done) {
          wait = setTimeout(() => {
            done = true;
            reportAd("SEEN", adId, placement, variant);
            observer.disconnect();
          }, 1000);
        } else if (!onScreen && wait !== null) {
          clearTimeout(wait);
          wait = null;
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(el);
    return () => {
      if (wait !== null) clearTimeout(wait);
      observer.disconnect();
    };
  }, [adId, placement, variant]);
  return ref;
}
