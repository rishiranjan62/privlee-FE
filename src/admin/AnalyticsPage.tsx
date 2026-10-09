import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { formatValue } from "../lib/format";
import { genderLabels } from "../lib/labels";
import type { Analytics, AnalyticsSeries, Gender, Granularity, Traffic, TrafficSplit } from "../lib/types";
import TrendChart, { bucketLabel } from "./TrendChart";

const STEPS: { value: Granularity; label: string; noun: string }[] = [
  { value: "day", label: "Daily", noun: "days" },
  { value: "week", label: "Weekly", noun: "weeks" },
  { value: "month", label: "Monthly", noun: "months" },
];

/** How far back each step can look, in buckets. "custom" uses the date fields instead. */
const RANGES: Record<Granularity, number[]> = {
  day: [7, 14, 30, 90],
  week: [8, 12, 26, 52],
  month: [6, 12, 24],
};
const DEFAULT_RANGE: Record<Granularity, number> = { day: 30, week: 12, month: 12 };

const field = "rounded border border-line bg-white px-2.5 py-2 text-sm outline-none focus:border-gold";

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** First day of the range that ends today (UTC) and spans `count` buckets of this step. */
function rangeStart(step: Granularity, count: number): string {
  const d = new Date();
  if (step === "day") d.setUTCDate(d.getUTCDate() - (count - 1));
  else if (step === "week") d.setUTCDate(d.getUTCDate() - 7 * (count - 1));
  else d.setUTCMonth(d.getUTCMonth() - (count - 1));
  return isoDay(d);
}

function change(s: AnalyticsSeries): string {
  if (s.previousTotal === 0) return s.total === 0 ? "no change" : "new";
  const pct = Math.round(((s.total - s.previousTotal) / s.previousTotal) * 100);
  if (pct === 0) return "no change";
  // The arrow and the sign carry the direction; whether more is better depends on the measure.
  return `${pct > 0 ? "▲ +" : "▼ "}${pct}%`;
}

