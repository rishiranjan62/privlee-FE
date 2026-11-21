import { useState } from "react";
import { api } from "../lib/api";
import { pillClass } from "../lib/ui";
import type { ReportReason } from "../lib/types";
import Portal from "./Portal";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "HARASSMENT", label: "Harassment" },
  { value: "BLACKMAIL_ATTEMPT", label: "Threats" },
  { value: "SCAM", label: "Scam or spam" },
  { value: "UNDERAGE_SUSPICION", label: "Might be under 18" },
  { value: "OTHER", label: "Something else" },
];

/** Reports one thought or one comment. The words are kept with the report, so a moderator can read them even if they are deleted. */
export default function ThoughtReportDialog({
  thoughtId,
  commentId,
  onClose,
}: {
  thoughtId: string;
  commentId?: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason) return;
    setSending(true);
    setError(null);
    try {
      await api.reportThought(thoughtId, reason, details.trim(), commentId);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send your report");
    } finally {
      setSending(false);
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex justify-center overflow-y-auto bg-ink/40 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
        <div
          className="my-auto w-full max-w-md rounded-3xl border border-line bg-card p-7 shadow-[0_40px_80px_-30px_rgba(29,26,22,0.5)]"
          onClick={(e) => e.stopPropagation()}
        >
          {sent ? (
            <>
              <h2 className="font-display text-3xl font-medium">Report sent</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Thank you. Our moderators will look at it, and the person won't be told it was you.
              </p>
              <button onClick={onClose} className="mt-7 w-full rounded-full border border-line bg-white/60 px-6 py-3 text-sm transition hover:border-gold">
                Done
              </button>
            </>
          ) : (
            <>
              <h2 className="font-display text-3xl font-medium">Report this {commentId ? "comment" : "thought"}</h2>
              <p className="mt-2 text-sm text-muted">What's the problem?</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {REASONS.map((r) => (
                  <button key={r.value} type="button" onClick={() => setReason(r.value)} className={pillClass(reason === r.value)}>
                    {r.label}
                  </button>
                ))}
              </div>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Anything that would help us understand (optional)"
                className="mt-4 w-full rounded-xl border border-line bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/15"
              />
              {error && <p className="mt-3 text-sm text-danger">{error}</p>}
              <div className="mt-6 flex gap-3">
                <button onClick={onClose} className="rounded-full border border-line bg-white/60 px-6 py-3 text-sm transition hover:border-gold">
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={!reason || sending}
                  className="flex-1 rounded-full bg-ink px-6 py-3 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-40"
                >
                  {sending ? "Sending..." : "Send report"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}
