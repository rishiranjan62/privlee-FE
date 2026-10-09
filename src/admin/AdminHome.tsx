import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import MiniBarChart from "./MiniBarChart";
import type { Metrics } from "../lib/types";

function Tile({ label, value, hint, to, alert }: { label: string; value: number; hint?: string; to?: string; alert?: boolean }) {
  const body = (
    <div className={`h-full rounded-lg border bg-white p-4 transition ${to ? "hover:border-gold" : ""} ${alert ? "border-danger/50" : "border-line"}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {/* the colour never carries the meaning alone: the wording does */}
      {hint && <p className={`mt-0.5 text-xs ${alert ? "text-danger" : "text-muted"}`}>{hint}</p>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function AdminHome() {
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => {
    api.getAdminMetrics().then(setM).catch(() => setM(null));
  }, []);

  if (!m) return <p className="py-10 text-center text-muted">Loading...</p>;
  const t = m.totals;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="mt-1 text-sm text-muted">Counts only. Nothing here shows anyone's messages, photos or identity.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Members" value={t.users} hint={`${t.newUsers7d} joined this week`} />
        <Tile label="Active today" value={t.active24h} hint={`${t.active7d} in the last 7 days`} />
        <Tile label="Matches" value={t.matches} hint={`${t.matches7d} this week`} />
        <Tile label="Messages" value={t.messages7d} hint="in the last 7 days" />
        <Tile
          label="Open reports"
          value={t.openReports}
          hint={t.openReports > 0 ? "waiting for review" : "queue is clear"}
          to="/admin/reports"
          alert={t.openReports > 0}
        />
        <Tile label="Suspended" value={t.suspended} to="/admin/users" />
        <Tile label="Banned" value={t.banned} to="/admin/users" />
        <Tile label="Awaiting verification" value={t.unverified} hint="email not yet confirmed" />
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted">Daily activity</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {m.series.map((s) => (
          <MiniBarChart key={s.key} series={s} />
        ))}
      </div>
    </div>
  );
}
