import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import type { AdCreative, AdFlag, AdminAd } from "../lib/types";

const n = (v: number) => v.toLocaleString();
const pct = (part: number, whole: number) => (whole === 0 ? "-" : `${((part * 100) / whole).toFixed(1)}%`);
const inputClass = "mt-1 w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-gold";
const labelClass = "block text-xs font-semibold uppercase tracking-wider text-muted";
/** Showings each creative needs before the click rates are compared (see AdVariants on the server). */
const FAIR_SAMPLE = 300;

const REASONS: Record<AdFlag["reason"], string> = {
  MISLEADING: "Misleading",
  SCAM: "Looks like a scam",
  OFFENSIVE: "Offensive",
  IRRELEVANT: "Not relevant",
  OTHER: "Something else",
};

/**
 * Approve or reject an ad that is waiting, or see why one was rejected. A Draft is never shown to members. Approving checks the policy again, so a category
 * or word blocked since the ad was written still stops it.
 */
export function ReviewBar({ ad, onChanged, onError }: { ad: AdminAd; onChanged: () => void; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      setRejecting(false);
      setNote("");
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "That did not work");
    } finally {
      setBusy(false);
    }
  }

  if (ad.review.status === "APPROVED") return null;
  return (
    <div className={`mt-3 rounded border px-3 py-2 text-sm ${ad.review.status === "REJECTED" ? "border-red-200 bg-red-50" : "border-amber-300 bg-amber-50"}`}>
      {ad.review.status === "DRAFT" ? (
        <p className="text-amber-900">This ad is waiting for approval. Members do not see it until you approve it.</p>
      ) : (
        <p className="text-red-900">Rejected{ad.review.note ? `: ${ad.review.note}` : ""}. Change it and it goes back to Draft for another look.</p>
      )}
      {ad.review.status === "DRAFT" && !rejecting && (
        <div className="mt-2 flex gap-2">
          <button type="button" disabled={busy} onClick={() => run(() => api.approveAd(ad.id))} className="rounded bg-ink px-3 py-1 text-xs font-medium text-canvas transition hover:bg-gold disabled:opacity-50">Approve</button>
          <button type="button" disabled={busy} onClick={() => setRejecting(true)} className="rounded border border-line bg-white px-3 py-1 text-xs transition hover:border-danger disabled:opacity-50">Reject...</button>
        </div>
      )}
      {rejecting && (
        <form
          className="mt-2 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api.rejectAd(ad.id, note));
          }}
        >
          <label className="min-w-[14rem] flex-1 text-xs text-muted">
            Why (the person who made it will read this)
            <input autoFocus maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 block w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink" />
          </label>
          <button disabled={busy || !note.trim()} className="rounded bg-danger px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">Reject</button>
          <button type="button" onClick={() => setRejecting(false)} className="rounded border border-line bg-white px-3 py-1.5 text-xs">Cancel</button>
        </form>
      )}
    </div>
  );
}

/**
 * The ad's creatives: its own headline, text, button and picture (A) and up to three more, so two wordings or pictures can be compared. Each gets its
 * own showings, seen, clicks and closes. With auto-optimise on, most traffic goes to the creative with the best click rate once each has had a fair sample.
 */
