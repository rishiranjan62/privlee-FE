import type { MessagePricing } from "./types";

/**
 * The warning shown while you write to someone you have not matched with, and kept in view until you match. The first message has
 * one price, the ones after it another - and women are only charged for the first. Writing back is never charged to the person who
 * was written to, so they are not warned. Null when it is all free.
 */
export function unmatchedNote(p: MessagePricing): string | null {
  if (!p.unmatched) return null;
  if (p.textCost > p.followUpCost) {
    const after =
      p.followUpCost > 0
        ? `Each message after that costs ${p.followUpCost} credits until you match.`
        : "After that, your messages are free until you match.";
    return `You haven't matched, so this message costs ${p.textCost} credits. ${after}`;
  }
  if (p.textCost > 0) return `You haven't matched, so each message costs ${p.textCost} credits until you match.`;
  return "You haven't matched yet. Your messages are free until you match.";
}
