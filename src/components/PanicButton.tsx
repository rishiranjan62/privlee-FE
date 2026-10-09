import { useState } from "react";
import { usePanic } from "../context/PanicContext";

const HINT_KEY = "dd_panic_hint_seen";

function hintAlreadySeen(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    // Private browsing can throw on access; showing the hint twice beats crashing.
    return true;
  }
}

export default function PanicButton() {
  const { trigger } = usePanic();
  // Taught before the emergency, never during it - the disguise screen itself stays silent.
  const [showHint, setShowHint] = useState(() => !hintAlreadySeen());

  function dismissHint() {
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* nothing to do - worst case the hint returns next visit */
    }
    setShowHint(false);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {showHint && (
        <div className="w-64 rounded-2xl border border-line bg-card p-4 shadow-[0_24px_50px_-20px_rgba(120,80,30,0.55)]">
          <p className="font-display text-lg">Need to vanish?</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            This button turns Privlee into an ordinary notes screen. To come back, tap the word
            <span className="text-ink"> Notes</span> three times.
          </p>
          <button
            onClick={dismissHint}
            className="mt-3 w-full rounded-full bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-gold"
          >
            Got it
          </button>
        </div>
      )}

      <button
        onClick={trigger}
        title="Leave instantly"
        aria-label="Leave instantly"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-card text-muted shadow-[0_18px_40px_-14px_rgba(120,80,30,0.5)] transition hover:-translate-y-0.5 hover:border-danger hover:text-danger"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.8}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