export function CreativesPanel({ ad, onChanged }: { ad: AdminAd; onChanged: () => void }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState({ title: "", body: "", ctaLabel: "Learn more" });
  const [image, setImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const creatives = ad.creatives;
  const others = creatives.filter((c) => c.label !== "A");
  const leader = creatives.find((c) => c.leading);
  const stillCollecting = creatives.filter((c) => c.active).some((c) => c.shown < FAIR_SAMPLE);

  async function run(action: () => Promise<unknown>, done?: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      if (done) setMessage(done);
      onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "That did not work");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(c: AdCreative | null) {
    setEditing(c ? c.label : "new");
    setForm(c ? { title: c.title, body: c.body ?? "", ctaLabel: c.ctaLabel } : { title: ad.title, body: ad.body ?? "", ctaLabel: ad.ctaLabel });
    setImage(null);
    setRemoveImage(false);
    setMessage(null);
    if (file.current) file.current.value = "";
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const label = editing === "new" ? null : editing;
    await run(async () => {
      await api.saveAdCreative(ad.id, label, form, image, removeImage);
      setEditing(null);
    }, ad.review.status === "APPROVED" ? "Saved." : "Saved. It is checked again before it is shown.");
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 md:col-span-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Creatives (A/B test)</h3>
      <p className="mt-1 text-xs text-muted">
        Add another headline, text or picture to find out which works better. Members are shown one at a time; each has its own numbers below. Adding or changing one is checked
        against the policy, and sends an approved ad back to Draft when approval is on.
      </p>

      {creatives.length > 1 && (
        <>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1 font-normal" />
                <th className="py-1 font-normal">Headline</th>
                <th className="py-1 text-right font-normal">Shown</th>
                <th className="py-1 text-right font-normal">Seen</th>
                <th className="py-1 text-right font-normal">Clicked</th>
                <th className="py-1 text-right font-normal">Click rate</th>
                <th className="py-1 text-right font-normal">Closed</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {creatives.map((c) => (
                <tr key={c.label} className={`border-t border-line/60 tabular-nums ${c.active ? "" : "opacity-60"}`}>
                  <td className="py-1.5 pr-2 font-semibold">
                    {c.label}
                    {c.leading && <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] uppercase text-green-800">Leading</span>}
                  </td>
                  <td className="max-w-[16rem] truncate py-1.5 pr-2">{c.title}</td>
                  <td className="py-1.5 text-right">{n(c.shown)}</td>
                  <td className="py-1.5 text-right">{pct(c.seen, c.shown)}</td>
                  <td className="py-1.5 text-right">{n(c.clicked)}</td>
                  <td className="py-1.5 text-right">{pct(c.clicked, c.shown)}</td>
                  <td className="py-1.5 text-right">{n(c.hidden)}</td>
                  <td className="whitespace-nowrap py-1.5 pl-2 text-right text-xs">
                    {c.label === "A" ? (
                      <span className="text-muted">edit above</span>
                    ) : (
                      <>
                        <button type="button" disabled={busy} onClick={() => startEdit(c)} className="underline-offset-2 hover:underline disabled:opacity-50">Edit</button>
                        {" · "}
                        <button type="button" disabled={busy} onClick={() => run(() => api.setAdCreativeActive(ad.id, c.label, !c.active))} className="underline-offset-2 hover:underline disabled:opacity-50">{c.active ? "Pause" : "Resume"}</button>
                        {" · "}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => window.confirm(`Delete creative ${c.label}? Its picture is deleted too (its numbers stay in the totals).`) && run(() => api.deleteAdCreative(ad.id, c.label), "Deleted.")}
                          className="text-danger underline-offset-2 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={ad.autoOptimise} disabled={busy} onChange={(e) => run(() => api.setAdAutoOptimise(ad.id, e.target.checked))} />
            <span>
              Send most traffic to the best one automatically
              <span className="block text-xs text-muted">
                Even split until each active creative has been shown {FAIR_SAMPLE} times, then about 80% goes to the one with the best click rate and the rest is shared between the others,
                so a change of taste is still noticed. Off = always an even split.
              </span>
            </span>
          </label>
          <p className="mt-2 text-xs text-muted">
            {leader ? `Creative ${leader.label} has the best click rate so far.` : stillCollecting ? `Collecting data: each active creative needs ${FAIR_SAMPLE} showings before they can be compared.` : ""}
          </p>
        </>
      )}

      {editing === null && creatives.length < 4 && (
        <button type="button" disabled={busy} onClick={() => startEdit(null)} className="mt-3 rounded border border-line px-3 py-1.5 text-xs transition hover:border-gold disabled:opacity-50">
          {others.length === 0 ? "Add a second creative" : "Add another creative"}
        </button>
      )}

      {editing !== null && (
        <form onSubmit={save} className="mt-3 grid gap-3 rounded border border-line/70 p-3 sm:grid-cols-2">
          <p className="text-sm font-semibold sm:col-span-2">{editing === "new" ? "New creative" : `Creative ${editing}`}</p>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="creative-title">Headline</label>
            <input id="creative-title" required maxLength={80} className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="creative-body">Text (optional)</label>
            <input id="creative-body" maxLength={160} className={inputClass} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="creative-cta">Button</label>
            <input id="creative-cta" maxLength={24} className={inputClass} value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="creative-image">Picture (optional; the ad's own is used when this has none)</label>
            <input id="creative-image" ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
            {editing !== "new" && creatives.find((c) => c.label === editing)?.imagePath && (
              <label className="mt-1 flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} /> Remove its own picture
              </label>
            )}
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={busy} className="rounded bg-ink px-4 py-1.5 text-xs font-medium text-canvas transition hover:bg-gold disabled:opacity-50">{busy ? "Saving..." : "Save creative"}</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded border border-line px-4 py-1.5 text-xs transition hover:border-gold">Cancel</button>
          </div>
        </form>
      )}
      {message && <p role="status" className="mt-2 text-xs text-muted">{message}</p>}
    </section>
  );
}

/** What members reported about this ad. Reports keep the reason, the note and the screen, never who. */
export function FlagsPanel({ ad, onChanged }: { ad: AdminAd; onChanged: () => void }) {
  const [flags, setFlags] = useState<AdFlag[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getAdFlags(ad.id)
      .then((f) => {
        if (!cancelled) setFlags(f);
      })
      .catch(() => {
        if (!cancelled) setFlags([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ad.id, ad.openReports]);

  const open = (flags ?? []).filter((f) => !f.dismissed);
  async function dismiss() {
    setBusy(true);
    setMessage(null);
    try {
      setFlags(await api.dismissAdFlags(ad.id));
      onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not dismiss those");
    } finally {
      setBusy(false);
    }
  }

  if (flags !== null && flags.length === 0) return null;
  return (
    <section className="rounded-lg border border-line bg-white p-4 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Reported by members ({open.length} open)</h3>
        {open.length > 0 && (
          <button type="button" disabled={busy} onClick={dismiss} className="rounded border border-line px-3 py-1 text-xs transition hover:border-gold disabled:opacity-50">Dismiss all open reports</button>
        )}
      </div>
      {flags === null ? (
        <p className="mt-2 text-xs text-muted">Loading...</p>
      ) : (
        <ul className="mt-2 divide-y divide-line/60 text-sm">
          {flags.slice(0, 20).map((f) => (
            <li key={f.id} className={`py-1.5 ${f.dismissed ? "opacity-50" : ""}`}>
              <span className="font-medium">{REASONS[f.reason] ?? f.reason}</span>
              <span className="ml-2 text-xs text-muted">
                {f.platform === "ANDROID" ? "Android app" : "Website"}
                {f.placement ? `, ${f.placement.toLowerCase()}` : ""}, {new Date(f.createdAt).toLocaleString()}
                {f.dismissed ? ", dismissed" : ""}
              </span>
              {f.note && <p className="text-xs text-muted">"{f.note}"</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted">Enough open reports pause the ad by themselves (see the policy). Pausing keeps its numbers; resume it once you are happy with it.</p>
      {message && <p role="status" className="mt-1 text-xs text-danger">{message}</p>}
    </section>
  );
}
