import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useStreamEvent } from "../context/StreamContext";
import type { AppNotification } from "../lib/types";

const ICONS: Record<string, string> = {
  LIKE_RECEIVED: "♥",
  MATCH: "✦",
  MESSAGE: "✉",
  GIFT: "🎁",
  PHOTO_ACCESS_REQUESTED: "👁",
  PHOTO_ACCESS_GRANTED: "🔓",
};

function shortAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const refresh = useCallback(
    () => api.getUnreadNotificationCount().then(setUnread).catch(() => setUnread(0)),
    [],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Arrives the moment the server has something to say.
  useStreamEvent(refresh);

  useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setItems(null);
    try {
      setItems(await api.getNotifications());
      await api.markNotificationsRead();
      setUnread(0);
    } catch {
      setItems([]);
    }
  }

  return (
    <div ref={wrapper} className="relative">
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white/60 text-muted transition hover:border-gold hover:text-ink"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4.5 w-4.5">
          <path
            d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-line bg-card shadow-[0_30px_60px_-24px_rgba(120,80,30,0.5)]">
          <p className="border-b border-line/70 px-4 py-3 font-display text-lg">Notifications</p>
          {items === null ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Loading...</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Nothing yet.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      setOpen(false);
                      if (n.link) navigate(n.link);
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white ${
                      n.read ? "" : "bg-gold/5"
                    }`}
                  >
                    <span className="mt-0.5 text-sm text-gold">{ICONS[n.type] ?? "•"}</span>
                    <span className="min-w-0 flex-1 text-sm leading-snug">{n.message}</span>
                    <span className="shrink-0 text-xs text-muted">{shortAgo(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
