import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { revealScrollbar } from "../lib/scroll";
import { useStreamEvent } from "../context/StreamContext";
import { useAuth } from "../context/AuthContext";
import ChatComposer from "./ChatComposer";
import { GIFT_EMOJI, GIFT_LABELS } from "../lib/labels";
import type { GiftKey, Message } from "../lib/types";

interface Props {
  matchId: string;
  /** Lets the surrounding list refresh its previews and unread counts. */
  onActivity?: () => void;
}

export default function ChatThread({ matchId, onActivity }: Props) {
  const { userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activity = useRef(onActivity);
  activity.current = onActivity;

  const reload = useCallback(async () => {
    try {
      setMessages(await api.getMessages(matchId));
      activity.current?.();
    } catch {
      // a dropped request will be corrected by the next pushed event
    }
  }, [matchId]);

  useEffect(() => {
    setMessages([]);
    reload();
    api.markConversationRead(matchId).then(() => activity.current?.()).catch(() => {});

    // Tell the server this thread is on screen so it stops notifying about it, and say so again
    // if the tab is hidden and later refocused.
    api.startReading(matchId).catch(() => {});
    function onVisibility() {
      if (document.visibilityState === "visible") {
        api.startReading(matchId).catch(() => {});
      } else {
        api.stopReading().catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      api.stopReading().catch(() => {});
    };
  }, [matchId, reload]);

  // Pushed from the server the instant the other person sends something.
  useStreamEvent((event) => {
    if (event.type === "MESSAGE" || event.type === "GIFT") {
      reload();
    }
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.length > 0) {
      // Anything arriving while the thread is open counts as read.
      api.markConversationRead(matchId).catch(() => {});
    }
  }, [matchId, messages.length]);

  async function handleSend(payload: {
    content?: string;
    type?: "TEXT" | "WINK" | "GIFT";
    gift?: GiftKey;
  }) {
    const sent = await api.sendMessage(matchId, payload);
    setMessages((prev) => [...prev, sent]);
    onActivity?.();
  }

  return (
    <div className="flex h-full flex-col">
      <div onScroll={revealScrollbar} className="thin-scroll flex-1 space-y-3 overflow-y-auto px-1 pb-4">
        {messages.length === 0 && (
          <p className="py-16 text-center font-display text-2xl text-muted">Say something first.</p>
        )}

        {messages.map((m) => {
          const mine = m.senderId === userId;

          if (m.type === "WINK") {
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="flex items-center gap-2 rounded-full border border-line bg-white/70 px-4 py-2 text-sm text-muted">
                  <span className="text-lg">😉</span>
                  {mine ? "You sent a wink" : "Sent you a wink"}
                </div>
              </div>
            );
          }

          if (m.type === "GIFT" && m.gift) {
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[75%] rounded-2xl border border-gold/40 bg-gold/10 px-6 py-4 text-center">
                  <span className="block text-4xl">{GIFT_EMOJI[m.gift]}</span>
                  <span className="mt-1.5 block font-display text-lg">
                    {mine ? "You sent" : "They sent you"} {GIFT_LABELS[m.gift]?.toLowerCase()}
                  </span>
                  {m.content && <span className="mt-1.5 block text-sm text-muted">{m.content}</span>}
                </div>
              </div>
            );
          }

          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] px-5 py-3 leading-relaxed ${
                  mine
                    ? "rounded-[1.5rem_1.5rem_0.35rem_1.5rem] bg-ink text-canvas"
                    : "rounded-[1.5rem_1.5rem_1.5rem_0.35rem] border border-line bg-card text-ink"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <ChatComposer matchId={matchId} onSend={handleSend} />
    </div>
  );
}
