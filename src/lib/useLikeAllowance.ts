import { useCallback, useEffect, useState } from "react";
import { api, LIKE_SENT } from "./api";
import type { LikeAllowance } from "./types";

/** Today's like allowance for the signed-in member, kept current as they like people. */
export function useLikeAllowance(): LikeAllowance | null {
  const [allowance, setAllowance] = useState<LikeAllowance | null>(null);

  const load = useCallback(() => {
    api
      .getLikeAllowance()
      .then(setAllowance)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(LIKE_SENT, load);
    return () => window.removeEventListener(LIKE_SENT, load);
  }, [load]);

  return allowance;
}

/** What to ask before a like that will cost credits. Null when this like is free. */
export function paidLikeQuestion(a: LikeAllowance | null): string | null {
  if (!a || !a.limited || a.remaining !== 0 || a.extraLikeCost === null) return null;
  return `You've used today's free likes. This one costs ${a.extraLikeCost} credits. Send it?`;
}

/** "3:30 am" style time the allowance next refreshes, in the member's own time zone. */
export function resetTimeLabel(a: LikeAllowance): string {
  if (!a.resetsAt) return "";
  return new Date(a.resetsAt)
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
}
