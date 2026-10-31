import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MiniBarChart from "../admin/MiniBarChart";
import Logo from "../components/Logo";
import { SponsoredCard } from "../components/SponsoredSlot";
import { API_ORIGIN } from "../lib/apiBase";
import { api } from "../lib/api";
import { usePageMeta } from "../lib/seo";
import type { AdFunnel, AdPlacement, AdReport } from "../lib/types";

const PLACE: Record<AdPlacement, string> = {
  DISCOVER: "Discover",
  LIKES: "Likes",
  MATCHES: "Matches",
  MESSAGES: "Messages list",
  CONVERSATION: "Inside a conversation",
};
const n = (v: number) => v.toLocaleString();
const pct = (part: number, whole: number) => (whole === 0 ? "-" : `${((part * 100) / whole).toFixed(1)}%`);
const day = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric" });
const STATUS = { RUNNING: "Running", SCHEDULED: "Scheduled", PAUSED: "Paused", ENDED: "Ended" } as const;

/**
 * What an advertiser sees through their private link: how their ad did, in counts. No sign-in. It never shows what the ad costs, other
 * advertisers, or anything about the people who saw it (nothing like that is kept).
 */
export default function AdReportPage() {
  usePageMeta({ title: "Ad report - Privlee", index: false });
  const { token = "" } = useParams();
  const [report, setReport] = useState<AdReport | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api
      .getAdReport(token)
      .then(setReport)
      .catch(() => setMissing(true));
  }, [token]);

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-5">
          <Logo className="h-8" />
          <span className="text-xs uppercase tracking-[0.25em] text-muted">Sponsored ad report</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-5">
        {missing && (
          <div className="rounded-lg border border-line bg-white p-8 text-center">
            <h1 className="font-display text-2xl">This link is not available</h1>
            <p className="mt-2 text-sm text-muted">It may have ended, or been replaced by a new one. Ask your Privlee contact for the current link.</p>
          </div>
        )}
        {!missing && !report && <p className="text-muted">Loading...</p>}
        {report && <Body report={report} token={token} />}
      </main>
    </div>
  );
}

function Body({ report: r, token }: { report: AdReport; token: string }) {
  const f = r.total;
  const csv = `${API_ORIGIN}/api/ad-reports/csv?t=${encodeURIComponent(token)}`;
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{r.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {STATUS[r.status]} - {day(r.startsAt)} {r.endsAt ? `to ${day(r.endsAt)}` : "with no end date"}
          </p>
        </div>
        <a href={csv} className="rounded border border-line bg-white px-4 py-2 text-sm transition hover:border-gold">
          Download as spreadsheet
        </a>
      </div>

      <div className="mt-5">
        <SponsoredCard ad={{ id: "preview", title: r.title, body: r.body, ctaLabel: r.ctaLabel, imagePath: r.imagePath, clickPath: "", label: "Sponsored", offerText: r.offerText, hasCode: r.hasCode }} preview />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Shown" value={n(f.delivered)} hint="times the ad was given to a screen" />
        <Tile label="Seen" value={pct(f.seen, f.measured)} hint={`at least half on screen for a second (${n(f.seen)} times)`} />
        <Tile label="Clicked" value={n(f.clicks)} hint="opened your page" />
        <Tile label="Click rate" value={pct(f.clicks, f.delivered)} hint="clicks out of showings" />
      </div>
      {(r.hasCode || r.tracksConversions) && (
        <section className="mt-3 rounded-lg border border-line bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">After the click{r.offerText ? `: ${r.offerText}` : ""}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {r.hasCode && <Tile label="Code shown" value={n(f.reveals)} hint={`${pct(f.reveals, f.delivered)} of showings; people who tapped Show code`} />}
            {r.hasCode && <Tile label="Redeemed" value={n(r.redeemed)} hint={`reported to Privlee${f.reveals > 0 ? `, ${pct(r.redeemed, f.reveals)} of codes shown` : ""}`} />}
            {r.tracksConversions && <Tile label="Conversions" value={n(f.conversions)} hint={`reported by your server${f.clicks > 0 ? `, ${pct(f.conversions, f.clicks)} of clicks` : ""}`} />}
          </div>
        </section>
      )}
      {r.sold != null && (
        <section className="mt-3 rounded-lg border border-line bg-white p-4">
          <div className="flex justify-between text-sm tabular-nums">
            <span>Showings delivered</span>
            <span>{n(f.delivered)} of {n(r.sold)} ({pct(f.delivered, r.sold)})</span>
          </div>
          <div className="mt-2 h-2 rounded bg-line/60">
            <div className="h-2 rounded bg-gold" style={{ width: `${Math.min(100, (f.delivered * 100) / Math.max(1, r.sold))}%` }} />
          </div>
        </section>
      )}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <MiniBarChart series={{ key: "shown", label: "Shown per day", points: r.daily.map((d) => ({ day: d.day, value: d.shown })) }} />
        <MiniBarChart series={{ key: "clicked", label: "Clicked per day", points: r.daily.map((d) => ({ day: d.day, value: d.clicked })) }} />
      </div>

      <section className="mt-3 rounded-lg border border-line bg-white p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Where it was shown</h2>
        <table className="mt-2 w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1 font-normal" />
              <th className="py-1 text-right font-normal">Shown</th>
              <th className="py-1 text-right font-normal">Seen</th>
              <th className="py-1 text-right font-normal">Clicked</th>
              <th className="py-1 text-right font-normal">Click rate</th>
            </tr>
          </thead>
          <tbody>
            {([["Website", r.web], ["Android app", r.android], ...r.byPlacement.map((p) => [PLACE[p.placement] ?? p.placement, p.funnel])] as [string, AdFunnel][]).map(([label, x]) => (
              <tr key={label} className="border-t border-line/60 tabular-nums">
                <td className="py-1.5">{label}</td>
                <td className="py-1.5 text-right">{n(x.delivered)}</td>
                <td className="py-1.5 text-right">{pct(x.seen, x.measured)}</td>
                <td className="py-1.5 text-right">{n(x.clicks)}</td>
                <td className="py-1.5 text-right">{pct(x.clicks, x.delivered)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">
          About {n(f.firstTime)} showings ({pct(f.firstTime, f.delivered)}) went to a phone or browser that had not shown this ad in the previous week: a rough sign of
          new people reached. "Seen" is only known for the showings where the website or app could report it.
        </p>
      </section>

      <p className="mt-6 text-xs text-muted">
        Privlee keeps only counts. Who saw or clicked an ad is never recorded, so these are totals, not people. Updated {new Date(r.generatedAt).toLocaleString()}.
        {r.validUntil ? ` This link works until ${day(r.validUntil)}.` : ""}
      </p>
    </>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="h-full rounded-lg border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
    </div>
  );
}
