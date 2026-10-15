import { useEffect, useRef, useState, type ReactNode } from "react";
import { REACTIONS, type Message } from "../lib/types";

interface Props {
  message: Message;
  mine: boolean;
  /** Pass the emoji to leave it; null takes the reaction back. */
  onReact: (emoji: string | null) => void;
  /** Starts a reply to this message. */
  onReply: () => void;
  /** Deletes it: "me" for your own view, "everyone" (your own messages only) for both of you. */
  onDelete: (scope: "me" | "everyone") => void;
  /** Starts editing it. Only passed for a text message of your own. */
  onEdit?: () => void;
  /** Small print under the message: when it was sent. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Wraps one message with the ways to react to it: a small button beside it (always there on a touch screen, on hover
 * with a mouse) that opens the row of emotions, and a double-click as the quick heart. What has been left shows as
 * little chips underneath, yours highlighted.
 */
export default function MessageReactions({ message, mine, onReact, onReply, onDelete, onEdit, footer, children }: Props) {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  // Deleting for everyone cannot be undone, so it asks once more.
  const [confirming, setConfirming] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && !more) return;
    const away = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) {
        setOpen(false);
        setMore(false);
        setConfirming(false);
      }
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open, more]);

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
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit this message"
            title="Edit"
            className="shrink-0 rounded-full border border-line bg-white/80 px-2 py-1 text-sm leading-none opacity-0 transition hover:border-gold focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="React to this message"
          title="React"
          className="shrink-0 rounded-full border border-line bg-white/80 px-2 py-1 text-sm leading-none opacity-0 transition hover:border-gold focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60"
        >
          ☺
        </button>
        <button
          type="button"
          onClick={() => {
            setMore((m) => !m);
            setOpen(false);
            setConfirming(false);
          }}
          aria-label="Delete this message"
          title="Delete"
          className="shrink-0 rounded-full border border-line bg-white/80 px-2 py-1 text-sm leading-none opacity-0 transition hover:border-danger focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>

      {footer && <div className={`mt-0.5 px-2 text-[11px] text-muted ${mine ? "text-right" : "text-left"}`}>{footer}</div>}

      {more && (
        <div
          role="menu"
          className={`absolute top-full z-20 mt-1 flex min-w-[11rem] flex-col rounded-2xl border border-line bg-card py-1 text-sm shadow-[0_18px_36px_-18px_rgba(120,80,30,0.5)] ${
            mine ? "right-0" : "left-0"
          }`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMore(false);
              onDelete("me");
            }}
            className="px-4 py-2 text-left transition hover:bg-gold/10"
          >
            Delete for me
          </button>
          {mine && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (!confirming) return setConfirming(true);
                setMore(false);
                setConfirming(false);
                onDelete("everyone");
              }}
              className="px-4 py-2 text-left text-danger transition hover:bg-danger/10"
            >
              {confirming ? "Tap again to delete for everyone" : "Delete for everyone"}
            </button>
          )}
        </div>
      )}

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
