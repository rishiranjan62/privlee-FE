import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { tintFor } from "../lib/avatar";
import { pillClass } from "../lib/ui";
import type { Thought, ThoughtTab, ThoughtVisibility, ThoughtsConfig } from "../lib/types";
import ThoughtCard from "../components/ThoughtCard";
import Portal from "../components/Portal";
import { useLikeAllowance } from "../lib/useLikeAllowance";

const TABS: { value: ThoughtTab; label: string; empty: string }[] = [
  { value: "PUBLIC", label: "Everyone", empty: "Nothing shared publicly right now. Be the first." },
  { value: "MATCHES", label: "Matches", empty: "Your matches haven't shared anything yet." },
  { value: "MINE", label: "Yours", empty: "You haven't shared anything. What's on your mind?" },
];

export default function ThoughtsPage() {
  const allowance = useLikeAllowance();
  const [config, setConfig] = useState<ThoughtsConfig | null>(null);
  const [me, setMe] = useState("");
  const [tab, setTab] = useState<ThoughtTab>("PUBLIC");
  const [items, setItems] = useState<Thought[] | null>(null);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    api.getThoughtsConfig().then(setConfig).catch(() => setConfig({ enabled: false, canPost: false, cannotPostReason: null, expireDays: 7, maxChars: 280 }));
    api.getMyProfile().then((p) => setMe(p.pseudonym)).catch(() => {});
  }, []);

  const load = useCallback(async (t: ThoughtTab) => {
    setItems(null);
    try {
      const page = await api.getThoughts(t);
      setItems(page);
      setMore(page.length >= 20);
    } catch {
      setItems([]);
      setMore(false);
    }
  }, []);

  useEffect(() => {
    if (config?.enabled) void load(tab);
  }, [config?.enabled, tab, load]);

  async function loadMore() {
    if (!items || items.length === 0) return;
    setLoadingMore(true);
    try {
      const page = await api.getThoughts(tab, items[items.length - 1].createdAt);
      setItems([...items, ...page]);
      setMore(page.length >= 20);
    } finally {
      setLoadingMore(false);
    }
  }

  function replace(t: Thought) {
    setItems((prev) => (prev ?? []).map((x) => (x.id === t.id ? t : x)));
  }

  if (config === null) return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  if (!config.enabled) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-3xl">Not available yet</p>
        <p className="mt-3 text-sm text-muted">This part of Privlee isn't open yet. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="rise mb-5 font-display text-4xl font-medium">Thoughts</h1>

      {/* "What's new?": the way in to writing a thought, in a window of its own. */}
      <button
        onClick={() => config.canPost && setWriting(true)}
        disabled={!config.canPost}
        className="flex w-full items-center gap-3 border-y border-line px-1 py-4 text-left disabled:cursor-default"
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${tintFor(me || "You")} font-display text-lg text-white`}>
          {(me || "You").slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium">{me || "You"}</span>
          <span className="block truncate text-sm text-muted">{config.canPost ? "What's new?" : config.cannotPostReason ?? "You can't share thoughts right now."}</span>
        </span>
      </button>

      <div className="grid grid-cols-3 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`border-b-2 py-3 text-sm transition ${tab === t.value ? "border-ink font-medium text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {items === null ? (
        <p className="py-10 text-center text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{TABS.find((t) => t.value === tab)?.empty}</p>
      ) : (
        <div>
          {items.map((t) => (
            <ThoughtCard key={t.id} thought={t} allowance={allowance} onChange={replace} onDeleted={(id) => setItems((prev) => (prev ?? []).filter((x) => x.id !== id))} />
          ))}
        </div>
      )}

      {more && (
        <div className="mt-6 text-center">
          <button onClick={loadMore} disabled={loadingMore} className="rounded-full border border-line bg-white/60 px-6 py-2.5 text-sm transition hover:border-gold disabled:opacity-50">
            {loadingMore ? "Loading…" : "Show more"}
          </button>
        </div>
      )}

      {writing && (
        <NewThought
          config={config}
          me={me}
          onClose={() => setWriting(false)}
          onShared={(t) => {
            setWriting(false);
            const next: ThoughtTab = t.visibility === "PUBLIC" ? "PUBLIC" : "MATCHES";
            if (next === tab) void load(next);
            else setTab(next);
          }}
        />
      )}
    </div>
  );
}

/** Writing a thought, in a window of its own: Cancel and Post, your name, a plain box, and who can see it. */
function NewThought({ config, me, onClose, onShared }: { config: ThoughtsConfig; me: string; onClose: () => void; onShared: (t: Thought) => void }) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<ThoughtVisibility>("MATCHES");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setSending(true);
    setError(null);
    try {
      onShared(await api.createThought(body.trim(), visibility));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not share your thought");
      setSending(false);
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-10 backdrop-blur-sm" onClick={onClose}>
        <div className="w-full max-w-xl rounded-3xl border border-line bg-card shadow-[0_40px_80px_-30px_rgba(29,26,22,0.5)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <button onClick={onClose} className="text-sm text-gold hover:underline">
              Cancel
            </button>
            <h2 className="font-display text-xl">New thought</h2>
            <span className="w-12" />
          </div>
          <div className="flex gap-3 px-5 py-5">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${tintFor(me || "You")} font-display text-lg text-white`}>
              {(me || "You").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{me || "You"}</p>
              <textarea
                autoFocus
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={config.maxChars}
                rows={5}
                placeholder="What's new?"
                className="mt-1 w-full resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-muted"
              />
              <p className="text-right text-xs tabular-nums text-muted">
                {body.length}/{config.maxChars}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Keep it free of names, workplaces, neighbourhoods and phone numbers: anything that could point to you. It disappears after {config.expireDays} days.
              </p>
              {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
            <div className="flex gap-2">
              <button type="button" onClick={() => setVisibility("MATCHES")} className={pillClass(visibility === "MATCHES")}>
                Matches only
              </button>
              <button type="button" onClick={() => setVisibility("PUBLIC")} className={pillClass(visibility === "PUBLIC")}>
                Everyone
              </button>
            </div>
            <button onClick={share} disabled={sending || !body.trim()} className="rounded-full border border-ink bg-ink px-6 py-2 text-sm font-medium text-canvas transition hover:border-gold hover:bg-gold disabled:opacity-40">
              {sending ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
