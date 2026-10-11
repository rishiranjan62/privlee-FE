import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { revealScrollbar } from "../lib/scroll";
import { useStreamEvent } from "../context/StreamContext";
import { useAuth } from "../context/AuthContext";
import ChatComposer from "./ChatComposer";
import ChatPicture from "./ChatPicture";
import MessageReactions from "./MessageReactions";
import ReplyQuote from "./ReplyQuote";
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
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
        api.stopReading(matchId).catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    // The server only believes "this is open" for 90 seconds at a time, so a closed tab or a lost connection can never
    // leave it stuck - say so again every half minute for as long as the thread stays on screen.
    const renew = window.setInterval(() => {
      if (document.visibilityState === "visible") api.startReading(matchId).catch(() => {});
    }, 30_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(renew);
      api.stopReading(matchId).catch(() => {});
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
      // Anything arriving while the thread is open counts as read - and the inbox and the header badge, which were
      // counted when it arrived and so still show it as new, are told to look again.
      api.markConversationRead(matchId).then(() => activity.current?.()).catch(() => {});
    }
  }, [matchId, messages.length]);

  async function handleSend(payload: {
    content?: string;
    type?: "TEXT" | "WINK" | "GIFT";
    gift?: GiftKey;
  }) {
    const sent = await api.sendMessage(matchId, { ...payload, replyToId: replyingTo?.id });
    setMessages((prev) => [...prev, sent]);
    setReplyingTo(null);
    onActivity?.();
  }

  /** Scrolls to the message a reply quotes and lights it up for a moment. */
  function jumpTo(id: string) {
    const row = document.getElementById(`msg-${id}`);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.add("quote-flash");
    window.setTimeout(() => row.classList.remove("quote-flash"), 1400);
  }

  /** Leaves or takes back a reaction. Shown at once; put right if the server says no. */
  async function handleReact(m: Message, emoji: string | null) {
    const previous = m.myReaction ?? null;
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, myReaction: emoji } : x)));
    try {
      const updated = await api.reactToMessage(matchId, m.id, emoji);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...updated, imageUrl: x.imageUrl ?? updated.imageUrl } : x)));
    } catch {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, myReaction: previous } : x)));
    }
  }

  function renderBody(m: Message, mine: boolean) {
    const quote = m.replyTo ? (
      <ReplyQuote preview={m.replyTo} tone={mine && m.type === "TEXT" ? "dark" : "light"} onJump={() => jumpTo(m.replyTo!.id)} />
    ) : null;
    // A text carries its quote inside the bubble; a picture, gift or wink carries it just above.
    const withQuote = (body: React.ReactNode) =>
      quote ? (
        <div className={`flex max-w-full flex-col ${mine ? "items-end" : "items-start"}`}>
          {quote}
          {body}
        </div>
      ) : (
        body
      );
    if (m.type === "WINK") {
      return withQuote(
        <div className="flex items-center gap-2 rounded-full border border-line bg-white/70 px-4 py-2 text-sm text-muted">
          <span className="text-lg">😉</span>
          {mine ? "You sent a wink" : "Sent you a wink"}
        </div>,
      );
    }
    if (m.type === "IMAGE") {
      return withQuote(
        m.imageUrl ? (
          <ChatPicture src={m.imageUrl} />
        ) : (
          <div className="rounded-2xl border border-line bg-card px-5 py-3 text-sm text-muted">A picture</div>
        ),
      );
    }
    if (m.type === "GIFT" && m.gift) {
      return withQuote(
        <div className="rounded-2xl border border-gold/40 bg-gold/10 px-6 py-4 text-center">
          <span className="block text-4xl">{GIFT_EMOJI[m.gift]}</span>
          <span className="mt-1.5 block font-display text-lg">
            {mine ? "You sent" : "They sent you"} {GIFT_LABELS[m.gift]?.toLowerCase()}
          </span>
          {m.content && <span className="mt-1.5 block text-sm text-muted">{m.content}</span>}
        </div>,
      );
    }
    return (
      <div
        className={`break-words px-5 py-3 leading-relaxed [overflow-wrap:anywhere] ${
          mine
            ? "rounded-[1.5rem_1.5rem_0.35rem_1.5rem] bg-ink text-canvas"
            : "rounded-[1.5rem_1.5rem_1.5rem_0.35rem] border border-line bg-card text-ink"
        }`}
      >
        {quote}
        {m.content}
      </div>
    );
  }

  async function handleSendImage(file: File) {
    const sent = await api.sendImage(matchId, file, replyingTo?.id);
    setMessages((prev) => [...prev, sent]);
    setReplyingTo(null);
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
          return (
            <div key={m.id} id={`msg-${m.id}`} className={`flex rounded-2xl ${mine ? "justify-end" : "justify-start"}`}>
              <MessageReactions
                message={m}
                mine={mine}
                onReact={(emoji) => handleReact(m, emoji)}
                onReply={() => setReplyingTo(m)}
              >
                {renderBody(m, mine)}
              </MessageReactions>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <ChatComposer
        matchId={matchId}
        onSend={handleSend}
        onSendImage={handleSendImage}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
}
