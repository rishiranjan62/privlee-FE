import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import ReportDialog from "./ReportDialog";

interface Props {
  userId: string;
  pseudonym: string;
  /** Present when the two have matched, which is what makes unmatching possible. */
  matchId: string | null;
}

type Pending = "block" | "unmatch" | null;

export default function ProfileActionsMenu({ userId, pseudonym, matchId }: Props) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<Pending>(null);
  const [working, setWorking] = useState(false);
  const [reporting, setReporting] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  async function run() {
    setWorking(true);
    try {
      if (confirming === "block") {
        await api.blockUser(userId);
        navigate("/discover");
      } else if (confirming === "unmatch" && matchId) {
        await api.unmatch(matchId);
        navigate("/matches");
      }
    } finally {
      setWorking(false);
      setConfirming(null);
    }
  }

  const copy =
    confirming === "block"
      ? {
          title: `Block ${pseudonym}?`,
          body: `You won't see each other anywhere in Privlee again, and any conversation between you is deleted. ${pseudonym} is not told. You can undo this from your blocked list.`,
          action: "Block",
        }
      : {
          title: `Unmatch ${pseudonym}?`,
          body: `Your conversation is deleted for both of you and the match ends. ${pseudonym} is not told, and you may see each other in Discover again.`,
          action: "Unmatch",
        };

  return (
    <>
      <div ref={wrapper} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="More options"
          aria-haspopup="menu"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white/60 text-muted transition hover:border-gold hover:text-ink"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
          </svg>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-2xl border border-line bg-card py-1 shadow-[0_30px_60px_-24px_rgba(120,80,30,0.5)]"
          >
            {matchId && (
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setConfirming("unmatch");
                }}
                className="block w-full px-4 py-2.5 text-left text-sm transition hover:bg-white"
              >
                Unmatch
              </button>
            )}
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setReporting(true);
              }}
              className="block w-full px-4 py-2.5 text-left text-sm transition hover:bg-white"
            >
              Report
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setConfirming("block");
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-danger transition hover:bg-white"
            >
              Block
            </button>
          </div>
        )}
      </div>

      {reporting && (
        <ReportDialog
          userId={userId}
          pseudonym={pseudonym}
          hasConversation={matchId !== null}
          onClose={() => setReporting(false)}
          onBlock={() => {
            setReporting(false);
            setConfirming("block");
          }}
        />
      )}

      {confirming && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm"
          onClick={() => setConfirming(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-line bg-card p-7 shadow-[0_40px_80px_-30px_rgba(29,26,22,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-3xl font-medium">{copy.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{copy.body}</p>
            <div className="mt-7 flex gap-3">
              <button
                onClick={() => setConfirming(null)}
                className="flex-1 rounded-full border border-line bg-white/60 px-6 py-3 text-sm transition hover:border-gold"
              >
                Cancel
              </button>
              <button
                onClick={run}
                disabled={working}
                className="flex-1 rounded-full bg-danger px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {working ? "Working..." : copy.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
