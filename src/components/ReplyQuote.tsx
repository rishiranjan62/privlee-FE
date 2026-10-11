import { GIFT_EMOJI, GIFT_LABELS } from "../lib/labels";
import type { ReplyPreview } from "../lib/types";

/** What a quoted message is called in a reply. Pictures are only ever named, never shown again. */
export function previewText(p: ReplyPreview): string {
  switch (p.type) {
    case "IMAGE":
      return `📷 ${p.text.replace(/[\[\]]/g, "") || "Picture"}`;
    case "GIFT":
      return `${p.gift ? GIFT_EMOJI[p.gift] : "🎁"} ${p.gift ? GIFT_LABELS[p.gift] : "A gift"}`;
    case "WINK":
      return "😉 A wink";
    default:
      return p.text;
  }
}

/** The quoted message shown above a reply; pressing it jumps back to the original. */
export default function ReplyQuote({
  preview,
  tone = "light",
  onJump,
}: {
  preview: ReplyPreview;
  /** "dark" sits inside a dark (own) bubble. */
  tone?: "light" | "dark";
  onJump?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onJump}
      className={`mb-1.5 block w-full min-w-[8rem] max-w-full rounded-xl border-l-4 px-3 py-1.5 text-left text-sm ${
        tone === "dark" ? "border-gold bg-white/10 text-canvas/90" : "border-gold bg-gold/10 text-ink"
      }`}
    >
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-gold">
        {preview.mine ? "You" : "Them"}
      </span>
      <span className="line-clamp-2 break-words [overflow-wrap:anywhere]">{previewText(preview)}</span>
    </button>
  );
}
