import Logo from "../components/Logo";
import { usePageMeta } from "../lib/seo";

/**
 * Where Cashfree sends someone who paid (or gave up) from the Android app. This browser is not signed in and cannot say whether the payment
 * worked, and does not need to: the app asks the server when it is opened again, and Cashfree also tells the server directly.
 */
export default function PayDonePage() {
  usePageMeta({ title: "Back to the app - Privlee", index: false });
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <Logo className="h-10" />
      <h1 className="mt-8 font-display text-3xl">Go back to the Privlee app</h1>
      <p className="mt-3 max-w-sm text-muted">
        If your payment went through, your credits are added there within a few seconds. Close this page (or press back) to return to the app.
      </p>
      <p className="mt-6 max-w-sm text-xs text-muted">If you were charged and no credits appear, wait a minute and open Credits again. No need to pay twice.</p>
    </div>
  );
}
