import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { API_ORIGIN } from "../lib/apiBase";
import { api } from "../lib/api";
import { SponsoredCard } from "../components/SponsoredSlot";
import MiniBarChart from "./MiniBarChart";
import LocationTargeting from "./LocationTargeting";
import AdSettingsPanel from "./AdSettingsPanel";
import type { AdCounts, AdDay, AdForm, AdPlacement, AdStatus, AdminAd, AdsOverview } from "../lib/types";

const PLACEMENTS: { value: AdPlacement; label: string; hint: string }[] = [
  { value: "DISCOVER", label: "Discover", hint: "Between the Nearby and New here sections" },
  { value: "LIKES", label: "Likes", hint: "At the bottom of the Likes page" },
  { value: "MATCHES", label: "Matches", hint: "At the bottom of the Matches page" },
  { value: "CONVERSATION", label: "Inside a conversation", hint: "A labelled card between the messages of a chat, never among the latest ones" },
  { value: "MESSAGES", label: "Messages list", hint: "A row between conversations (after the 4th, then every 8th), or at the bottom of a short list. Never inside a chat" },
];

const STATUS: Record<AdStatus, { label: string; tone: string }> = {
  RUNNING: { label: "Running", tone: "bg-green-100 text-green-800" },
  SCHEDULED: { label: "Scheduled", tone: "bg-blue-100 text-blue-800" },
  PAUSED: { label: "Paused", tone: "bg-gray-200 text-gray-700" },
  ENDED: { label: "Ended", tone: "bg-gray-200 text-gray-700" },
  LIMIT_REACHED: { label: "Limit reached", tone: "bg-amber-100 text-amber-800" },
};

const inputClass = "mt-1 w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-gold";
const labelClass = "text-xs font-semibold uppercase tracking-wider text-muted";
const n = (v: number) => v.toLocaleString();
/** Clicks as a share of showings. */
const rate = (c: AdCounts) => (c.impressions === 0 ? "0.0%" : `${((c.clicks * 100) / c.impressions).toFixed(1)}%`);
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "-");

