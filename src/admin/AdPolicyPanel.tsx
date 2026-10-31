import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import type { AdCategoryOption, AdHoldoutGroup, AdHoldoutReport, AdPolicy } from "../lib/types";

const labelClass = "block text-xs font-semibold uppercase tracking-wider text-muted";
const inputClass = "mt-1 w-24 rounded border border-line px-3 py-2 text-sm outline-none focus:border-gold";

/** One line that says what the policy is, shown while the panel is closed. */
function summary(p: AdPolicy): string {
  const parts = [p.requireApproval ? "new ads wait for approval" : "new ads go live at once"];
  parts.push(p.blockedCategories.length > 0 ? `${p.blockedCategories.length} categories refused` : "no category refused");
  if (p.blockedTerms.length > 0) parts.push(`${p.blockedTerms.length} words blocked`);
  parts.push(p.reportsToPause > 0 ? `paused after ${p.reportsToPause} reports` : "never paused by reports");
  parts.push(p.holdoutPercent > 0 ? `${p.holdoutPercent}% of members see no ads (test)` : "no holdout test");
  return parts.join(", ");
}

/**
 * Who may advertise and how an ad is checked: approval before an ad is shown, categories and words that are refused, the number of member reports
 * that pauses an ad, and a group of members who see no ads so the effect of ads can be measured. All live, like every other rule here.
 */
