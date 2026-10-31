import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { API_ORIGIN } from "../lib/apiBase";
import { api } from "../lib/api";
import { SponsoredCard } from "../components/SponsoredSlot";
import MiniBarChart from "./MiniBarChart";
import LocationTargeting from "./LocationTargeting";
import AdSettingsPanel from "./AdSettingsPanel";
import type { AdCounts, AdDay, AdFunnel, AdPacingState, AdForm, AdPlacement, AdRedemption, AdStatus, AdminAd, AdsOverview } from "../lib/types";
import RefreshButton from "./RefreshButton";
import AdPolicyPanel from "./AdPolicyPanel";
import { CreativesPanel, FlagsPanel, ReviewBar } from "./AdCreativesPanel";

const PLACEMENTS: { value: AdPlacement; label: string; hint: string }[] = [
  { value: "DISCOVER", label: "Discover", hint: "Between the Nearby and New here sections" },
  { value: "LIKES", label: "Likes", hint: "At the bottom of the Likes page" },
  { value: "MATCHES", label: "Matches", hint: "At the bottom of the Matches page" },
  { value: "CONVERSATION", label: "Inside a conversation", hint: "A labelled card between the messages of a chat, never among the latest ones" },
  { value: "MESSAGES", label: "Messages list", hint: "A row between conversations (after the 4th, then every 8th), or at the bottom of a short list. Never inside a chat" },
];

