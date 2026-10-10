import { resetTimeLabel } from "../lib/useLikeAllowance";
import type { LikeAllowance } from "../lib/types";

/** A quiet line about today's likes. Shown only to members who have a daily limit. */
export default function LikeAllowanceNote({ allowance }: { allowance: LikeAllowance | null }) {
  if (!allowance || !allowance.limited || allowance.remaining === null) return null;

  const when = resetTimeLabel(allowance);
  const text =
    allowance.remaining > 0
      ? `${allowance.remaining} free ${allowance.remaining === 1 ? "like" : "likes"} left today`
      : `Free likes used - each extra like costs ${allowance.extraLikeCost} credits`;

  return (
    <p className="mb-8 inline-flex items-center gap-2 rounded-full border border-line bg-white/60 px-4 py-1.5 text-sm text-muted">
      <span className="text-ink">{text}</span>
      {when && <span>· refreshes at {when}</span>}
    </p>
  );
}
