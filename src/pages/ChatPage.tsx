import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Message } from "../lib/types";

const POLL_INTERVAL_MS = 4000;

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;

    async function poll() {
      try {
        const data = await api.getMessages(matchId!);
        if (!cancelled) setMessages(data);
      } catch {
        // transient errors are fine to skip on a polling loop
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !matchId) return;
    const content = draft;
    setDraft("");
    const sent = await api.sendMessage(matchId, content);
    setMessages((prev) => [...prev, sent]);
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto pb-4">
        {messages.map((m) => {
          const mine = m.senderId === userId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  mine
                    ? "bg-accent text-ink"
                    : "border border-border bg-surface text-text"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2 border-t border-border pt-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-accent px-5 py-2.5 font-medium text-ink transition hover:bg-accent-soft"
        >
          Send
        </button>
      </form>
    </div>
  );
}