const STATUS: Record<AdStatus, { label: string; tone: string }> = {
  DRAFT: { label: "Waiting for approval", tone: "bg-amber-100 text-amber-800" },
  REJECTED: { label: "Rejected", tone: "bg-red-100 text-red-800" },
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
const pct = (part: number, whole: number) => (whole === 0 ? "-" : `${((part * 100) / whole).toFixed(1)}%`);
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
  priceModel: "",
  priceRupees: "",
  offerText: "",
  offerCode: "",
  trackConversions: false,
  category: "OTHER",
  daysMask: 127,
  hoursFrom: "",
  hoursTo: "",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PACING: Record<AdPacingState, { label: string; tone: string }> = {
  NOT_STARTED: { label: "Not started", tone: "bg-gray-200 text-gray-700" },
  ON_TRACK: { label: "On track", tone: "bg-green-100 text-green-800" },
  BEHIND: { label: "Behind", tone: "bg-amber-100 text-amber-800" },
  AHEAD: { label: "Ahead", tone: "bg-blue-100 text-blue-800" },
  DONE: { label: "Delivered", tone: "bg-green-100 text-green-800" },
  ENDED_SHORT: { label: "Ended short", tone: "bg-red-100 text-red-800" },
};
const rupees = (v: number) => `\u20b9${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

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

  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(() => {
    return api
      .getAdsOverview()
      .then((d) => {
        setData(d);
        setFailed(false);
        setUpdatedAt(new Date());
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // The numbers move while the page is open. Refresh keeps what is on screen (and any form being filled in) and
  // also re-reads the daily chart of the ad whose numbers are open.
  async function refresh() {
    setRefreshing(true);
    try {
      await load();
      if (openStats) {
        try {
          setDaily(await api.getAdDaily(openStats, 30));
        } catch {
          /* keep the chart that is showing */
        }
      }
    } finally {
      setRefreshing(false);
    }
  }

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
      priceModel: ad.pricing?.model ?? "",
      priceRupees: ad.pricing ? String(ad.pricing.rupees) : "",
      offerText: ad.offer?.text ?? "",
      offerCode: ad.offer?.code ?? "",
      trackConversions: ad.tracking.enabled,
      category: ad.category,
      daysMask: ad.schedule.days,
      hoursFrom: ad.schedule.from == null ? "" : String(ad.schedule.from),
      hoursTo: ad.schedule.to == null ? "" : String(ad.schedule.to),
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
  const waiting = data.ads.filter((ad) => ad.review.status === "DRAFT");
  const attention = data.ads.filter((ad) => ad.status === "RUNNING" && ad.pacing?.state === "BEHIND");
  // Money counts only for ads that have been approved: a Draft or rejected ad has earned nothing yet.
  const priced = data.ads.filter((ad) => ad.pricing && ad.review.status === "APPROVED");
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
        <div className="flex flex-wrap items-center gap-3">
          <RefreshButton onClick={refresh} busy={refreshing} updatedAt={updatedAt} />
          {editing === null && (
            <button onClick={startNew} className="rounded bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-gold">
              New ad
            </button>
          )}
        </div>
      </div>

      <AdSettingsPanel settings={data.settings} switchedOffOnServer={data.switchedOffOnServer} onSaved={load} />
      <AdPolicyPanel policy={data.policy} categories={data.categories} onSaved={load} />
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
                <label className={labelClass} htmlFor="ad-category">Kind of advertiser</label>
                <select id="ad-category" className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value)}>
                  {data.categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted">
                  {data.policy.blockedCategories.includes(form.category) ? "This kind of advertiser is refused by the policy, so it cannot be saved." : "Some kinds are refused by the policy; saving tells you if this one is."}
                </p>
              </div>
              <fieldset className="rounded border border-line p-3 sm:col-span-2">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">When it runs (India time)</legend>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {DAYS.map((d, i) => (
                    <label key={d} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={(form.daysMask & (1 << i)) !== 0}
                        onChange={(e) => set("daysMask", e.target.checked ? form.daysMask | (1 << i) : form.daysMask & ~(1 << i))}
                      />
                      {d}
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="text-xs text-muted">
                    From hour
                    <select aria-label="First hour" className="mt-1 block rounded border border-line px-2 py-1.5 text-sm text-ink" value={form.hoursFrom} onChange={(e) => set("hoursFrom", e.target.value)}>
                      <option value="">All day</option>
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-muted">
                    Until
                    <select aria-label="Last hour" className="mt-1 block rounded border border-line px-2 py-1.5 text-sm text-ink" value={form.hoursTo} onChange={(e) => set("hoursTo", e.target.value)}>
                      <option value="">All day</option>
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h + 1} value={h + 1}>{String(h + 1).padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Tick the days, and optionally the hours. The last hour can be earlier than the first for an overnight window (22:00 to 02:00 belongs to the day it starts on). Leave both hours on "All day" to run all day.
                  {form.daysMask === 0 && " Tick at least one day."}
                </p>
              </fieldset>
              <div>
                <label className={labelClass} htmlFor="ad-price-model">What it is sold for (private)</label>
                <div className="mt-1 flex gap-2">
                  <select
                    id="ad-price-model"
                    className="rounded border border-line px-3 py-2 text-sm outline-none focus:border-gold"
                    value={form.priceModel}
                    onChange={(e) => set("priceModel", e.target.value as AdForm["priceModel"])}
                  >
                    <option value="">Not recorded</option>
                    <option value="FLAT">A fee for the whole run</option>
                    <option value="CPM">A rate per 1,000 showings</option>
                  </select>
                  {form.priceModel && (
                    <input
                      aria-label="Amount in rupees"
                      type="number"
                      min={0}
                      step="0.01"
                      className={`${inputClass} !mt-0`}
                      value={form.priceRupees}
                      onChange={(e) => set("priceRupees", e.target.value)}
                      placeholder={form.priceModel === "FLAT" ? "Fee in rupees" : "Rupees per 1,000"}
                    />
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">Only you see this. It works out what the ad has earned. The advertiser's link never shows it.</p>
              </div>
              <fieldset className="rounded border border-line p-3 sm:col-span-2">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">Offer (optional)</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="ad-offer-text">Offer line</label>
                    <input id="ad-offer-text" maxLength={80} className={inputClass} value={form.offerText} onChange={(e) => set("offerText", e.target.value)} placeholder="15% off your first booking" />
                    <p className="mt-1 text-xs text-muted">Shown on the card. {form.offerText.length}/80</p>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ad-offer-code">Code (optional)</label>
                    <input id="ad-offer-code" maxLength={32} className={`${inputClass} font-mono`} value={form.offerCode} onChange={(e) => set("offerCode", e.target.value)} placeholder="PRIVLEE15" disabled={!form.offerText.trim()} />
                    <p className="mt-1 text-xs text-muted">Not shown until a member taps "Show code", so every tap is counted. 3 to 32 letters, numbers, - or _.</p>
                  </div>
                </div>
                <label className="mt-3 flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={form.trackConversions} onChange={(e) => set("trackConversions", e.target.checked)} />
                  <span>
                    Let the advertiser report sign-ups or bookings
                    <span className="block text-xs text-muted">
                      Each click adds a random <code>privlee_click</code> token to their link. It is not linked to any member. Their server sends it back to a
                      Privlee address with a secret key (shown on the ad once saved), and the report counts it. Tokens are deleted after 30 days.
                    </span>
                  </span>
                </label>
              </fieldset>
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
                    offerText: form.offerText.trim() || null,
                    hasCode: !!form.offerText.trim() && !!form.offerCode.trim(),
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

      <div className="mt-3">
        <FunnelPanel title="How people respond (30 days)" funnel={s.funnel30Days} />
        <p className="mt-1 text-xs text-muted">
          Seen and closed are only counted where the website or the app reports them, so they start from the day each was updated.
          Open an ad's Numbers for the split by website, app and place.
        </p>
      </div>

      {waiting.length > 0 && (
        <section role="status" className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Waiting for approval ({waiting.length})</h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {waiting.map((ad) => (
              <li key={ad.id}>
                <strong>{ad.title}</strong> ({ad.advertiser}) - approve or reject it on its card below. Members do not see it until it is approved.
              </li>
            ))}
          </ul>
        </section>
      )}
      {attention.length > 0 && (
        <section role="status" className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Needs attention</h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {attention.map((ad) => (
              <li key={ad.id}>
                <strong>{ad.title}</strong> ({ad.advertiser}) is behind: {ad.pacing!.deliveredPercent}% of its showings are delivered, about{" "}
                {n(ad.pacing!.expected)} should be by now. It ends {when(ad.endsAt)}. More places, a bigger share of the slot or fewer limits per person would speed it up.
              </li>
            ))}
          </ul>
        </section>
      )}
      {priced.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Booked" value={rupees(priced.reduce((a, ad) => a + ad.pricing!.bookedRupees, 0))} hint={`${priced.length} priced ads`} />
          <Tile label="Earned so far" value={rupees(priced.reduce((a, ad) => a + ad.pricing!.earnedRupees, 0))} hint="counted day by day, or by showings" />
        </div>
      )}

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
                  {ad.status === "RUNNING" && !ad.schedule.onNow && (
                    <span className="rounded bg-gray-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-700" title={`Its hours: ${ad.schedule.text}`}>
                      Outside its hours
                    </span>
                  )}
                  {ad.openReports > 0 && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-red-800" title="Member reports in the last 7 days that nobody has dismissed">
                      {ad.openReports} report{ad.openReports === 1 ? "" : "s"}
                    </span>
                  )}
                  {ad.pacing && (
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${PACING[ad.pacing.state].tone}`}
                      title={`${ad.pacing.deliveredPercent}% of the showings sold are delivered; about ${n(ad.pacing.expected)} should be by now`}
                    >
                      {PACING[ad.pacing.state].label}
                    </span>
                  )}
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
                  {data.categories.find((c) => c.value === ad.category)?.label ?? ad.category} - {ad.advertiser} - <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{ad.targetUrl}</a>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  From {when(ad.startsAt)} {ad.endsAt ? `to ${when(ad.endsAt)}` : "with no end"} - share {ad.weight}
                  {ad.maxPerDay != null && ` - at most ${ad.maxPerDay} a day per person`}
                  {ad.minGapHours != null && ad.minGapHours > 0 && `, ${ad.minGapHours} h apart`}
                  {ad.impressionCap != null && ` - ${n(ad.remaining ?? 0)} of ${n(ad.impressionCap)} showings left`}
                  {ad.schedule.text !== "Every day" && ` - runs ${ad.schedule.text}`}
                </p>
                {ad.pricing && (
                  <p className="mt-0.5 text-xs text-muted">
                    {ad.pricing.model === "FLAT" ? `Fee ${rupees(ad.pricing.rupees)}` : `${rupees(ad.pricing.rupees)} per 1,000`}
                    {" - "}earned {rupees(ad.pricing.earnedRupees)} of {rupees(ad.pricing.bookedRupees)} booked
                    {ad.pricing.costPerClick != null && ` - ${rupees(ad.pricing.costPerClick)} per click`}
                    {ad.pricing.perThousandShown != null && ` - ${rupees(ad.pricing.perThousandShown)} per 1,000 shown`}
                  </p>
                )}
              </div>
              <dl className="grid grid-cols-3 gap-x-6 text-right text-sm tabular-nums">
                <div><dt className="text-[11px] uppercase tracking-wider text-muted">Shown</dt><dd className="text-lg font-semibold">{n(ad.total.impressions)}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wider text-muted">Clicked</dt><dd className="text-lg font-semibold">{n(ad.total.clicks)}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wider text-muted">Click rate</dt><dd className="text-lg font-semibold">{rate(ad.total)}</dd></div>
              </dl>
            </div>
            <ReviewBar ad={ad} onChanged={load} onError={(m) => setError(m)} />
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
                      <FunnelPanel
                        title="From shown to clicked, whole run"
                        funnel={ad.funnel}
                        redeemed={ad.redeemed}
                        offer={!!ad.offer?.code}
                        tracked={ad.tracking.enabled}
                        rows={[
                          ["Website", ad.funnelWeb],
                          ["Android app", ad.funnelAndroid],
                          ...(ad.placements.length > 1
                            ? ad.placements.map(
                                (pl) =>
                                  [PLACEMENTS.find((p) => p.value === pl)?.label ?? pl, ad.byPlacement.find((b) => b.placement === pl)?.funnel ?? emptyFunnel] as [string, AdFunnel],
                              )
                            : []),
                        ]}
                      />
                      <CreativesPanel ad={ad} onChanged={load} />
                      <FlagsPanel ad={ad} onChanged={load} />
                      {(ad.offer || ad.tracking.enabled || ad.redeemed > 0) && <OfferPanel ad={ad} onChanged={load} />}
                      <ReportLinkPanel ad={ad} onChanged={load} />
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

