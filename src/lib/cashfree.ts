/**
 * Opens Cashfree's hosted checkout. Card and UPI details are typed on Cashfree's page, never on ours.
 * The script is loaded only when someone is about to pay, so nobody else's visit touches a third party.
 */

interface CashfreeSdk {
  checkout(options: { paymentSessionId: string; redirectTarget?: "_self" | "_blank" | "_top" | "_modal" }): Promise<unknown>;
}

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => CashfreeSdk;
  }
}

const SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";
let loading: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (window.Cashfree) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("We couldn't reach the payment page. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Sends the browser to Cashfree's checkout; it comes back to the return URL set when the order was made. */
export async function openCheckout(paymentSessionId: string, mode: "sandbox" | "production"): Promise<void> {
  await loadSdk();
  if (!window.Cashfree) throw new Error("The payment page didn't load. Please try again.");
  await window.Cashfree({ mode }).checkout({ paymentSessionId, redirectTarget: "_self" });
}