function toCsv(data: Analytics): string {
  const head = ["period_start", ...data.series.map((s) => (s.unit === "seconds" ? `${s.label} (seconds)` : s.label))];
  const rows = data.series[0].points.map((p, i) => [p.day, ...data.series.map((s) => s.points[i].value)]);
  return [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export default function AnalyticsPage() {
  const [step, setStep] = useState<Granularity>("day");
  const [count, setCount] = useState<number | "custom">(DEFAULT_RANGE.day);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [city, setCity] = useState("");
  // Kept from the first answer: the area filter must not lose its other options once one is chosen.
  const [areaOptions, setAreaOptions] = useState<Analytics["areaBreakdown"]>([]);
  const [data, setData] = useState<Analytics | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [traffic, setTraffic] = useState<Traffic | null>(null);

  const query = useMemo(() => {
    if (count === "custom") return from ? { from, to } : null;
    return { from: rangeStart(step, count), to: "" };
  }, [step, count, from, to]);

  useEffect(() => {
    if (!query) return;
    let current = true;
    setData(null);
    setFailed(null);
    api
      .getAnalytics(step, query.from, query.to || undefined, gender || undefined, city || undefined)
      .then((d) => {
        if (!current) return;
        setData(d);
        setAreaOptions(d.areaBreakdown);
      })
      .catch((e) => current && setFailed(e?.response?.data?.message ?? "Could not load the report."));
    return () => {
      current = false;
    };
  }, [step, query, gender, city]);

  // Traffic follows the same step and range but is independent of the gender filter: page views
  // are anonymous, so there is no gender to filter them by.
  useEffect(() => {
    if (!query) return;
    let current = true;
    setTraffic(null);
    api
      .getTraffic(step, query.from, query.to || undefined)
      .then((t) => current && setTraffic(t))
      .catch(() => current && setTraffic(null));
    return () => {
      current = false;
    };
  }, [step, query]);

  function chooseStep(next: Granularity) {
    setStep(next);
    setCount(count === "custom" ? "custom" : DEFAULT_RANGE[next]);
  }

  function download() {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([toCsv(data)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `privlee-${data.granularity}-${data.from}-to-${data.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const noun = STEPS.find((s) => s.value === step)!.noun;
  const buckets = data?.series[0].points.length ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Growth and engagement over time. Counts only; nothing here identifies anyone. Dates are UTC.
          </p>
        </div>
        <button
          onClick={download}
          disabled={!data}
          className="rounded border border-line bg-white px-4 py-2 text-sm font-medium transition hover:border-gold disabled:opacity-50"
        >
          Download CSV
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-4 rounded-lg border border-line bg-white p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">Group by</span>
          <div role="group" aria-label="Group by" className="flex overflow-hidden rounded border border-line">
            {STEPS.map((s) => (
              <button
                key={s.value}
                onClick={() => chooseStep(s.value)}
                aria-pressed={step === s.value}
                className={`px-4 py-2 text-sm transition ${step === s.value ? "bg-ink text-canvas" : "hover:bg-[#faf9f6]"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-muted">
          Range
          <select
            value={String(count)}
            onChange={(e) => setCount(e.target.value === "custom" ? "custom" : Number(e.target.value))}
            className={field}
          >
            {RANGES[step].map((n) => (
              <option key={n} value={n}>
                Last {n} {noun}
              </option>
            ))}
            <option value="custom">Custom dates</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-muted">
          Gender
          <select value={gender} onChange={(e) => setGender(e.target.value as Gender | "")} className={field}>
            <option value="">All genders</option>
            {Object.entries(genderLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-muted">
          Area
          <select value={city} onChange={(e) => setCity(e.target.value)} className={field}>
            <option value="">All areas</option>
            {areaOptions.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
        </label>

        {count === "custom" && (
          <>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-muted">
              From
              <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-muted">
              To
              <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={field} />
            </label>
          </>
        )}
      </div>

      {failed ? (
        <p className="mt-6 rounded-lg border border-dashed border-line bg-white/60 px-6 py-12 text-center text-muted">
          {failed} If this is new, the server may need a restart.
        </p>
      ) : !query ? (
        <p className="mt-6 text-sm text-muted">Pick a start date to see a custom range.</p>
      ) : data === null ? (
        <p className="py-10 text-center text-muted">Loading...</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted">
            {bucketLabel(data.from, data.granularity)} to {bucketLabel(data.to, data.granularity)} · {buckets} {noun}
            {data.lastBucketPartial && " · the latest period is still in progress, so it reads low"}
          </p>

          {(data.gender || data.city) && (
            <p className="mt-2 rounded border border-line bg-white px-3 py-2 text-sm text-muted">
              Showing{" "}
              {[data.gender && `${genderLabels[data.gender]} members`, data.city && `members in ${areaOptions.find((a) => a.key === data.city)?.label ?? data.city}`]
                .filter(Boolean)
                .join(", ")}{" "}
              only. Matches, reports and moderation actions involve two people or staff, so they only appear
              with no filter.
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {data.series.map((s) => (
              <div key={s.key} className="rounded-lg border border-line bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{s.label}</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{s.total === 0 && s.unit === "seconds" ? "—" : formatValue(s.total, s.unit)}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {change(s)} vs previous {buckets} {noun}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {data.series.map((s) => (
              <TrendChart key={s.key} series={s} granularity={data.granularity} lastBucketPartial={data.lastBucketPartial} />
            ))}
          </div>

          <section className="mt-6 rounded-lg border border-line bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Gender breakdown <span className="font-normal normal-case">(all members, this range)</span>
            </h3>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-2 font-medium">Gender</th>
                  <th className="py-2 text-right font-medium">Members</th>
                  <th className="py-2 text-right font-medium">Share</th>
                  <th className="py-2 text-right font-medium">Joined</th>
                  <th className="py-2 text-right font-medium">Active</th>
                </tr>
              </thead>
              <tbody>
                {data.genderBreakdown.map((g) => {
                  const total = data.genderBreakdown.reduce((n, x) => n + x.members, 0);
                  return (
                    <tr key={g.gender} className="border-b border-line/60 last:border-b-0">
                      <td className="py-2">{genderLabels[g.gender] ?? g.gender}</td>
                      <td className="py-2 text-right tabular-nums">{g.members}</td>
                      <td className="py-2 text-right tabular-nums text-muted">
                        {total === 0 ? "0" : Math.round((g.members / total) * 100)}%
                      </td>
                      <td className="py-2 text-right tabular-nums">{g.joined}</td>
                      <td className="py-2 text-right tabular-nums">{g.active}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="mt-6 rounded-lg border border-line bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Area breakdown <span className="font-normal normal-case">(all members, this range)</span>
            </h3>
            <div className="mt-3 max-h-80 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-line bg-white text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="py-2 font-medium">Area</th>
                    <th className="py-2 text-right font-medium">Members</th>
                    <th className="py-2 text-right font-medium">Share</th>
                    <th className="py-2 text-right font-medium">Joined</th>
                    <th className="py-2 text-right font-medium">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {data.areaBreakdown.map((a) => {
                    const total = data.areaBreakdown.reduce((n, x) => n + x.members, 0);
                    return (
                      <tr key={a.key} className="border-b border-line/60 last:border-b-0">
                        <td className="py-2">{a.label}</td>
                        <td className="py-2 text-right tabular-nums">{a.members}</td>
                        <td className="py-2 text-right tabular-nums text-muted">
                          {total === 0 ? "0" : Math.round((a.members / total) * 100)}%
                        </td>
                        <td className="py-2 text-right tabular-nums">{a.joined}</td>
                        <td className="py-2 text-right tabular-nums">{a.active}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              Area is the city a member entered, with spelling and capital letters ignored.
            </p>
          </section>

          <TrafficSection traffic={traffic} noun={noun} />

          <p className="mt-6 text-xs text-muted">
            Time in the app counts only seconds with the app visible and in use (not idle or in a background
            tab), averaged over members' active days. It is measured from the day tracking was added, so it reads
            "—" until members have used the app since.
          </p>
          <p className="mt-2 text-xs text-muted">
            Active members are people who used the app at least once in the period, counted once each. That
            history is recorded from the day this report was added; for earlier periods it only reflects each
            member's sign-up day and most recent visit, so those read low.
          </p>
        </>
      )}
    </div>
  );
}

function SplitTable({ title, rows, empty }: { title: string; rows: TrafficSplit[]; empty: string }) {
  const total = rows.reduce((n, r) => n + r.views, 0);
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line/60 first:border-t-0">
                <td className="py-1.5 capitalize">{r.label}</td>
                <td className="py-1.5 text-right tabular-nums">{r.views.toLocaleString()}</td>
                <td className="w-12 py-1.5 text-right tabular-nums text-muted">
                  {total === 0 ? 0 : Math.round((r.views / total) * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function TrafficSection({ traffic, noun }: { traffic: Traffic | null; noun: string }) {
  if (traffic === null) return <p className="mt-8 text-sm text-muted">Loading traffic...</p>;
  const f = traffic.funnel;
  const empty = traffic.series.every((s) => s.total === 0);
  const rate = (to: number, from: number) => (from === 0 ? "—" : `${Math.round((to / from) * 100)}%`);

  return (
    <div className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Traffic</h2>
      <p className="mt-1 text-sm text-muted">
        How many people reach the website and the app. Counted per page view with no cookies, no addresses and
        nothing that identifies a visitor.
      </p>

      {empty && (
        <p className="mt-3 rounded border border-dashed border-line bg-white/60 px-4 py-3 text-sm text-muted">
          No traffic recorded in this range yet. Counting starts from the day it was switched on.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        {traffic.series.map((s) => (
          <div key={s.key} className="rounded-lg border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{s.total.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-muted">
              {change(s)} vs previous {traffic.series[0].points.length} {noun}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {traffic.series.map((s) => (
          <TrendChart key={s.key} series={s} granularity={traffic.granularity} lastBucketPartial={traffic.lastBucketPartial} />
        ))}
        <section className="rounded-lg border border-line bg-white p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Sign-up funnel</h3>
          <ol className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between">
              <span>Landing page views</span>
              <strong className="tabular-nums">{f.landingViews.toLocaleString()}</strong>
            </li>
            <li className="flex justify-between">
              <span>
                Sign-up page views <span className="text-muted">({rate(f.signupViews, f.landingViews)})</span>
              </span>
              <strong className="tabular-nums">{f.signupViews.toLocaleString()}</strong>
            </li>
            <li className="flex justify-between">
              <span>
                New members <span className="text-muted">({rate(f.newMembers, f.signupViews)})</span>
              </span>
              <strong className="tabular-nums">{f.newMembers.toLocaleString()}</strong>
            </li>
          </ol>
          <p className="mt-3 text-xs text-muted">Views, not people - no one is identified, so repeat views count again.</p>
        </section>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <SplitTable title="By device" rows={traffic.byPlatform} empty="Nothing yet." />
        <SplitTable title="Pages" rows={traffic.byPage} empty="Nothing yet." />
        <SplitTable title="Where visitors come from" rows={traffic.byReferrer} empty="Nothing yet." />
      </div>
    </div>
  );
}
