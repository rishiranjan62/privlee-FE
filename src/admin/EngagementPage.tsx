import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Engagement, EngagementOpener } from "../lib/types";
import RefreshButton from "./RefreshButton";

const WINDOWS = [7, 14, 30, 90];

const card = "rounded border border-line bg-white p-5";

/**
 * Why members are or are not active, in plain counts. There is deliberately no way from here to read a conversation: this page shows
 * how far people get, never what they said.
 */
export default function EngagementPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Engagement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    api
      .getEngagement(days)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
        setUpdatedAt(new Date());
      })
      .catch(() => !cancelled && setError("Could not load this report."))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [days, reloads]);

  // The step where the most people who reached the one before it did not reach this one.
  const biggestDrop = (() => {
    if (!data) return null;
    let worst: { from: string; to: string; lost: number; of: number } | null = null;
    for (let i = 1; i < data.funnel.length - 1; i++) {
      const before = data.funnel[i - 1];
      const here = data.funnel[i];
      const lost = before.members - here.members;
      if (before.members >= 5 && lost > 0 && (!worst || lost / before.members > worst.lost / worst.of)) {
        worst = { from: before.label, to: here.label, lost, of: before.members };
      }
    }
    return worst;
  })();

  const joined = data?.funnel[0]?.members ?? 0;
  const conv = data?.conversations;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Engagement</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Where new members stop, and how far conversations get. These are counts only: nothing here shows a name, a photo or a message.
          </p>
        </div>
        <RefreshButton onClick={() => setReloads((n) => n + 1)} busy={busy} updatedAt={updatedAt} />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted">Members who joined in the last</span>
        {WINDOWS.map((w) => (
          <button
            key={w}
            onClick={() => setDays(w)}
            className={`rounded border px-3 py-1.5 ${days === w ? "border-gold bg-white font-medium" : "border-line bg-white text-muted hover:border-gold"}`}
          >
            {w} days
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {!data && !error && <p className="text-sm text-muted">Loading…</p>}

      {data && (
        <>
          {joined === 0 ? (
            <div className={card}>
              <p className="text-sm text-muted">Nobody joined in this period, so there is no funnel to show. Try a longer period.</p>
            </div>
          ) : (
            <section className={card}>
              <h2 className="text-base font-semibold">What new members did</h2>
              <p className="mt-1 text-sm text-muted">
                Of the {joined} {joined === 1 ? "person" : "people"} who joined, how many reached each step. A long drop between two steps is
                where to look first.
              </p>
              {biggestDrop && (
                <p className="mt-3 rounded bg-[#fbf3e3] px-3 py-2 text-sm">
                  Biggest drop: of {biggestDrop.of} who reached <strong>{biggestDrop.from.toLowerCase()}</strong>, {biggestDrop.lost} did not reach{" "}
                  <strong>{biggestDrop.to.toLowerCase()}</strong>.
                </p>
              )}
              <ul className="mt-4 space-y-3">
                {data.funnel.map((s, i) => {
                  const prev = i > 0 ? data.funnel[i - 1].members : null;
                  return (
                    <li key={s.key}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span>{s.label}</span>
                        <span className="tabular-nums">
                          <strong>{s.members}</strong> <span className="text-muted">({s.percentOfJoined}%)</span>
                          {prev !== null && prev > s.members && i < data.funnel.length - 1 && (
                            <span className="ml-2 text-xs text-red-700">−{prev - s.members}</span>
                          )}
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded bg-[#ece8e1]">
                        <div className="h-2 rounded bg-gold" style={{ width: `${Math.max(s.percentOfJoined, s.members > 0 ? 1.5 : 0)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {conv && (
            <section className={card}>
              <h2 className="text-base font-semibold">How far matches get</h2>
              <p className="mt-1 text-sm text-muted">
                Matches made in this period, by whether anyone wrote. Only who sent something is counted, never what it said.
              </p>
              {conv.matches === 0 ? (
                <p className="mt-3 text-sm text-muted">No matches in this period.</p>
              ) : (
                <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Figure label="Matches" value={conv.matches} />
                  <Figure label="Nobody wrote" value={conv.noMessage} share={conv.noMessage / conv.matches} />
                  <Figure label="Only one person wrote" value={conv.oneSided} share={conv.oneSided / conv.matches} />
                  <Figure label="Both wrote" value={conv.twoSided} share={conv.twoSided / conv.matches} />
                </dl>
              )}
            </section>
          )}

          <section className={card}>
            <h2 className="text-base font-semibold">How conversations begin and go</h2>
            <p className="mt-1 text-sm text-muted">
              Worked out by the server from the matches above. Nobody opens a conversation: it counts who wrote first, whether they were
              answered, and how long a first message was.
            </p>
            {data.insights.openers.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No conversations have started in this period.</p>
            ) : (
              <>
                <p className="mt-3 text-sm">
                  Typical wait for a first reply:{" "}
                  <strong>
                    {data.insights.medianHoursToReply === null ? "nobody has replied yet" : formatHours(data.insights.medianHoursToReply)}
                  </strong>
                </p>
                <h3 className="mt-5 text-sm font-semibold">How the first message began</h3>
                <OpenerTable rows={data.insights.openers} />
                {data.insights.openerLengths.length > 0 && (
                  <>
                    <h3 className="mt-5 text-sm font-semibold">First messages that were written, by length</h3>
                    <OpenerTable rows={data.insights.openerLengths} />
                  </>
                )}
                <h3 className="mt-5 text-sm font-semibold">Messages in each match so far</h3>
                <dl className="mt-2 grid grid-cols-3 gap-4 sm:grid-cols-6">
                  {data.insights.depth.map((b) => (
                    <Figure key={b.key} label={b.label} value={b.members} />
                  ))}
                </dl>
              </>
            )}
          </section>

          <section className={card}>
            <h2 className="text-base font-semibold">When members were last here</h2>
            <p className="mt-1 text-sm text-muted">Every member, whenever they joined.</p>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
              {data.lastActive.map((b) => (
                <Figure key={b.key} label={b.label} value={b.members} />
              ))}
            </dl>
          </section>

          <section className={card}>
            <h2 className="text-base font-semibold">How to read this</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted">
              <li>Many people stop before adding a photo: the sign-up or the email confirmation is losing them.</li>
              <li>Many add a photo but never like anyone: Discover may look empty or unappealing. Check how many people they can actually see.</li>
              <li>Many like but never match: there are too few active people, or too few of the gender they want.</li>
              <li>Many matches where nobody wrote: members do not know how to start. This is what icebreakers are for.</li>
              <li>Many matches where only one person wrote: replies are the problem, often because the other person is no longer active.</li>
              <li>A long wait for the first reply, or openers that get few answers: people are not checking the app, or the way a conversation starts is not inviting.</li>
              <li>Short openers answered far less than longer ones: a prompt or suggested first message would help.</li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Figure({ label, value, share }: { label: string; value: number; share?: number }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">
        {value}
        {share !== undefined && <span className="ml-2 text-sm font-normal text-muted">{Math.round(share * 100)}%</span>}
      </dd>
    </div>
  );
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} minutes`;
  if (h < 48) return `${h} hours`;
  return `${Math.round(h / 24)} days`;
}

function OpenerTable({ rows }: { rows: EngagementOpener[] }) {
  return (
    <table className="mt-2 w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs text-muted">
          <th className="py-1.5 font-normal">&nbsp;</th>
          <th className="py-1.5 text-right font-normal">First messages</th>
          <th className="py-1.5 text-right font-normal">Answered</th>
          <th className="py-1.5 text-right font-normal">Within a day</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-b border-line/60 last:border-0">
            <td className="py-1.5">{r.label}</td>
            <td className="py-1.5 text-right tabular-nums">{r.started}</td>
            <td className="py-1.5 text-right tabular-nums">
              {r.replied} <span className="text-muted">({pct(r.replied, r.started)})</span>
            </td>
            <td className="py-1.5 text-right tabular-nums">
              {r.repliedWithinDay} <span className="text-muted">({pct(r.repliedWithinDay, r.started)})</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function pct(part: number, whole: number): string {
  return whole === 0 ? "0%" : `${Math.round((part * 100) / whole)}%`;
}
