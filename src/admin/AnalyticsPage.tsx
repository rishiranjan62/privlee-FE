import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatValue } from "../lib/format";
import { genderLabels } from "../lib/labels";
import type { Analytics, AnalyticsSeries, Gender, Granularity, Traffic, TrafficSplit } from "../lib/types";
import TrendChart, { bucketLabel } from "./TrendChart";
import RefreshButton from "./RefreshButton";

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

/** Which list of members each card opens, or the page that holds its detail. Traffic is anonymous, so it has none. */
const CARD_EVENT: Record<string, string> = {
  totalMembers: "members",
  newMembers: "joined",
  activeMembers: "active",
  deleted: "deleted",
  returned: "returned",
  avgTime: "active",
  avgTimeWeb: "active",
  avgTimeApp: "active",
  matches: "matched",
  likes: "likers",
  messages: "messagers",
  photos: "uploaders",
};
const CARD_PAGE: Record<string, string> = { reports: "/admin/reports", moderation: "/admin/audit" };

/** First day after the last bucket, UTC: where the report's range stops. */
function rangeEnd(last: string, step: Granularity): string {
  const d = new Date(`${last}T00:00:00Z`);
  if (step === "day") d.setUTCDate(d.getUTCDate() + 1);
  else if (step === "week") d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return isoDay(d);
}

