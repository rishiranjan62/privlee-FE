import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import type { LikeAllowance, Thought, ThoughtComment } from "../lib/types";
import { Avatar, Connect, Name, age, threaded } from "./ThoughtCard";
import ThoughtReportDialog from "./ThoughtReportDialog";

interface Props {
  thought: Thought;
  onChange: (t: Thought) => void;
  allowance?: LikeAllowance | null;
}

/** Each top-level comment with the replies in its thread under it. */
function groups(all: ThoughtComment[]): { root: ThoughtComment; replies: { comment: ThoughtComment; parent: ThoughtComment }[] }[] {
  const out: { root: ThoughtComment; replies: { comment: ThoughtComment; parent: ThoughtComment }[] }[] = [];
  for (const { comment, parent } of threaded(all)) {
    if (!parent) out.push({ root: comment, replies: [] });
    else out[out.length - 1]?.replies.push({ comment, parent });
  }
  return out;
}

/**
 * The replies to a thought, like a thread: each comment with its replies folded under "Show replies", and the reply box pinned to the
 * bottom of the screen so it is never hidden behind anything.
 */
export default function ThoughtReplies({ thought, onChange, allowance = null }: Props) {
  const [comments, setComments] = useState<ThoughtComment[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<ThoughtComment | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getThoughtComments(thought.id).then(setComments).catch(() => setComments([]));
  }, [thought.id]);

  const threads = useMemo(() => groups(comments ?? []), [comments]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  async function heart(c: ThoughtComment) {
    try {
      const updated = await api.heartThoughtComment(c.id, !c.hearted);
      setComments((prev) => (prev ?? []).map((x) => (x.id === updated.id ? updated : x)));
    } catch {
      /* already gone */
    }
  }

  async function remove(c: ThoughtComment) {
    try {
      await api.deleteThoughtComment(c.id);
      const gone = new Set((comments ?? []).filter((x) => x.id === c.id || x.parentId === c.id).map((x) => x.id));
      setComments((prev) => (prev ?? []).filter((x) => !gone.has(x.id)));
      onChange({ ...thought, comments: Math.max(0, thought.comments - gone.size) });
    } catch {
      /* already gone */
    }
  }

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      const created = await api.addThoughtComment(thought.id, body, replyTo?.id);
      const next = [...(comments ?? []), created];
      setComments(next);
      onChange({ ...thought, comments: thought.comments + 1 });
      // Open the thread the reply went into, so it is clear where it landed.
      const byId = new Map(next.map((c) => [c.id, c]));
      let cur: ThoughtComment | undefined = created;
      for (let i = 0; i < 50 && cur?.parentId && byId.has(cur.parentId); i++) cur = byId.get(cur.parentId);
      if (cur && cur.id !== created.id) setExpanded((prev) => new Set(prev).add(cur!.id));
      setText("");
      setReplyTo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post your reply");
    } finally {
      setSending(false);
    }
  }

  function row(c: ThoughtComment, answers: ThoughtComment | null) {
    return (
      <div className="flex gap-3">
        <Avatar author={c.author} size={34} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <Name author={c.author} />
            {c.author.userId === thought.author.userId && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">Author</span>}{" "}
            <span className="text-xs text-muted">{age(c.createdAt)}</span>
          </p>
          {answers && (
            <p className="truncate text-xs text-muted">
              ↳ {answers.author.you ? "you" : answers.author.pseudonym}: “{answers.body.length > 40 ? `${answers.body.slice(0, 40)}…` : answers.body}”
            </p>
          )}
          <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-snug">{c.body}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <button onClick={() => heart(c)} aria-pressed={c.hearted} className={`inline-flex items-center gap-1 transition ${c.hearted ? "text-danger" : "hover:text-ink"}`}>
              <span aria-hidden>{c.hearted ? "♥" : "♡"}</span>
              {c.hearts > 0 ? c.hearts : ""}
              <span className="sr-only">{c.hearted ? "Unlike" : "Like"}</span>
            </button>
            <button
              onClick={() => {
                setReplyTo(c);
                box.current?.focus();
              }}
              className="hover:text-ink"
            >
              Reply
            </button>
            {(c.mine || thought.mine) && (
              <button onClick={() => remove(c)} className="hover:text-danger">
                Delete
              </button>
            )}
            {!c.mine && <Connect author={c.author} allowance={allowance} compact />}
            {!c.mine && (
              <button onClick={() => setReporting(c.id)} className="hover:text-ink">
                Report
              </button>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-5 border-t border-line pt-5">
        {comments === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : threads.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Be the first to reply.</p>
        ) : (
          <ul className="space-y-6">
            {threads.map(({ root, replies }) => {
              const open = expanded.has(root.id);
              return (
                <li key={root.id}>
                  {row(root, null)}
                  {replies.length > 0 &&
                    (open ? (
                      <div className="ml-4 mt-3 flex gap-3">
                        <div className="w-0.5 shrink-0 rounded bg-line" />
                        <div className="min-w-0 flex-1 space-y-4">
                          {replies.map(({ comment, parent }) => (
                            <div key={comment.id}>{row(comment, parent.id === root.id ? null : parent)}</div>
                          ))}
                          <button onClick={() => toggle(root.id)} className="text-xs text-muted hover:text-ink">
                            Hide replies
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => toggle(root.id)} className="ml-11 mt-2 text-sm text-gold hover:underline">
                        Show {replies.length} {replies.length === 1 ? "reply" : "replies"}
                      </button>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pinned to the bottom of the screen: this is where a reply is written. */}
      <div className="sticky bottom-0 z-20 -mx-5 mt-6 rounded-b-3xl border-t border-line bg-card/95 px-5 py-3 backdrop-blur">
        {replyTo && (
          <p className="mb-2 flex items-center justify-between gap-3 text-xs text-muted">
            <span className="truncate">
              Replying to {replyTo.author.you ? "yourself" : replyTo.author.pseudonym}: “{replyTo.body.length > 30 ? `${replyTo.body.slice(0, 30)}…` : replyTo.body}”
            </span>
            <button onClick={() => setReplyTo(null)} className="shrink-0 underline">
              Cancel
            </button>
          </p>
        )}
        <div className="flex gap-2">
          <input
            ref={box}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void send()}
            maxLength={280}
            placeholder="Add your reply…"
            className="min-w-0 flex-1 rounded-full border border-line bg-white/80 px-4 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/15"
          />
          <button onClick={send} disabled={sending || !text.trim()} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-40">
            Post
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>

      {reporting && <ThoughtReportDialog thoughtId={thought.id} commentId={reporting} onClose={() => setReporting(null)} />}
    </>
  );
}
