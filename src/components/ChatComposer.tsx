import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import type { GiftKey, GiftOption } from "../lib/types";

const EMOJI = [
  "😊", "😉", "😍", "🥰", "😘", "😏", "🙈", "😁",
  "😅", "🤗", "🤔", "😴", "🙃", "😌", "😎", "🥂",
  "❤️", "🔥", "✨", "💫", "🌙", "☕", "🌹", "💐",
];

interface Props {
  matchId: string;
  onSend: (payload: { content?: string; type?: "TEXT" | "WINK" | "GIFT"; gift?: GiftKey }) => Promise<void>;
}

export default function ChatComposer({ matchId, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const [tray, setTray] = useState<"none" | "emoji" | "gift">("none");
  const [gifts, setGifts] = useState<GiftOption[]>([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getGiftCatalogue(matchId).then(setGifts).catch(() => setGifts([]));
  }, [matchId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    const content = draft;
    setDraft("");
    setSending(true);
    try {
      await onSend({ content, type: "TEXT" });
    } finally {
      setSending(false);
    }
  }

  async function sendWink() {
    if (sending) return;
    setSending(true);
    setTray("none");
    try {
      await onSend({ type: "WINK" });
    } finally {
      setSending(false);
    }
  }

  async function sendGift(gift: GiftKey) {
    if (sending) return;
    const note = draft.trim();
    setDraft("");
    setSending(true);
    setTray("none");
    try {
      await onSend({ type: "GIFT", gift, content: note || undefined });
    } finally {
      setSending(false);
    }
  }

  function addEmoji(e: string) {
    setDraft((d) => d + e);
    inputRef.current?.focus();
  }

  return (
    <div className="border-t border-line pt-4">
      {tray === "emoji" && (
        <div className="mb-3 grid grid-cols-8 gap-1 rounded-2xl border border-line bg-card p-3">
          {EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => addEmoji(e)}
              className="rounded-lg py-1.5 text-xl transition hover:bg-canvas"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {tray === "gift" && (
        <div className="mb-3 rounded-2xl border border-line bg-card p-3">
          <p className="mb-2 px-1 text-xs text-muted">
            Gifts are free while Privlee is in testing. Anything typed below is sent as a note.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {gifts.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => sendGift(g.key)}
                disabled={sending}
                className="flex flex-col items-center gap-1 rounded-xl border border-line bg-white/70 px-2 py-3 transition hover:border-gold hover:bg-white disabled:opacity-50"
              >
                <span className="text-2xl">{g.emoji}</span>
                <span className="text-[11px] leading-tight">{g.label}</span>
                <span className="text-[10px] text-gold">{g.cost} credits</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTray((t) => (t === "emoji" ? "none" : "emoji"))}
          aria-label="Emoji"
          title="Emoji"
          className={`shrink-0 rounded-full border px-3 py-2.5 text-lg leading-none transition ${
            tray === "emoji" ? "border-gold bg-gold/10" : "border-line bg-white/70 hover:border-gold"
          }`}
        >
          🙂
        </button>
        <button
          type="button"
          onClick={() => setTray((t) => (t === "gift" ? "none" : "gift"))}
          aria-label="Send a gift"
          title="Send a gift"
          className={`shrink-0 rounded-full border px-3 py-2.5 text-lg leading-none transition ${
            tray === "gift" ? "border-gold bg-gold/10" : "border-line bg-white/70 hover:border-gold"
          }`}
        >
          🎁
        </button>
        <button
          type="button"
          onClick={sendWink}
          disabled={sending}
          aria-label="Send a wink"
          title="Send a wink"
          className="shrink-0 rounded-full border border-line bg-white/70 px-3 py-2.5 text-lg leading-none transition hover:border-gold disabled:opacity-50"
        >
          😉
        </button>

        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          className="min-w-0 flex-1 rounded-full border border-line bg-white/70 px-5 py-3 text-ink placeholder:text-[#a79d8d] outline-none transition focus:border-gold focus:bg-white focus:ring-4 focus:ring-gold/15"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="group relative shrink-0 overflow-hidden rounded-full bg-ink px-7 py-3 font-medium text-canvas transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <span className="relative z-10">Send</span>
          <span className="absolute inset-0 -translate-x-full bg-gold transition-transform duration-500 ease-out group-hover:translate-x-0" />
        </button>
      </form>
    </div>
  );
}