function cardLink(data: Analytics, key: string): string | null {
  if (CARD_PAGE[key]) return CARD_PAGE[key];
  const event = CARD_EVENT[key];
  if (!event) return null;
  const p = new URLSearchParams({ event, from: data.from, until: rangeEnd(data.to, data.granularity) });
  if (data.gender) p.set("gender", data.gender);
  if (data.city) p.set("city", data.city);
  return `/admin/users?${p}`;
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
  // Bumped by the Refresh button: the two lookups below depend on it, so they run again.
  const [reloads, setReloads] = useState(0);
  const lastReloads = useRef(0);
  const lastTrafficReloads = useRef(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const query = useMemo(() => {
    if (count === "custom") return from ? { from, to } : null;
    return { from: rangeStart(step, count), to: "" };
  }, [step, count, from, to]);

  useEffect(() => {
    if (!query) return;
    let current = true;
    // A refresh keeps what is on screen until the new numbers arrive; changing the filters starts from "Loading".
    if (reloads === lastReloads.current) setData(null);
    setFailed(null);
    setRefreshing(true);
    api
      .getAnalytics(step, query.from, query.to || undefined, gender || undefined, city || undefined)
      .then((d) => {
        if (!current) return;
        setData(d);
        setAreaOptions(d.areaBreakdown);
        setUpdatedAt(new Date());
      })
      .catch((e) => current && setFailed(e?.response?.data?.message ?? "Could not load the report."))
      .finally(() => current && setRefreshing(false));
    lastReloads.current = reloads;
    return () => {
      current = false;
    };
  }, [step, query, gender, city, reloads]);

  // Traffic follows the same step and range but is independent of the gender filter: page views
  // are anonymous, so there is no gender to filter them by.
  useEffect(() => {
    if (!query) return;
    let current = true;
    if (reloads === lastTrafficReloads.current) setTraffic(null);
    lastTrafficReloads.current = reloads;
    api
      .getTraffic(step, query.from, query.to || undefined)
      .then((t) => current && setTraffic(t))
      .catch(() => current && setTraffic(null));
    return () => {
      current = false;
    };
  }, [step, query, reloads]);

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
        <div className="flex flex-wrap items-center gap-3">
          <RefreshButton onClick={() => setReloads((n) => n + 1)} busy={refreshing} updatedAt={updatedAt} />
          <button
            onClick={download}
            disabled={!data}
            className="rounded border border-line bg-white px-4 py-2 text-sm font-medium transition hover:border-gold disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>
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
            {data.series.map((s) => {
              const to = cardLink(data, s.key);
              const card = (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">{s.label}</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">{s.total === 0 && s.unit === "seconds" ? "—" : formatValue(s.total, s.unit)}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {change(s)} vs previous {buckets} {noun}
                  </p>
                </>
              );
              return to ? (
                <Link
                  key={s.key}
                  to={to}
                  title={to.startsWith("/admin/users") ? "See the members behind this number" : "Open the details"}
                  className="rounded-lg border border-line bg-white p-4 transition hover:border-gold focus-visible:border-gold focus-visible:outline-none"
                >
                  {card}
                </Link>
              ) : (
                <div key={s.key} className="rounded-lg border border-line bg-white p-4">
                  {card}
                </div>
              );
            })}
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
            Time counts only seconds with the website or the Android app on screen and in use (not idle, not in the
            background), averaged over the days a member used that one. A member who used both on a day is in both
            averages and, once, in the combined one. Time on the website is measured from the day tracking was
            added; time in the Android app from the first release that reports it, so it reads "—" until members
            have updated.
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

/** Android apps that send people here (the referrer is the app's package name), by a name people know. */
const APP_NAMES: Record<string, string> = {
  "com.google.android.gm": "Gmail (app)",
  "com.google.android.googlequicksearchbox": "Google (app)",
  "com.google.android.apps.messaging": "Messages (app)",
  "com.whatsapp": "WhatsApp (app)",
  "com.instagram.android": "Instagram (app)",
  "com.facebook.katana": "Facebook (app)",
  "com.twitter.android": "X (app)",
  "org.telegram.messenger": "Telegram (app)",
};

const PLATFORM_NAMES: Record<string, string> = { web: "Website", android: "Android app", ios: "iPhone app" };

function titled(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** How a row's name reads. Sites stay as written (a domain is not a sentence), pages and devices are named. */
function referrerName(label: string): string {
  if (label === "direct") return "Direct";
  return APP_NAMES[label] ?? label;
}

/**
 * One breakdown card. The list scrolls inside the card past a fixed height, so a long list (every country, every
 * city) never makes the page grow with the data; the column headings stay put while it scrolls. Columns have fixed
 * widths and names are cut with "..." (the full name is on hover), so numbers can never run into the next column.
 */
function SplitTable({
  title,
  head,
  rows,
  empty,
  showVisitors = false,
  note,
  name = (label: string) => label,
}: {
  title: string;
  /** The heading over the names, e.g. "Country". */
  head: string;
  rows: TrafficSplit[];
  empty: string;
  /** Adds a column of visitors (first visits of the day) before the views. */
  showVisitors?: boolean;
  note?: string;
  name?: (label: string) => string;
}) {
  const total = rows.reduce((n, r) => n + r.views, 0);
  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-line bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
        {title} {rows.length > 0 && <span className="font-normal normal-case">({rows.length})</span>}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <div className="mt-3 max-h-80 overflow-y-auto overscroll-contain">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col />
              {showVisitors && <col className="w-20" />}
              <col className="w-16" />
              <col className="w-14" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-white text-[11px] uppercase tracking-wider text-muted">
              <tr className="border-b border-line">
                <th className="py-1.5 pr-2 text-left font-medium">{head}</th>
                {showVisitors && <th className="py-1.5 text-right font-medium">Visitors</th>}
                <th className="py-1.5 text-right font-medium">Views</th>
                <th className="py-1.5 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-line/60 last:border-b-0">
                  <td className="truncate py-1.5 pr-2" title={name(r.label)}>
                    {name(r.label)}
                  </td>
                  {showVisitors && <td className="py-1.5 text-right tabular-nums">{r.visitors.toLocaleString()}</td>}
                  <td className="py-1.5 text-right tabular-nums">{r.views.toLocaleString()}</td>
                  <td className="py-1.5 text-right tabular-nums text-muted">
                    {total === 0 ? 0 : Math.round((r.views / total) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {note && <p className="mt-3 text-xs text-muted">{note}</p>}
    </section>
  );
}

function TrafficSection({ traffic, noun }: { traffic: Traffic | null; noun: string }) {
  if (traffic === null) return <p className="mt-8 text-sm text-muted">Loading traffic...</p>;
  const f = traffic.funnel;
  const empty = traffic.series.every((s) => s.total === 0);
  const onlyUnknown = traffic.byCountry.length > 0 && traffic.byCountry.every((c) => c.label === "Unknown");
  const rate = (to: number, from: number) => (from === 0 ? "—" : `${Math.round((to / from) * 100)}%`);

  return (
    <div className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Traffic</h2>
      <p className="mt-1 text-sm text-muted">
        How many people reach the website and the app. Counted per page view with no cookies, no addresses and
        nothing that identifies a visitor. A visitor is counted once per browser per day, so someone who comes
        back on another day counts again. Places are names only (country, and state and city when available),
        looked up when the page is opened and never stored with anything that identifies the visitor. Because
        visitors are anonymous there is no list of people behind these numbers.
      </p>

      {empty && (
        <p className="mt-3 rounded border border-dashed border-line bg-white/60 px-4 py-3 text-sm text-muted">
          No traffic recorded in this range yet. Counting starts from the day it was switched on.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
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
        <SplitTable title="By device" head="Device" rows={traffic.byPlatform} empty="Nothing yet." name={(l) => PLATFORM_NAMES[l] ?? titled(l)} />
        <SplitTable title="Pages" head="Page" rows={traffic.byPage} empty="Nothing yet." name={titled} />
        <SplitTable title="Referring sites" head="Source" rows={traffic.byReferrer} empty="Nothing yet." name={referrerName} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <SplitTable
          title="Visitors by country"
          head="Country"
          rows={traffic.byCountry}
          empty="Nothing yet."
          showVisitors
          note={
            onlyUnknown
              ? "Every visit is Unknown. The place comes from Cloudflare, so the API must be behind its proxy (orange cloud)."
              : undefined
          }
        />
        <SplitTable
          title="Visitors by city"
          head="City"
          rows={traffic.byCity}
          empty="No cities recorded. In Cloudflare, turn on Rules > Settings > Managed Transforms > Add visitor location headers."
          showVisitors
        />
      </div>
    </div>
  );
}