export default function AdPolicyPanel({ policy, categories, onSaved }: { policy: AdPolicy; categories: AdCategoryOption[]; onSaved: () => void }) {
  const [form, setForm] = useState<AdPolicy>(policy);
  const [terms, setTerms] = useState(policy.blockedTerms.join("\n"));
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [report, setReport] = useState<AdHoldoutReport | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(policy);
    setTerms(policy.blockedTerms.join("\n"));
  }, [policy]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api
      .getAdHoldout()
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, policy.holdoutPercent]);

  const toggleCategory = (value: string) =>
    setForm((f) => ({ ...f, blockedCategories: f.blockedCategories.includes(value) ? f.blockedCategories.filter((c) => c !== value) : [...f.blockedCategories, value] }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.saveAdPolicy({ ...form, blockedTerms: terms.split("\n").map((t) => t.trim()).filter(Boolean) });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the policy");
    } finally {
      setSaving(false);
    }
  }

  async function restart() {
    if (!window.confirm("Start a new test with a new group of members? Whoever was in the last group may see ads again, and the comparison starts from today.")) return;
    setBusy(true);
    setError(null);
    try {
      setReport(await api.restartAdHoldout());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a new test");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-3 rounded-lg border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Policy: who may advertise, and measuring ads</h2>
          <p className="mt-0.5 text-sm">{summary(policy)}</p>
        </div>
        <button type="button" onClick={() => setOpen(!open)} className="rounded border border-line px-3 py-1 text-xs transition hover:border-gold">
          {open ? "Close" : "Change"}
        </button>
      </div>
      {open && (
        <form onSubmit={save} className="space-y-6 border-t border-line/60 px-4 py-4">
          <div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={form.requireApproval} onChange={(e) => setForm({ ...form, requireApproval: e.target.checked })} />
              <span>
                A new ad waits for approval
                <span className="block text-xs text-muted">
                  It stays a Draft, and is not shown, until an admin approves it. Changing what members read (headline, text, button, link, offer, picture, a new creative) sends an
                  approved ad back to Draft. Ads already running stay approved when you turn this on.
                </span>
              </span>
            </label>
          </div>

          <div>
            <p className={labelClass}>Advertisers that are refused</p>
            <p className="mt-1 text-xs text-muted">An ad in a ticked category cannot be saved or approved, and one already running in it stops being shown.</p>
            <div className="mt-2 grid gap-1 sm:grid-cols-2 md:grid-cols-3">
              {categories.map((c) => (
                <label key={c.value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.blockedCategories.includes(c.value)} onChange={() => toggleCategory(c.value)} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="ad-terms">Words that may not appear in an ad (one per line)</label>
            <textarea id="ad-terms" rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder={"casino\nescort"} className="mt-1 w-full max-w-md rounded border border-line px-3 py-2 text-sm outline-none focus:border-gold" />
            <p className="mt-1 text-xs text-muted">Checked in the headline, text, button, offer and the advertiser's name. Not case sensitive; part of a word counts.</p>
          </div>

          <div>
            <label className={labelClass} htmlFor="ad-reports-pause">Member reports that pause an ad</label>
            <input id="ad-reports-pause" type="number" min={0} max={100} value={form.reportsToPause} onChange={(e) => setForm({ ...form, reportsToPause: Number(e.target.value) })} className={inputClass} />
            <p className="mt-1 text-xs text-muted">This many open reports in 7 days pause the ad by itself, for you to look at. 0 = never. Reports you dismiss stop counting.</p>
          </div>

          <div>
            <label className={labelClass} htmlFor="ad-holdout">Share of members who see no ads (0 to 20%)</label>
            <input id="ad-holdout" type="number" min={0} max={20} value={form.holdoutPercent} onChange={(e) => setForm({ ...form, holdoutPercent: Number(e.target.value) })} className={inputClass} />
            <p className="mt-1 max-w-xl text-xs text-muted">
              A test of what ads change. These members are picked by a fixed calculation on their account, not stored and not asked, and never see an ad. After a few weeks the table below compares
              how much each group used the app. 0 ends the test.
            </p>
          </div>

          {error && <p role="alert" className="rounded border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          {saved && <p role="status" className="text-sm text-green-800">Saved. It applies to members within a few seconds.</p>}
          <button disabled={saving} className="rounded bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-50">{saving ? "Saving..." : "Save policy"}</button>
        </form>
      )}
      {open && report && <HoldoutResults report={report} onRestart={restart} busy={busy} />}
    </section>
  );
}

function HoldoutResults({ report, onRestart, busy }: { report: AdHoldoutReport; onRestart: () => void; busy: boolean }) {
  if (!report.running || !report.holdout || !report.shownAds) {
    return <p className="border-t border-line/60 px-4 py-3 text-xs text-muted">{report.note}</p>;
  }
  const rows: [string, (g: AdHoldoutGroup) => string][] = [
    ["Members compared", (g) => g.members.toLocaleString()],
    ["Days active (average)", (g) => String(g.avgActiveDays)],
    ["Sent at least one message", (g) => `${g.percentMessaged}%`],
    ["Messages sent (average)", (g) => String(g.avgMessages)],
    ["Bought credits", (g) => `${g.percentBought}%`],
  ];
  return (
    <div className="border-t border-line/60 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          The test so far: {report.percent}% see no ads, {report.daysRunning} day{report.daysRunning === 1 ? "" : "s"} in
        </h3>
        <button type="button" disabled={busy} onClick={onRestart} className="rounded border border-line px-3 py-1 text-xs transition hover:border-gold disabled:opacity-50">Start a new test</button>
      </div>
      <table className="mt-2 w-full max-w-xl text-sm">
        <thead className="text-left text-xs text-muted">
          <tr>
            <th className="py-1 font-normal" />
            <th className="py-1 text-right font-normal">{report.holdout.name}</th>
            <th className="py-1 text-right font-normal">{report.shownAds.name}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-t border-line/60 tabular-nums">
              <td className="py-1.5">{label}</td>
              <td className="py-1.5 text-right">{value(report.holdout!)}</td>
              <td className="py-1.5 text-right">{value(report.shownAds!)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={`mt-2 text-xs ${report.enoughMembers ? "text-muted" : "text-amber-800"}`}>{report.note}</p>
      <p className="mt-1 text-xs text-muted">Only members who joined before the test began are compared, so both groups have had the same time. These are group totals; nobody's own numbers are shown.</p>
    </div>
  );
}
