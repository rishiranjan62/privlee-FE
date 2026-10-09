import type { UIEvent } from "react";

const HIDE_AFTER_MS = 900;
const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/**
 * Shows an element's scrollbar only while it is being scrolled, and fades it out shortly after.
 * Use as `onScroll={revealScrollbar}` on an element with the `thin-scroll` class; the styling lives
 * in index.css and keys off the `data-scrolling` attribute set here.
 */
export function revealScrollbar(event: UIEvent<HTMLElement>): void {
  const el = event.currentTarget;
  el.dataset.scrolling = "true";
  const pending = timers.get(el);
  if (pending) clearTimeout(pending);
  timers.set(
    el,
    setTimeout(() => {
      delete el.dataset.scrolling;
    }, HIDE_AFTER_MS),
  );
}
