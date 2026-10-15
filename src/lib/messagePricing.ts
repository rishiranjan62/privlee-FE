import type { MessagePricing } from "./types";

/**
 * The warning shown before writing to someone you have not matched with. The first message has one price, the ones
 * after it (until they write back) another - and women are only charged for the first. Null when it is all free.
 */
export function unmatchedNote(p: MessagePricing): string | null {
  if (!p.unmatched) return null;
  if (p.textCost > p.followUpCost) {
    const after =
      p.followUpCost > 0
        ? `Each message after that costs ${p.followUpCost} credits until they write back.`
        : "After that, your messages are free until they write back.";
    return `You haven't matched, so this message costs ${p.textCost} credits. ${after}`;
  }
  if (p.textCost > 0) return `You haven't matched, so each message costs ${p.textCost} credits until they write back.`;
  return "You haven't matched yet. Your messages are free until they write back.";
}
