import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { rememberHidden } from "../lib/adMemory";
import { revealScrollbar } from "../lib/scroll";
import { useStreamEvent } from "../context/StreamContext";
import { tintFor } from "../lib/avatar";
import ChatThread from "../components/ChatThread";
import { lastActiveLabel } from "../lib/lastActive";
import { SponsoredListRow } from "../components/SponsoredSlot";
import { GIFT_EMOJI, GIFT_LABELS } from "../lib/labels";
import type { Conversation, Message, ServedAd } from "../lib/types";

function shortAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function preview(message: Message | null, mine: boolean): string {
  if (!message) return "You matched. Say something.";
  const who = mine ? "You" : "They";
  if (message.type === "WINK") return `${who} sent a wink`;
  if (message.type === "GIFT" && message.gift) {
    return `${who} sent ${(GIFT_LABELS[message.gift] ?? "a gift").toLowerCase()}`;
  }
  if (message.type === "IMAGE") return `${who} sent a picture`;
  return message.content;
}

export default function MessagesPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const myId = localStorage.getItem("dd_user_id");
  // Sponsored rows between conversations. Asked for once, and only when the list is long enough to show them: asking is
  // what counts an ad as shown.
  const [ads, setAds] = useState<ServedAd[]>([]);
  const adsAsked = useRef(false);

  const load = useCallback(() => {
    api.getConversations().then(setConversations).catch(() => setConversations([]));
  }, []);

  useEffect(load, [load]);
  useStreamEvent(load);
  // "Active 5 min ago" in the header goes stale on its own: read it again every couple of minutes while the page is open and visible.
  useEffect(() => {
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 120_000);
    return () => clearInterval(tick);
  }, [load]);

  // The server decides how many rows there are room for and where each goes (the admin's settings), from the number of conversations.
  const conversationCount = conversations?.length ?? 0;
  useEffect(() => {
    if (conversationCount === 0 || adsAsked.current) return;
    adsAsked.current = true;
    api.getAds("MESSAGES", 1, conversationCount).then(setAds).catch(() => {});
  }, [conversationCount]);

  const active = conversations?.find((c) => c.matchId === matchId);

  function hideAd(id: string) {
    rememberHidden(id);
    setAds((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="rise mb-5 shrink-0">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Messages</p>
        <h1 className="mt-2 font-display text-4xl font-medium leading-tight">
          Quiet <span className="gold-text italic">conversations.</span>
        </h1>
      </header>

      {conversations !== null && conversations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white/50 px-6 py-16 text-center">
          <p className="font-display text-2xl">No conversations yet.</p>
          <p className="mt-2 text-sm text-muted">
            Once someone likes you back, your conversation opens here.
          </p>
          <Link
            to="/discover"
            className="mt-8 inline-block rounded-full bg-ink px-8 py-3 font-medium text-canvas transition hover:-translate-y-0.5 hover:bg-gold"
          >
            Browse Discover
          </Link>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-5 md:grid-cols-[19rem_minmax(0,1fr)]">
          {/* On a phone only one pane shows at a time: the list, or the open thread. */}
          <aside className={`${matchId ? "hidden md:block" : "block"} min-h-0 min-w-0`}>
            <ul onScroll={revealScrollbar} className="thin-scroll max-h-full overflow-y-auto rounded-3xl border border-line bg-card shadow-[0_30px_60px_-40px_rgba(120,80,30,0.4)]">
              {conversations === null ? (
                <li className="px-4 py-8 text-center text-sm text-muted">Loading...</li>
              ) : (
                conversations.flatMap((c, index) => {
                  const photo = c.otherUser.photos.find((p) => p.primary) ?? c.otherUser.photos[0];
                  const mine = c.lastMessage?.senderId === myId;
                  const unread = c.unreadCount > 0;
                  const selected = c.matchId === matchId;
                  const ad = ads.find((a) => a.position === index);
                  const row = (
                    <li key={c.matchId} className="border-b border-line/70 last:border-b-0">
                      <button
                        onClick={() => navigate(`/messages/${c.matchId}`)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                          selected ? "bg-ink/5" : unread ? "bg-gold/5 hover:bg-white" : "hover:bg-white"
                        }`}
                      >
                        <span
                          className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-display text-base font-medium text-white/90 ${tintFor(
                            c.otherUser.pseudonym,
                          )}`}
                        >
                          {photo ? (
                            <img src={photo.url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            c.otherUser.pseudonym.charAt(0).toUpperCase()
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate font-display text-lg font-medium">
                              {c.otherUser.pseudonym}
                            </span>
                            {c.lastMessage && (
                              <span className="shrink-0 text-[11px] text-muted">
                                {shortAgo(c.lastMessage.createdAt)}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5">
                            {c.lastMessage?.type === "GIFT" && c.lastMessage.gift && (
                              <span className="text-xs">{GIFT_EMOJI[c.lastMessage.gift]}</span>
                            )}
                            <span
                              className={`truncate text-xs ${
                                unread ? "font-medium text-ink" : "text-muted"
                              }`}
                            >
                              {preview(c.lastMessage, mine)}
                            </span>
                          </span>
                        </span>

                        {unread && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-semibold text-white">
                            {c.unreadCount}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                  return ad
                    ? [
                        row,
                        <li key={`ad-${ad.id}`} className="border-b border-line/70">
                          <SponsoredListRow ad={ad} onHide={() => hideAd(ad.id)} />
                        </li>,
                      ]
                    : [row];
                })
              )}
            </ul>
          </aside>

          <section
            className={`${matchId ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col rounded-3xl border border-line bg-card p-4 sm:p-5 shadow-[0_30px_60px_-40px_rgba(120,80,30,0.4)]`}
          >
            {matchId ? (
              <>
                <div className="mb-3 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line/70 pb-3">
                  <button
                    onClick={() => navigate("/messages")}
                    className="text-sm text-muted transition hover:text-ink md:hidden"
                  >
                    ←
                  </button>
                  {active && (
                    <>
                      <Link
                        to={`/u/${active.otherUser.userId}`}
                        className="font-display text-xl font-medium hover:underline"
                      >
                        {active.otherUser.pseudonym}
                      </Link>
                      <span className="text-xs text-muted">{active.otherUser.city}</span>
                      {lastActiveLabel(active.otherUser.lastActiveAt) && (
                        <span
                          className={`text-xs ${
                            lastActiveLabel(active.otherUser.lastActiveAt) === "Active now" ? "text-gold" : "text-muted"
                          }`}
                        >
                          · {lastActiveLabel(active.otherUser.lastActiveAt)}
                        </span>
                      )}
                    </>
                  )}
                  <span className="basis-full text-[11px] text-muted sm:ml-auto sm:basis-auto">
                    Messages stay between the two of you.
                  </span>
                </div>
                <div className="min-h-0 flex-1">
                  <ChatThread matchId={matchId} onActivity={load} />
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="font-display text-2xl text-muted">Pick a conversation.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