/** A date-time as the browser's date picker wants it, in the admin's own time zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : "");

const emptyForm: AdForm = {
  advertiser: "",
  title: "",
  body: "",
  ctaLabel: "Learn more",
  targetUrl: "https://",
  placements: ["DISCOVER"],
  locations: [],
  startsAt: "",
  endsAt: "",
  weight: 1,
  impressionCap: "",
  // Sensible defaults for a new ad; clear a box for no limit.
  maxPerDay: "2",
  minGapHours: "6",
};

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="h-full rounded-lg border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const sum = (days: AdDay[], pick: (d: AdDay) => number) => days.map((d) => ({ day: d.day, value: pick(d) }));

export default function AdsPage() {
  const [data, setData] = useState<AdsOverview | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<AdminAd | "new" | null>(null);
  const [form, setForm] = useState<AdForm>(emptyForm);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openStats, setOpenStats] = useState<string | null>(null);
  const [daily, setDaily] = useState<AdDay[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api
      .getAdsOverview()
      .then((d) => {
        setData(d);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  // A picture chosen but not yet saved is shown from the browser's own copy.
  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function startNew() {
    setEditing("new");
    setForm(emptyForm);
    setImage(null);
    setRemoveImage(false);
    setError(null);
    setNotice(null);
    if (fileInput.current) fileInput.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(ad: AdminAd) {
    setEditing(ad);
    setForm({
      advertiser: ad.advertiser,
      title: ad.title,
      body: ad.body ?? "",
      ctaLabel: ad.ctaLabel,
      targetUrl: ad.targetUrl,
      placements: ad.placements,
      locations: ad.locations.map((l) => l.key),
      startsAt: toLocalInput(ad.startsAt),
      endsAt: toLocalInput(ad.endsAt),
      weight: ad.weight,
      impressionCap: ad.impressionCap == null ? "" : String(ad.impressionCap),
      maxPerDay: ad.maxPerDay == null ? "" : String(ad.maxPerDay),
      minGapHours: ad.minGapHours == null ? "" : String(ad.minGapHours),
    });
    setImage(null);
    setRemoveImage(false);
    setError(null);
    setNotice(null);
    if (fileInput.current) fileInput.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancel() {
    setEditing(null);
    setImage(null);
    setError(null);
  }

  const set = <K extends keyof AdForm>(key: K, value: AdForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (form.placements.length === 0) {
      setError("Tick at least one place for the ad to show.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload: AdForm = { ...form, startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt) };
      const id = editing && editing !== "new" ? editing.id : null;
      const saved = await api.saveAd(id, payload, image, removeImage);
      setNotice(id ? `"${saved.title}" is saved. Changes are live straight away.` : `"${saved.title}" is created.`);
      setEditing(null);
      setImage(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that ad");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(ad: AdminAd) {
    setBusy(ad.id);
    setError(null);
    setNotice(null);
    try {
      await api.setAdActive(ad.id, !ad.active);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change that ad");
    } finally {
      setBusy(null);
    }
  }

  async function remove(ad: AdminAd) {
    if (
      !window.confirm(
        `Delete "${ad.title}" for ${ad.advertiser}? Its picture and its numbers (${n(ad.total.impressions)} shown, ${n(ad.total.clicks)} clicked) are deleted too. ` +
          "To keep the numbers, pause it instead.",
      )
    ) {
      return;
    }
    setBusy(ad.id);
    setError(null);
    setNotice(null);
    try {
      await api.deleteAd(ad.id);
      setNotice(`"${ad.title}" is deleted.`);
      if (openStats === ad.id) setOpenStats(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that ad");
    } finally {
      setBusy(null);
    }
  }

  async function showStats(ad: AdminAd) {
    if (openStats === ad.id) {
      setOpenStats(null);
      return;
    }
    setOpenStats(ad.id);
    setDaily(null);
    try {
      setDaily(await api.getAdDaily(ad.id, 30));
    } catch {
      setDaily([]);
    }
  }

  if (failed) return <p className="text-muted">Could not load ads.</p>;
  if (!data) return <p className="text-muted">Loading...</p>;

  const s = data.summary;
  const existingImage = editing && editing !== "new" && editing.hasImage && !removeImage ? editing.imagePath : null;
  const previewImage = preview ?? existingImage;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sponsored ads</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Create, change, pause and measure the ads shown to members on the website and in the Android app. Changes are live
            straight away; nothing needs a new release. Only counts are kept: who saw or clicked an ad is never recorded.
          </p>
        </div>
        {editing === null && (
          <button onClick={startNew} className="rounded bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-gold">
            New ad
          </button>
        )}
      </div>

      <AdSettingsPanel settings={data.settings} switchedOffOnServer={data.switchedOffOnServer} onSaved={load} />
      {error && <p role="alert" className="mt-4 rounded border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">{notice}</p>}

      {editing !== null && (
        <form onSubmit={save} className="mt-6 rounded-lg border border-line bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            {editing === "new" ? "New ad" : `Edit "${editing.title}"`}
          </h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="ad-advertiser">Advertiser (only you see this)</label>
                <input id="ad-advertiser" className={inputClass} value={form.advertiser} maxLength={120} required onChange={(e) => set("advertiser", e.target.value)} placeholder="Acme Hotels" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="ad-title">Headline</label>
                <input id="ad-title" className={inputClass} value={form.title} maxLength={80} required onChange={(e) => set("title", e.target.value)} placeholder="A weekend away" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="ad-body">Text (optional)</label>
                <input id="ad-body" className={inputClass} value={form.body} maxLength={160} onChange={(e) => set("body", e.target.value)} placeholder="Rooms from 3,000 a night" />
              </div>
              <div>
                <label className={labelClass} htmlFor="ad-cta">Button text</label>
                <input id="ad-cta" className={inputClass} value={form.ctaLabel} maxLength={24} onChange={(e) => set("ctaLabel", e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="ad-url">Link (https only)</label>
                <input id="ad-url" className={inputClass} value={form.targetUrl} maxLength={500} required onChange={(e) => set("targetUrl", e.target.value)} />
              </div>
              <fieldset>
                <legend className={labelClass}>Show it on (tick one or more)</legend>
                <div className="mt-2 space-y-1.5">
                  {PLACEMENTS.map((p) => (
                    <label key={p.value} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={form.placements.includes(p.value)}
                        onChange={(e) =>
                          set(
                            "placements",
                            PLACEMENTS.map((x) => x.value).filter((v) => (v === p.value ? e.target.checked : form.placements.includes(v))),
                          )
                        }
                      />
                      <span>
                        {p.label}
                        <span className="block text-xs text-muted">{p.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  One ad, several places: its limits (times a day, wait, showings sold) cover all of them together.
                </p>
              </fieldset>
              <div className="sm:col-span-2">
                <LocationTargeting value={form.locations} onChange={(keys) => set("locations", keys)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="ad-start">Starts (blank = now)</label>
                <input id="ad-start" type="datetime-local" className={inputClass} value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="ad-end">Ends (blank = no end)</label>
                <input id="ad-end" type="datetime-local" className={inputClass} value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="ad-weight">Share of the slot (1-10)</label>
                <input id="ad-weight" type="number" min={1} max={10} className={inputClass} value={form.weight} onChange={(e) => set("weight", Number(e.target.value) || 1)} />
                <p className="mt-1 text-xs text-muted">When several ads run in the same place, a 2 shows twice as often as a 1.</p>
              </div>
              <div>
                <label className={labelClass} htmlFor="ad-cap">Showings sold (optional)</label>
                <input id="ad-cap" type="number" min={1} className={inputClass} value={form.impressionCap} onChange={(e) => set("impressionCap", e.target.value)} placeholder="No limit" />
                <p className="mt-1 text-xs text-muted">The ad stops by itself after this many showings.</p>
              </div>
              <div>
                <label className={labelClass} htmlFor="ad-perday">Most times a day, per person</label>
                <input id="ad-perday" type="number" min={1} max={50} className={inputClass} value={form.maxPerDay} onChange={(e) => set("maxPerDay", e.target.value)} placeholder="No limit" />
                <p className="mt-1 text-xs text-muted">The same person is shown this ad at most this often in one day.</p>
              </div>
              <div>
                <label className={labelClass} htmlFor="ad-gap">Hours before it shows again</label>
                <input id="ad-gap" type="number" min={0} max={168} className={inputClass} value={form.minGapHours} onChange={(e) => set("minGapHours", e.target.value)} placeholder="No wait" />
                <p className="mt-1 text-xs text-muted">After one person sees it, at least this long before they see it again.</p>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="ad-image">Picture (optional; JPEG, PNG or WebP, up to {Math.round(data.maxImageKb / 1024)} MB; square works best)</label>
                <input
                  id="ad-image"
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => {
                    setImage(e.target.files?.[0] ?? null);
                    setRemoveImage(false);
                  }}
                />
                {editing !== "new" && editing.hasImage && !image && (
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />
                    Remove the current picture
                  </label>
                )}
              </div>
            </div>

            <div>
              <p className={labelClass}>Preview (what members see)</p>
              <div className="mt-2 rounded-2xl bg-[#f6efe3] p-4">
                <SponsoredCard
                  preview
                  ad={{
                    id: "preview",
                    title: form.title || "Your headline",
                    body: form.body || null,
                    ctaLabel: form.ctaLabel || "Learn more",
                    imagePath: previewImage,
                    clickPath: "",
                    label: "Sponsored",
                  }}
                />
              </div>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button type="submit" disabled={saving} className="rounded bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-50">
              {saving ? "Saving..." : editing === "new" ? "Create ad" : "Save changes"}
            </button>
            <button type="button" onClick={cancel} className="rounded border border-line px-5 py-2 text-sm transition hover:border-gold">
              Cancel
            </button>
          </div>
        </form>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted">All ads, last 30 days</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Running now" value={n(s.runningNow)} hint={`${n(s.totalCampaigns)} ads in all`} />
        <Tile label="Shown" value={n(s.last30Days.impressions)} hint={`${n(s.today.impressions)} today, ${n(s.last7Days.impressions)} in 7 days`} />
        <Tile label="Clicked" value={n(s.last30Days.clicks)} hint={`${n(s.today.clicks)} today, ${n(s.last7Days.clicks)} in 7 days`} />
        <Tile label="Click rate" value={rate(s.last30Days)} hint="clicks as a share of showings" />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <MiniBarChart series={{ key: "ads-shown", label: "Shown per day", points: sum(s.daily, (d) => d.impressionsWeb + d.impressionsAndroid) }} />
        <MiniBarChart series={{ key: "ads-clicked", label: "Clicked per day", points: sum(s.daily, (d) => d.clicksWeb + d.clicksAndroid) }} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Breakdown title="By platform (30 days)" rows={[["Website", s.web30Days], ["Android app", s.android30Days]]} />
        <Breakdown
          title="By placement (30 days)"
          rows={s.byPlacement.map((p) => [PLACEMENTS.find((x) => x.value === p.placement)?.label ?? p.placement, p.last30Days] as [string, AdCounts])}
        />
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted">Ads</h2>
      <div className="mt-3 space-y-3">
        {data.ads.length === 0 && (
          <p className="rounded-lg border border-line bg-white px-4 py-8 text-center text-muted">
            No ads yet. Press "New ad" to create the first one.
          </p>
        )}
        {data.ads.map((ad) => (
          <article key={ad.id} className="rounded-lg border border-line bg-white p-4">
            <div className="flex flex-wrap items-start gap-4">
              {ad.imagePath ? (
                <img src={`${API_ORIGIN}${ad.imagePath}`} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-[#f4f2ee] text-xs text-muted">no picture</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{ad.title}</h3>
                  <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${STATUS[ad.status].tone}`}>
                    {STATUS[ad.status].label}
                  </span>
                  {ad.placements.map((pl) => (
                    <span key={pl} className="rounded border border-line px-2 py-0.5 text-[11px] uppercase tracking-wider text-muted">
                      {PLACEMENTS.find((p) => p.value === pl)?.label}
                    </span>
                  ))}
                  {ad.locations.map((l) => (
                    <span key={l.key} className="rounded border border-gold/60 px-2 py-0.5 text-[11px] uppercase tracking-wider text-gold" title="Shown only to members in this place">
                      {l.label}
                    </span>
                  ))}
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {ad.advertiser} - <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{ad.targetUrl}</a>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  From {when(ad.startsAt)} {ad.endsAt ? `to ${when(ad.endsAt)}` : "with no end"} - share {ad.weight}
                  {ad.maxPerDay != null && ` - at most ${ad.maxPerDay} a day per person`}
                  {ad.minGapHours != null && ad.minGapHours > 0 && `, ${ad.minGapHours} h apart`}
                  {ad.impressionCap != null && ` - ${n(ad.remaining ?? 0)} of ${n(ad.impressionCap)} showings left`}
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-x-6 text-right text-sm tabular-nums">
                <div><dt className="text-[11px] uppercase tracking-wider text-muted">Shown</dt><dd className="text-lg font-semibold">{n(ad.total.impressions)}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wider text-muted">Clicked</dt><dd className="text-lg font-semibold">{n(ad.total.clicks)}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wider text-muted">Click rate</dt><dd className="text-lg font-semibold">{rate(ad.total)}</dd></div>
              </dl>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => startEdit(ad)} disabled={busy !== null} className="rounded border border-line px-3 py-1 text-xs transition hover:border-gold disabled:opacity-50">Edit</button>
              <button onClick={() => toggle(ad)} disabled={busy !== null} className="rounded border border-line px-3 py-1 text-xs transition hover:border-gold disabled:opacity-50">
                {busy === ad.id ? "..." : ad.active ? "Pause" : "Resume"}
              </button>
              <button onClick={() => showStats(ad)} className="rounded border border-line px-3 py-1 text-xs transition hover:border-gold">
                {openStats === ad.id ? "Hide numbers" : "Numbers"}
              </button>
              <button onClick={() => remove(ad)} disabled={busy !== null} className="rounded border border-line px-3 py-1 text-xs text-danger transition hover:border-danger disabled:opacity-50">Delete</button>
            </div>
            {openStats === ad.id && (
              <div className="mt-4 border-t border-line/60 pt-4">
                {daily === null ? (
                  <p className="text-sm text-muted">Loading...</p>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <MiniBarChart series={{ key: `shown-${ad.id}`, label: "Shown per day", points: sum(daily, (d) => d.impressionsWeb + d.impressionsAndroid) }} />
                      <MiniBarChart series={{ key: `clicked-${ad.id}`, label: "Clicked per day", points: sum(daily, (d) => d.clicksWeb + d.clicksAndroid) }} />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Breakdown title="Whole run, by platform" rows={[["Website", ad.web], ["Android app", ad.android]]} />
                      {ad.placements.length > 1 && (
                        <Breakdown
                          title="Whole run, by place"
                          rows={ad.placements.map(
                            (pl) =>
                              [
                                PLACEMENTS.find((p) => p.value === pl)?.label ?? pl,
                                ad.byPlacement.find((b) => b.placement === pl)?.counts ?? { impressions: 0, clicks: 0 },
                              ] as [string, AdCounts],
                          )}
                        />
                      )}
                      <Breakdown title="Today and the last 7 days" rows={[["Today", ad.today], ["Last 7 days", ad.last7Days], ["Whole run", ad.total]]} />
                    </div>
                  </>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: [string, AdCounts][] }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      <table className="mt-2 w-full text-sm">
        <thead className="text-left text-xs text-muted">
          <tr><th className="py-1 font-normal" /><th className="py-1 text-right font-normal">Shown</th><th className="py-1 text-right font-normal">Clicked</th><th className="py-1 text-right font-normal">Click rate</th></tr>
        </thead>
        <tbody>
          {rows.map(([label, c]) => (
            <tr key={label} className="border-t border-line/60 tabular-nums">
              <td className="py-1.5">{label}</td>
              <td className="py-1.5 text-right">{n(c.impressions)}</td>
              <td className="py-1.5 text-right">{n(c.clicks)}</td>
              <td className="py-1.5 text-right">{rate(c)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