/**
 * Shown -> seen -> clicked, with who closed it and how many were new. "Seen" and "closed" are judged against the showings that were
 * measured (older apps cannot say), so a few old installs do not make the rate look worse than it is.
 */
function FunnelPanel({
  title,
  funnel,
  rows,
  redeemed,
  offer = false,
  tracked = false,
}: {
  title: string;
  funnel: AdFunnel;
  rows?: [string, AdFunnel][];
  /** What the advertiser reported redeemed (a whole-run figure, so only given for one ad). */
  redeemed?: number;
  /** Show the steps after the click: the ad has an offer code, or conversions are tracked. */
  offer?: boolean;
  tracked?: boolean;
}) {
  const top = Math.max(1, funnel.delivered);
  const steps: [string, number, string][] = [
    ["Shown", funnel.delivered, "every time a screen was given the ad"],
    ["Seen", funnel.seen, `at least half on screen for a second, of ${n(funnel.measured)} measured showings`],
    ["Clicked", funnel.clicks, "opened the advertiser's page"],
    ["Closed", funnel.hidden, "pressed the x"],
    ...(offer || funnel.reveals > 0 ? ([["Code shown", funnel.reveals, "members who tapped Show code"]] as [string, number, string][]) : []),
    ...(redeemed !== undefined && (offer || redeemed > 0) ? ([["Redeemed", redeemed, "what the advertiser says was used, entered by an admin"]] as [string, number, string][]) : []),
    ...(tracked || funnel.conversions > 0 ? ([["Conversions", funnel.conversions, "sign-ups or bookings the advertiser's server reported against a click"]] as [string, number, string][]) : []),
  ];
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      <div className="mt-3 space-y-2">
        {steps.map(([label, value, hint]) => (
          <div key={label}>
            <div className="flex items-baseline justify-between text-sm tabular-nums">
              <span>{label}</span>
              <span>
                {n(value)}
                {label === "Seen" && <span className="ml-2 text-xs text-muted">{pct(funnel.seen, funnel.measured)} of measured</span>}
                {label === "Clicked" && <span className="ml-2 text-xs text-muted">{pct(funnel.clicks, funnel.delivered)} of shown</span>}
                {label === "Closed" && <span className="ml-2 text-xs text-muted">{pct(funnel.hidden, funnel.measured)} of measured</span>}
                {label === "Code shown" && <span className="ml-2 text-xs text-muted">{pct(funnel.reveals, funnel.delivered)} of shown</span>}
                {label === "Redeemed" && <span className="ml-2 text-xs text-muted">{pct(redeemed ?? 0, funnel.reveals)} of codes shown</span>}
                {label === "Conversions" && <span className="ml-2 text-xs text-muted">{pct(funnel.conversions, funnel.clicks)} of clicks</span>}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded bg-line/60" title={hint}>
              <div className="h-1.5 rounded bg-gold" style={{ width: `${Math.min(100, (value * 100) / top)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        New to the device: {n(funnel.firstTime)} ({pct(funnel.firstTime, funnel.delivered)} of showings). A rough count of new people: an
        ad is "new" when that device has not shown it in the last week.
      </p>
      {rows && rows.length > 0 && (
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1 font-normal" />
              <th className="py-1 text-right font-normal">Shown</th>
              <th className="py-1 text-right font-normal">Seen</th>
              <th className="py-1 text-right font-normal">Clicked</th>
              <th className="py-1 text-right font-normal">Closed</th>
              <th className="py-1 text-right font-normal">New</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, f]) => (
              <tr key={label} className="border-t border-line/60 tabular-nums">
                <td className="py-1.5">{label}</td>
                <td className="py-1.5 text-right">{n(f.delivered)}</td>
                <td className="py-1.5 text-right">{pct(f.seen, f.measured)}</td>
                <td className="py-1.5 text-right">{pct(f.clicks, f.delivered)}</td>
                <td className="py-1.5 text-right">{pct(f.hidden, f.measured)}</td>
                <td className="py-1.5 text-right">{pct(f.firstTime, f.delivered)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/**
 * What happens after the click: the codes the advertiser says were redeemed (a running list an admin keeps), and, when the ad tracks
 * conversions, the address and secret the advertiser's server uses to report a sign-up or booking back.
 */
function OfferPanel({ ad, onChanged }: { ad: AdminAd; onChanged: () => void }) {
  const [list, setList] = useState<AdRedemption[] | null>(null);
  const [day, setDay] = useState("");
  const [count, setCount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getAdRedemptions(ad.id)
      .then((r) => {
        if (!cancelled) setList(r);
      })
      .catch(() => {
        if (!cancelled) setList([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ad.id]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      setList(await api.addAdRedemption(ad.id, { day, count: Number(count), note }));
      setCount("");
      setNote("");
      setMessage("Added.");
      onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not add that");
    } finally {
      setBusy(false);
    }
  }

  async function remove(r: AdRedemption) {
    if (!window.confirm(`Remove ${r.count} redeemed on ${r.day}?`)) return;
    setBusy(true);
    setMessage(null);
    try {
      setList(await api.deleteAdRedemption(ad.id, r.id));
      onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not remove that");
    } finally {
      setBusy(false);
    }
  }

  const apiBase = API_ORIGIN || window.location.origin;
  const postback = `${apiBase}/api/ad-conversions?click={privlee_click}&key=${ad.tracking.key ?? ""}`;

  return (
    <section className="rounded-lg border border-line bg-white p-4 md:col-span-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Offer, redemptions and conversions</h3>
      {ad.offer && (
        <p className="mt-2 text-sm">
          <strong>{ad.offer.text}</strong>
          {ad.offer.code ? (
            <>
              {" "}- code <code className="rounded bg-[#f4f2ee] px-1.5 py-0.5">{ad.offer.code}</code> (shown only when a member taps Show code)
            </>
          ) : (
            " - no code"
          )}
        </p>
      )}

      {ad.offer?.code && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Redeemed (what the advertiser tells you)</h4>
          <form onSubmit={add} className="mt-2 flex flex-wrap items-end gap-2">
            <label className="text-xs text-muted">
              Day
              <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 block rounded border border-line px-2 py-1.5 text-sm text-ink" />
              <span className="sr-only">blank means today</span>
            </label>
            <label className="text-xs text-muted">
              How many
              <input type="number" min={1} required value={count} onChange={(e) => setCount(e.target.value)} className="mt-1 block w-24 rounded border border-line px-2 py-1.5 text-sm text-ink" />
            </label>
            <label className="min-w-[10rem] flex-1 text-xs text-muted">
              Note (optional)
              <input maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} placeholder="week 1, from the cafe" className="mt-1 block w-full rounded border border-line px-2 py-1.5 text-sm text-ink" />
            </label>
            <button disabled={busy || !count} className="rounded bg-ink px-4 py-1.5 text-xs font-medium text-canvas transition hover:bg-gold disabled:opacity-50">Add</button>
          </form>
          {list === null ? (
            <p className="mt-2 text-xs text-muted">Loading...</p>
          ) : list.length === 0 ? (
            <p className="mt-2 text-xs text-muted">Nothing entered yet. Add what the advertiser reports; the total ({n(ad.redeemed)}) appears in the funnel and in their report.</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className="border-t border-line/60 tabular-nums">
                    <td className="py-1.5">{new Date(r.day + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="py-1.5 text-right font-semibold">{n(r.count)}</td>
                    <td className="px-3 py-1.5 text-xs text-muted">{r.note}</td>
                    <td className="py-1.5 text-right">
                      <button type="button" disabled={busy} onClick={() => remove(r)} className="text-xs text-danger underline-offset-2 hover:underline disabled:opacity-50">Remove</button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-line text-sm font-semibold tabular-nums">
                  <td className="py-1.5">Total</td>
                  <td className="py-1.5 text-right">{n(ad.redeemed)}</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {ad.tracking.enabled && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Conversions: what to give the advertiser</h4>
          <p className="mt-1 text-xs text-muted">
            Their link gets <code>privlee_click=&lt;token&gt;</code> added on every click. When someone signs up or books, their server should call this address
            with that token. The secret key proves it is theirs: send it only to them, and do not post it anywhere public.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input readOnly value={postback} onFocus={(e) => e.currentTarget.select()} aria-label="Address for the advertiser's server" className="min-w-0 flex-1 rounded border border-line bg-[#f4f2ee] px-3 py-1.5 font-mono text-xs" />
            <button type="button" onClick={() => navigator.clipboard.writeText(postback).then(() => setMessage("Copied."), () => setMessage("Select the address and copy it."))} className="rounded border border-line px-3 py-1.5 text-xs transition hover:border-gold">Copy</button>
          </div>
          <p className="mt-1 text-xs text-muted">
            Replace <code>{"{privlee_click}"}</code> with the token from the visitor's address. It answers 204 when counted (a repeat is fine), and 404 for an
            unknown token or a wrong key. A token works for 30 days.
          </p>
        </div>
      )}
      {message && <p role="status" className="mt-2 text-xs text-muted">{message}</p>}
    </section>
  );
}

/** The advertiser's private, read-only link: make it, copy it, extend it, end it. It shows counts only, and never the price. */
function ReportLinkPanel({ ad, onChanged }: { ad: AdminAd; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const link = ad.reportLink;
  const url = link ? `${window.location.origin}/ad-report/${link.token}` : "";

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage(done);
      onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "That did not work");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 md:col-span-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Advertiser's report link</h3>
      <p className="mt-1 text-xs text-muted">
        A private page for {ad.advertiser}: shown, seen, clicked, a daily chart and a spreadsheet download. No sign-in. It never shows the price, other
        advertisers or anything about members. It works until {ad.endsAt ? "14 days after the ad ends" : "you end it (the ad has no end date)"}.
      </p>
      {link ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded border border-line bg-[#f4f2ee] px-3 py-1.5 text-xs" aria-label="Advertiser's link" />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(url).then(() => setMessage("Copied."), () => setMessage("Could not copy; select the link and copy it."))}
              className="rounded border border-line px-3 py-1.5 text-xs transition hover:border-gold"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-muted">
            {link.active ? "Working" : "Stopped working"}
            {link.validUntil ? `: valid until ${when(link.validUntil)}` : ": until you end it"}.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => run(() => api.extendAdReportLink(ad.id, 14), "Extended by 14 days.")} className="rounded border border-line px-3 py-1 text-xs transition hover:border-gold disabled:opacity-50">
              Extend 14 days
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => window.confirm("Make a new link? The old one stops working at once.") && run(() => api.newAdReportLink(ad.id), "New link made. The old one no longer works.")}
              className="rounded border border-line px-3 py-1 text-xs transition hover:border-gold disabled:opacity-50"
            >
              New link
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => window.confirm("End this link? The advertiser will no longer be able to open it.") && run(() => api.endAdReportLink(ad.id), "Link ended.")}
              className="rounded border border-line px-3 py-1 text-xs text-danger transition hover:border-danger disabled:opacity-50"
            >
              End link
            </button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => run(() => api.newAdReportLink(ad.id), "Link made. Copy it and send it to the advertiser.")} className="mt-3 rounded bg-ink px-4 py-1.5 text-xs font-medium text-canvas transition hover:bg-gold disabled:opacity-50">
          Make a link
        </button>
      )}
      {message && <p role="status" className="mt-2 text-xs text-muted">{message}</p>}
    </section>
  );
}

const emptyFunnel: AdFunnel = { delivered: 0, measured: 0, seen: 0, hidden: 0, firstTime: 0, clicks: 0, reveals: 0, conversions: 0 };

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
