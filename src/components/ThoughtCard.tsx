import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { tintFor } from "../lib/avatar";
import { paidLikeQuestion } from "../lib/useLikeAllowance";
import type { LikeAllowance, Thought, ThoughtAuthor, ThoughtComment } from "../lib/types";
import ThoughtReportDialog from "./ThoughtReportDialog";

/** "just now", "5 min", "3 h", "2 d": thoughts are short-lived, so a rough age is enough. */
export function age(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min`;
  if (mins < 60 * 48) return `${Math.round(mins / 60)} h`;
  return `${Math.round(mins / 1440)} d`;
}

/**
 * Comments in reading order: each top-level comment, then every reply in its thread under it, oldest first. A reply to a reply stays in
 * the same thread. Each reply comes with the comment it answers, so the screen can say so.
 */
export function threaded(all: ThoughtComment[]): { comment: ThoughtComment; parent: ThoughtComment | null }[] {
  const byId = new Map(all.map((c) => [c.id, c]));
  const rootOf = (c: ThoughtComment): string => {
    let cur = c;
    for (let i = 0; i < 50 && cur.parentId && byId.has(cur.parentId); i++) cur = byId.get(cur.parentId)!;
    return cur.id;
  };
  const sorted = [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const roots = sorted.filter((c) => !c.parentId || !byId.has(c.parentId));
  return roots.flatMap((r) => [
    { comment: r, parent: null },
    ...sorted.filter((c) => c.id !== r.id && rootOf(c) === r.id).map((c) => ({ comment: c, parent: byId.get(c.parentId!) ?? null })),
  ]);
}

export function Avatar({ author, size = 40 }: { author: ThoughtAuthor; size?: number }) {
  const style = { width: size, height: size };
  return author.photo ? (
    <img src={author.photo.url} alt="" style={style} className="shrink-0 rounded-full border border-line object-cover" />
  ) : (
    <span
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${tintFor(author.pseudonym)} font-display text-lg text-white`}
    >
      {author.pseudonym.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function Name({ author }: { author: ThoughtAuthor }) {
  return author.you ? (
    <span className="font-medium">You</span>
  ) : (
    <Link to={`/u/${author.userId}`} className="font-medium hover:underline">
      {author.pseudonym}
    </Link>
  );
}

/**
 * Like and Message for the person behind a thought or comment, with the same rules as everywhere: a paid like asks first, and a
 * message to someone you are not matched with goes through their profile, where the price is shown.
 */
export function Connect({ author, allowance, compact = false }: { author: ThoughtAuthor; allowance: LikeAllowance | null; compact?: boolean }) {
  const navigate = useNavigate();
  const [relation, setRelation] = useState(author.relation);
  const [matchId, setMatchId] = useState(author.matchId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (author.you) return null;

  async function like() {
    const question = paidLikeQuestion(allowance);
    if (question && !window.confirm(question)) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.like(author.userId);
      if (result.matched || result.matchId) {
        setRelation("MATCHED");
        setMatchId(result.matchId ?? null);
      } else {
        setRelation("LIKED");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "That like didn't go through.");
    } finally {
      setBusy(false);
    }
  }

  function message() {
    if (relation === "MATCHED" && matchId) navigate(`/messages/${matchId}`, { state: { focusComposer: true } });
    else navigate(`/u/${author.userId}`);
  }

  const base = compact ? "text-xs hover:text-ink" : "rounded-full border border-line bg-white/60 px-4 py-1.5 text-sm transition hover:border-gold";
  return (
    <span className={`inline-flex flex-wrap items-center ${compact ? "gap-3" : "gap-2"}`}>
      {relation === "NONE" ? (
        <button onClick={like} disabled={busy} className={`${base} disabled:opacity-50`}>
          ♥ Like
        </button>
      ) : relation === "LIKED" ? (
        <span className={compact ? "text-xs text-gold" : "px-2 text-sm text-gold"}>♥ Liked</span>
      ) : null}
      <button onClick={message} className={base}>
        Message
      </button>
      {error && <span className="basis-full text-xs text-danger">{error}</span>}
    </span>
  );
}

interface Props {
  thought: Thought;
  onChange: (t: Thought) => void;
  onDeleted: (id: string) => void;
  /** Today's like allowance, so a paid like can ask first. */
  allowance?: LikeAllowance | null;
  /** On the thread page: the thought is shown large and its replies come below as {@code children}. */
  thread?: boolean;
  children?: ReactNode;
}

/**
 * A thought. In the feed, comments open on their own page (like a thread), so the feed never grows a reply box. On the thread page the
 * replies are passed in as children.
 */
export default function ThoughtCard({ thought, onChange, onDeleted, allowance = null, thread = false, children }: Props) {
  const navigate = useNavigate();
  const [reporting, setReporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menu, setMenu] = useState(false);
  const open = () => navigate(`/thoughts/${thought.id}`);

  async function heart() {
    try {
      onChange(await api.heartThought(thought.id, !thought.hearted));
    } catch {
      /* the thought may have just expired or been removed; the next refresh drops it */
    }
  }

  async function removeThought() {
    try {
      await api.deleteThought(thought.id);
      onDeleted(thought.id);
    } catch {
      setConfirmDelete(false);
    }
  }

  if (!thread) {
    // In the feed: a flat row with the avatar beside it, like a thread, not a card.
    return (
      <article className="flex gap-3 border-b border-line px-1 py-4">
        <Avatar author={thought.author} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <Name author={thought.author} />
            <span className="text-xs text-muted">
              {age(thought.createdAt)}
              {thought.visibility === "PUBLIC" ? "" : " · Matches only"}
            </span>
            <span className="relative ml-auto">
              <button onClick={() => setMenu((m) => !m)} aria-label="More" className="rounded-full px-2 py-0.5 text-lg leading-none text-muted hover:bg-white/70 hover:text-ink">
                ···
              </button>
              {menu && (
                <span className="absolute right-0 top-8 z-10 w-36 overflow-hidden rounded-xl border border-line bg-card text-sm shadow-lg">
                  {thought.mine ? (
                    confirmDelete ? (
                      <span className="flex items-center justify-between px-4 py-2.5">
                        <button onClick={removeThought} className="font-medium text-danger">
                          Delete it
                        </button>
                        <button onClick={() => setConfirmDelete(false)} className="text-muted">
                          Keep
                        </button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDelete(true)} className="block w-full px-4 py-2.5 text-left text-danger hover:bg-white">
                        Delete
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => {
                        setMenu(false);
                        setReporting(true);
                      }}
                      className="block w-full px-4 py-2.5 text-left hover:bg-white"
                    >
                      Report
                    </button>
                  )}
                </span>
              )}
            </span>
          </div>
          <p onClick={open} className="mt-1 cursor-pointer whitespace-pre-wrap break-words text-[16px] leading-relaxed">
            {thought.body}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
            <button onClick={heart} aria-pressed={thought.hearted} className={`inline-flex items-center gap-1.5 transition ${thought.hearted ? "text-danger" : "hover:text-ink"}`}>
              <span aria-hidden>{thought.hearted ? "♥" : "♡"}</span>
              {thought.hearts > 0 ? thought.hearts : ""} <span className="sr-only">heart</span>
            </button>
            <button onClick={open} className="inline-flex items-center gap-1.5 transition hover:text-ink">
              <span aria-hidden>💬</span>
              {thought.comments > 0 ? thought.comments : ""} <span className="sr-only">comments</span>
            </button>
            {!thought.mine && <Connect author={thought.author} allowance={allowance} compact />}
          </div>
        </div>
        {reporting && <ThoughtReportDialog thoughtId={thought.id} onClose={() => setReporting(false)} />}
      </article>
    );
  }

  return (
    <article className="rounded-3xl border border-line bg-card p-5 shadow-[0_30px_60px_-40px_rgba(120,80,30,0.4)]">
      <header className="flex items-center gap-3">
        <Avatar author={thought.author} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            <Name author={thought.author} />
          </p>
          <p className="text-xs text-muted">
            {age(thought.createdAt)} · {thought.visibility === "PUBLIC" ? "Public" : "Matches only"}
          </p>
        </div>
        {thought.mine ? (
          confirmDelete ? (
            <span className="flex items-center gap-2 text-xs">
              <button onClick={removeThought} className="font-medium text-danger">
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-muted">
                Keep
              </button>
            </span>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-muted hover:text-danger">
              Delete
            </button>
          )
        ) : (
          <button onClick={() => setReporting(true)} className="text-xs text-muted hover:text-ink">
            Report
          </button>
        )}
      </header>

      <p
        onClick={thread ? undefined : open}
        className={`mt-4 whitespace-pre-wrap break-words leading-relaxed ${thread ? "text-xl" : "cursor-pointer text-[17px]"}`}
      >
        {thought.body}
      </p>

      <footer className="mt-4 flex items-center gap-5 text-sm text-muted">
        <button onClick={heart} aria-pressed={thought.hearted} className={`inline-flex items-center gap-1.5 transition ${thought.hearted ? "text-danger" : "hover:text-ink"}`}>
          <span aria-hidden>{thought.hearted ? "♥" : "♡"}</span>
          {thought.hearts > 0 ? thought.hearts : ""} <span className="sr-only">heart</span>
        </button>
        {thread ? (
          <span>{thought.comments > 0 ? `${thought.comments} ${thought.comments === 1 ? "reply" : "replies"}` : "No replies yet"}</span>
        ) : (
          <button onClick={open} className="transition hover:text-ink">
            {thought.comments > 0 ? `${thought.comments} ${thought.comments === 1 ? "comment" : "comments"}` : "Comment"}
          </button>
        )}
        {!thought.mine && (
          <span className="ml-auto">
            <Connect author={thought.author} allowance={allowance} />
          </span>
        )}
      </footer>

      {children}

      {reporting && <ThoughtReportDialog thoughtId={thought.id} onClose={() => setReporting(false)} />}
    </article>
  );
}
