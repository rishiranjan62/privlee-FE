import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import MiniBarChart from "./MiniBarChart";
import RefreshButton from "./RefreshButton";
import { genderLabels } from "../lib/labels";
import type { AppReleasesOverview, Metrics } from "../lib/types";

function Tile({ label, value, hint, to, alert }: { label: string; value: number; hint?: string; to?: string; alert?: boolean }) {
  const body = (
    <div className={`h-full rounded-lg border bg-white p-4 transition ${to ? "hover:border-gold" : ""} ${alert ? "border-danger/50" : "border-line"}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {/* the colour never carries the meaning alone: the wording does */}
      {hint && <p className={`mt-0.5 text-xs ${alert ? "text-danger" : "text-muted"}`}>{hint}</p>}
    </div>
  );
  if (!to) return body;
  // "#..." jumps to a section of this page; anything else is another admin page.
  return to.startsWith("#") ? <a href={to}>{body}</a> : <Link to={to}>{body}</Link>;
}

/**
 * A share-of-members list: one row per group, bar length is the share. Identity is carried by the
 * row label, not by colour, so every bar is the same hue and the panel reads the same in greyscale
 * or to a colour-blind admin.
 */
function ShareBars({ title, rows, empty }: { title: string; rows: { label: string; members: number }[]; empty: string }) {
  const total = rows.reduce((n, r) => n + r.members, 0);
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((r) => {
            const pct = total === 0 ? 0 : (r.members / total) * 100;
            return (
              <li key={r.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{r.label}</span>
                  <span className="tabular-nums">
                    <strong>{r.members}</strong> <span className="text-muted">· {Math.round(pct)}%</span>
                  </span>
                </div>
                <div className="mt-1 h-2 rounded bg-line/60">
                  <div className="h-2 rounded bg-gold" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function AdminHome() {
  const [m, setM] = useState<Metrics | null>(null);
  const [app, setApp] = useState<AppReleasesOverview | null>(null);

  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // What is on screen stays while a refresh runs, so the page does not blink empty.
  const load = useCallback(() => {
    setBusy(true);
    const metrics = api
      .getAdminMetrics()
      .then((d) => {
        setM(d);
        setUpdatedAt(new Date());
      })
      .catch(() => {});
    // A side figure: if it cannot be loaded, the tile simply is not shown.
    const releases = api.getAppReleases().then(setApp).catch(() => setApp(null));
    Promise.all([metrics, releases]).finally(() => setBusy(false));
  }, []);

  useEffect(load, [load]);

  if (!m) return <p className="py-10 text-center text-muted">Loading...</p>;
  const t = m.totals;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="mt-1 text-sm text-muted">Counts only. Nothing here shows anyone's messages, photos or identity.</p>
        </div>
        <RefreshButton onClick={load} busy={busy} updatedAt={updatedAt} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Members" value={t.users} hint={`${t.newUsers7d} joined this week`} to="/admin/users?filter=all" />
        <Tile
          label="Active today"
          value={t.active24h}
          hint={`${t.active7d} in the last 7 days`}
          to="/admin/users?filter=active-today"
        />
        <Tile label="Matches" value={t.matches} hint={`${t.matches7d} this week`} to="#daily-activity" />
        <Tile label="Messages" value={t.messages7d} hint="in the last 7 days" to="#daily-activity" />
        <Tile
          label="Open reports"
          value={t.openReports}
          hint={t.openReports > 0 ? "waiting for review" : "queue is clear"}
          to="/admin/reports"
          alert={t.openReports > 0}
        />
        <Tile label="Suspended" value={t.suspended} to="/admin/users?filter=suspended" />
        <Tile label="Banned" value={t.banned} to="/admin/users?filter=banned" />
        <Tile
          label="Awaiting verification"
          value={t.unverified}
          hint="email not yet confirmed"
          to="/admin/users?filter=unverified"
        />
        {app && (
          <Tile label="App downloads" value={app.total} hint={`${app.last7Days} in the last 7 days`} to="/admin/app" />
        )}
        <Tile
          label="Deleted accounts"
          value={t.deleted}
          hint={t.returned > 0 ? `${t.returned} came back` : "chose to leave"}
          to="/admin/users?filter=deleted"
        />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <ShareBars
          title="Members by gender"
          rows={m.genders.map((g) => ({ label: genderLabels[g.gender] ?? g.gender, members: g.members }))}
          empty="No members yet."
        />
        <ShareBars title="Members by area" rows={m.areas.map((a) => ({ label: a.label, members: a.members }))} empty="No members yet." />
      </div>

      <h2 id="daily-activity" className="mt-8 scroll-mt-20 text-sm font-semibold uppercase tracking-wider text-muted">Daily activity</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {m.series.map((s) => (
          <MiniBarChart key={s.key} series={s} />
        ))}
      </div>
    </div>
  );
}
