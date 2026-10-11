import { useEffect, useRef, useState, type ReactNode } from "react";
import { REACTIONS, type Message } from "../lib/types";

interface Props {
  message: Message;
  mine: boolean;
  /** Pass the emoji to leave it; null takes the reaction back. */
  onReact: (emoji: string | null) => void;
  /** Starts a reply to this message. */
  onReply: () => void;
  children: ReactNode;
}

/**
 * Wraps one message with the ways to react to it: a small button beside it (always there on a touch screen, on hover
 * with a mouse) that opens the row of emotions, and a double-click as the quick heart. What has been left shows as
 * little chips underneath, yours highlighted.
 */
export default function MessageReactions({ message, mine, onReact, onReply, children }: Props) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  function choose(emoji: string) {
    setOpen(false);
    // Choosing what you already left takes it back.
    onReact(message.myReaction === emoji ? null : emoji);
  }

  const chips: { emoji: string; yours: boolean }[] = [
    ...(message.theirReaction ? [{ emoji: message.theirReaction, yours: false }] : []),
    ...(message.myReaction ? [{ emoji: message.myReaction, yours: true }] : []),
  ];

  return (
    <div ref={wrapper} className={`group relative flex max-w-[85%] flex-col ${mine ? "items-end" : "items-start"}`}>
      <div className={`flex items-center gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
        <div onDoubleClick={() => choose("❤️")}>{children}</div>
        <button
          type="button"
          onClick={onReply}
          aria-label="Reply to this message"
          title="Reply"
          className="shrink-0 rounded-full border border-line bg-white/80 px-2 py-1 text-sm leading-none opacity-0 transition hover:border-gold focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60"
        >
          ↩
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="React to this message"
          title="React"
          className="shrink-0 rounded-full border border-line bg-white/80 px-2 py-1 text-sm leading-none opacity-0 transition hover:border-gold focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60"
        >
          ☺
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className={`absolute top-full z-20 mt-1 flex gap-0.5 rounded-full border border-line bg-card px-2 py-1.5 shadow-[0_18px_36px_-18px_rgba(120,80,30,0.5)] ${
            mine ? "right-0" : "left-0"
          }`}
        >
          {REACTIONS.map((e) => (
            <button
              key={e}
              type="button"
              role="menuitem"
              onClick={() => choose(e)}
              aria-label={`React ${e}`}
              className={`rounded-full px-1.5 py-1 text-xl transition hover:scale-125 ${message.myReaction === e ? "bg-gold/20" : ""}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {chips.length > 0 && (
        <div className={`-mt-1 flex gap-1 ${mine ? "mr-3" : "ml-3"}`}>
          {chips.map((c) => (
            <span
              key={c.yours ? "mine" : "theirs"}
              title={c.yours ? "Your reaction" : "Their reaction"}
              className={`rounded-full border px-1.5 py-0.5 text-sm leading-none ${c.yours ? "border-gold bg-gold/10" : "border-line bg-card"}`}
            >
              {c.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
