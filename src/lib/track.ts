/**
 * Page-view counting for the admin traffic report.
 *
 * Nothing identifying is sent or kept. The one thing remembered in the browser is *the date of the
 * last visit*, only so the very first view of each day can be flagged as a new visitor - there is no
 * visitor id, no cookie, and nothing that could link two visits together on the server.
 */
import { API_ORIGIN } from "./apiBase";

export type TrackedPage = "landing" | "login" | "signup" | "verify" | "content" | "app";

const LAST_VISIT_KEY = "pv_last_day";

function pageFor(pathname: string): TrackedPage | null {
  if (pathname.startsWith("/admin")) return null; // staff are not traffic
  // Terms, Privacy, the FAQ and the guides: website traffic, but not the landing page.
  if (["/terms", "/privacy", "/faq"].includes(pathname) || pathname.startsWith("/guides")) return "content";
  if (pathname === "/") return "landing";
  if (pathname.startsWith("/login")) return "login";
  if (pathname.startsWith("/signup")) return "signup";
  if (pathname.startsWith("/verify-email")) return "verify";
  return "app";
}

/** True the first time it is asked on a given day. Falls back to false if storage is unavailable. */
function firstVisitToday(): boolean {
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(LAST_VISIT_KEY) === today) return false;
    localStorage.setItem(LAST_VISIT_KEY, today);
    return true;
  } catch {
    return false;
  }
}

function externalReferrer(): string {
  try {
    const ref = document.referrer;
    return ref && new URL(ref).host !== window.location.host ? ref : "";
  } catch {
    return "";
  }
}

let lastTracked: string | null = null;

/** Reports a view of the given route. Failures are ignored: counting must never affect the page. */
export function trackView(pathname: string): void {
  const page = pageFor(pathname);
  if (!page || pathname === lastTracked) return;
  lastTracked = pathname;
  fetch(`${API_ORIGIN}/api/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      page,
      platform: "web",
      referrer: externalReferrer(),
      newVisitor: firstVisitToday(),
    }),
    keepalive: true,
  }).catch(() => {});
}
