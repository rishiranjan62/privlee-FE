import { useEffect, useRef, useState } from "react";
import Logo from "../components/Logo";
import { openCheckout } from "../lib/cashfree";
import { usePageMeta } from "../lib/seo";

/**
 * Where the Android app sends someone to pay. The app makes the order and opens this page in the phone's browser; this page opens
 * Cashfree's web checkout for it. No sign-in is needed: the order's payment session, which the app put in the address after the "#"
 * (so the browser never sends it to any server), is the only thing the checkout needs, and it can only pay that one order.
 *
 * Cashfree's own app check blocks its in-app screen for an app installed outside a store; the web checkout has no such check.
 */
export default function PayPage() {
  usePageMeta({ title: "Pay - Privlee", index: false });
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const start = () => {
    setError(null);
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const session = fragment.get("s") ?? "";
    const mode = fragment.get("e") === "production" ? "production" : fragment.get("e") === "sandbox" ? "sandbox" : null;
    if (!session || session.length > 600 || !mode) {
      setError("This payment link isn't valid. Go back to the Privlee app and try again.");
      return;
    }
    // The session has done its job once Cashfree has it: take it out of the address bar and the history.
    window.history.replaceState(null, "", window.location.pathname);
    openCheckout(session, mode).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "We couldn't open the payment page. Please try again.");
    });
  };

  useEffect(() => {
    if (started.current) return; // React runs effects twice in development; a payment must open once
    started.current = true;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <Logo className="h-10" />
      {error ? (
        <>
          <p role="alert" className="mt-8 max-w-sm text-sm text-danger">{error}</p>
          <p className="mt-3 max-w-sm text-sm text-muted">Nothing has been charged. Close this page and start again from the app.</p>
        </>
      ) : (
        <>
          <p className="mt-8 font-display text-2xl">Opening the secure payment page...</p>
          <p className="mt-3 max-w-sm text-sm text-muted">You pay on Cashfree's page. We never see your card or UPI details.</p>
        </>
      )}
    </div>
  );
}
