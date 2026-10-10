import { useEffect, useState } from "react";
import { api, WALLET_CHANGED } from "../lib/api";

/** The member's credit balance, shown quietly in the header. Renders nothing until it is known. */
export default function WalletChip() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    const load = () =>
      api
        .getWallet()
        .then((w) => live && setBalance(w.balance))
        .catch(() => {});
    load();
    window.addEventListener(WALLET_CHANGED, load);
    return () => {
      live = false;
      window.removeEventListener(WALLET_CHANGED, load);
    };
  }, []);

  if (balance === null) return null;

  return (
    <span
      title="Your credits"
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/60 px-3 py-1 text-sm"
    >
      <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#d4a762] to-[#8f5f26]" />
      <span className="tabular-nums">{balance.toLocaleString()}</span>
      <span className="sr-only">credits</span>
    </span>
  );
}
