import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { openCheckout } from "../lib/cashfree";
import { cardClass } from "../lib/ui";
import type { PackCatalogue, PaymentStatus, WalletData } from "../lib/types";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** How long to keep asking after a payment: Cashfree can take a few seconds to settle. */
const CHECK_EVERY_MS = 3000;
const CHECK_TIMES = 5;

export default function CreditsPage() {
  const [params, setParams] = useSearchParams();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [catalogue, setCatalogue] = useState<PackCatalogue | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "good" | "wait" | "bad"; text: string } | null>(null);

  const loadWallet = useCallback(() => {
    api.getWallet().then(setWallet).catch(() => {});
  }, []);

  useEffect(() => {
    loadWallet();
    api.getPacks().then(setCatalogue).catch(() => setCatalogue({ enabled: false, environment: "sandbox", packs: [] }));
  }, [loadWallet]);

  // Coming back from Cashfree: the address carries the order, and the server - not the address, and not
  // the browser - decides whether it was paid. Safe to run twice, and safe with a made-up order id.
  const orderId = params.get("order_id");
  useEffect(() => {
    if (!orderId) return;
    let live = true;
    setNotice({ tone: "wait", text: "Checking your payment..." });

    async function check(attempt: number) {
      let status: PaymentStatus | null = null;
      try {
        status = await api.confirmPurchase(orderId as string);
      } catch {
        status = null;
      }
      if (!live) return;
      if (status === "PAID") {
        setNotice({ tone: "good", text: "Payment received. Your credits have been added." });
      } else if (status === "EXPIRED" || status === "FAILED") {
        setNotice({ tone: "bad", text: "That payment didn't go through, so you haven't been charged. You can try again." });
      } else if (attempt < CHECK_TIMES) {
        setTimeout(() => live && check(attempt + 1), CHECK_EVERY_MS);
        return;
      } else {
        setNotice({
          tone: "wait",
          text: "We haven't had confirmation yet. If you paid, your credits will appear here shortly - no need to pay again.",
        });
      }
      loadWallet();
      setParams({}, { replace: true });
    }
    check(1);
    return () => {
      live = false;
    };
  }, [orderId, loadWallet, setParams]);

  async function buy(packId: string) {
    if (buying) return;
    setBuying(packId);
    setError(null);
    try {
      const checkout = await api.startPurchase(packId);
      await openCheckout(checkout.paymentSessionId, checkout.environment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't start that payment.");
      setBuying(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="rise mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Credits</p>
        <h1 className="mt-2 font-display text-4xl font-medium leading-tight">
          {wallet ? (
            <>
              <span className="gold-text italic">{wallet.balance.toLocaleString()}</span> credits
            </>
          ) : (
            "Your credits"
          )}
        </h1>
        <p className="mt-3 text-muted">Use them for gifts, and for likes once your free ones for the day are gone.</p>
      </header>

      {notice && (
        <p
          role="status"
          className={`mb-6 rounded-2xl border px-5 py-3 text-sm ${
            notice.tone === "good"
              ? "border-gold/40 bg-gold/10 text-ink"
              : notice.tone === "bad"
                ? "border-danger/30 bg-danger/10 text-danger"
                : "border-line bg-white/60 text-muted"
          }`}
        >
          {notice.text}
        </p>
      )}

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl">Get more</h2>

        {catalogue === null ? (
          <p className="text-muted">Loading...</p>
        ) : !catalogue.enabled ? (
          <p className="rounded-3xl border border-dashed border-line bg-white/50 px-6 py-8 text-center text-muted">
            Buying credits isn't available yet.
          </p>
        ) : (
          <>
            {catalogue.environment === "sandbox" && (
              <p className="mb-4 rounded-2xl border border-line bg-white/60 px-4 py-2 text-sm text-muted">
                Test mode: payments here use test details and no real money moves.
              </p>
            )}
            {error && (
              <p role="alert" className="mb-4 rounded-2xl border border-danger/30 bg-danger/10 px-5 py-3 text-sm text-danger">
                {error}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {catalogue.packs.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => buy(pack.id)}
                  disabled={buying !== null}
                  className={`${cardClass} flex flex-col items-center gap-1 px-4 py-6 transition hover:-translate-y-0.5 hover:border-gold disabled:opacity-60`}
                >
                  <span className="font-display text-3xl">{pack.credits.toLocaleString()}</span>
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">credits</span>
                  <span className="mt-3 rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-canvas">
                    {buying === pack.id ? "Opening..." : rupees(pack.amountInr)}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">
              You pay on Cashfree's secure page; we never see your card or UPI details. Credits are for use inside
              Privlee and aren't refundable except where the law says otherwise - see the{" "}
              <Link to="/terms" className="text-gold hover:underline">
                Terms
              </Link>
              .
            </p>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl">History</h2>
        {wallet === null ? (
          <p className="text-muted">Loading...</p>
        ) : wallet.transactions.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-line bg-white/50 px-6 py-8 text-center text-muted">
            Nothing yet.
          </p>
        ) : (
          <ul className={`${cardClass} divide-y divide-line/70`}>
            {wallet.transactions.map((t, i) => (
              <li key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>
                  {t.label}
                  <span className="ml-2 text-muted">{new Date(t.createdAt).toLocaleDateString()}</span>
                </span>
                <span className={`tabular-nums ${t.amount > 0 ? "text-ink" : "text-muted"}`}>
                  {t.amount > 0 ? "+" : ""}
                  {t.amount.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
