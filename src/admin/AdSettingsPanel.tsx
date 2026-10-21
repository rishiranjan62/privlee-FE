import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import type { AdPlacement, AdSettings } from "../lib/types";

const PLACES: { value: AdPlacement; label: string }[] = [
  { value: "DISCOVER", label: "Discover" },
  { value: "LIKES", label: "Likes" },
  { value: "MATCHES", label: "Matches" },
  { value: "MESSAGES", label: "Messages list" },
  { value: "CONVERSATION", label: "Inside a conversation" },
];

const inputClass = "mt-1 w-24 rounded border border-line px-3 py-2 text-sm outline-none focus:border-gold";
const labelClass = "text-xs font-semibold uppercase tracking-wider text-muted";

/** One line that says what the rules currently are, shown while the panel is closed. */
function summary(s: AdSettings, switchedOffOnServer: boolean): string {
  if (switchedOffOnServer) return "Ads are switched off on the server";
  if (!s.enabled) return "Ads are switched off";
  const parts = [s.maxPerDayAnyAd > 0 ? `up to ${s.maxPerDayAnyAd} a day per person` : "no daily limit"];
  if (s.newMemberGraceHours > 0) parts.push(`none for new members for ${s.newMemberGraceHours} h`);
  if (s.adFreeDaysAfterPurchase > 0) parts.push(`none for ${s.adFreeDaysAfterPurchase} days after a purchase`);
  if (s.disabledPlacements.length > 0) parts.push(`off on ${s.disabledPlacements.map((p) => PLACES.find((x) => x.value === p)?.label ?? p).join(", ")}`);
  return `Ads are on, ${parts.join(", ")}`;
}

/**
 * The rules that apply to every ad: the master switch, daily limit, the wait for new members, ad-free days after a purchase, which
 * screens carry ads, and where the rows go in the Messages list. All live: a change reaches members within seconds, with no release.
 */
export default function AdSettingsPanel({
  settings,
  switchedOffOnServer,
  onSaved,
}: {
  settings: AdSettings;
  switchedOffOnServer: boolean;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AdSettings>(settings);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Follow what the server says, unless the person is in the middle of editing.
  useEffect(() => {
    if (!open) setForm(settings);
  }, [settings, open]);

  const set = <K extends keyof AdSettings>(key: K, value: AdSettings[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };
  const num = (
    key:
      | "maxPerDayAnyAd"
      | "newMemberGraceHours"
      | "adFreeDaysAfterPurchase"
      | "messagesFirstAfter"
      | "messagesEvery"
      | "messagesMaxRows"
      | "chatFirstAfter"
      | "chatEvery"
      | "chatMaxRows"
      | "chatKeepLatestClear",
  ) =>
    ({
      type: "number" as const,
      value: Number.isNaN(form[key]) ? "" : form[key],
      className: inputClass,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value === "" ? NaN : Number(e.target.value)),
    });

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.saveAdSettings(form);
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the settings");
    } finally {
      setSaving(false);
    }
  }

  const on = (p: AdPlacement) => !form.disabledPlacements.includes(p);

  return (
    <section className="mt-6 rounded-lg border border-line bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold uppercase tracking-wider text-muted">Settings for all ads</span>
          <span className={`mt-0.5 block text-sm ${settings.enabled && !switchedOffOnServer ? "" : "text-danger"}`}>{summary(settings, switchedOffOnServer)}</span>
        </span>
        <span className="shrink-0 rounded border border-line px-3 py-1 text-xs">{open ? "Close" : "Change"}</span>
      </button>

      {open && (
        <form onSubmit={save} className="space-y-6 border-t border-line/70 px-4 py-5">
          {switchedOffOnServer && (
            <p className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Ads are also switched off on the server itself (<code>ADS_ENABLED=false</code>), which overrides everything here until it is
              removed.
            </p>
          )}

          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} />
            <span>
              <strong>Show ads to members</strong>
              <span className="block text-xs text-muted">The master switch. Untick it to hide every ad at once; your ads and their numbers are kept.</span>
            </span>
          </label>

          <fieldset>
            <legend className={labelClass}>Screens that carry ads</legend>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5">
              {PLACES.map((p) => (
                <label key={p.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={on(p.value)}
                    onChange={(e) =>
                      set(
                        "disabledPlacements",
                        PLACES.map((x) => x.value).filter((v) => (v === p.value ? !e.target.checked : !on(v))),
                      )
                    }
                  />
                  {p.label}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">Untick a screen to stop showing ads there, whatever the ads are set to.</p>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="s-perday">Most ads a day, per person</label>
              <input id="s-perday" min={0} max={50} {...num("maxPerDayAnyAd")} />
              <p className="mt-1 text-xs text-muted">Across all ads and screens. 0 = no limit.</p>
            </div>
            <div>
              <label className={labelClass} htmlFor="s-grace">No ads for new members (hours)</label>
              <input id="s-grace" min={0} max={720} {...num("newMemberGraceHours")} />
              <p className="mt-1 text-xs text-muted">After joining. 0 = ads straight away.</p>
            </div>
            <div>
              <label className={labelClass} htmlFor="s-paid">No ads after a purchase (days)</label>
              <input id="s-paid" min={0} max={365} {...num("adFreeDaysAfterPurchase")} />
              <p className="mt-1 text-xs text-muted">For members who bought credits. 0 = everyone sees ads.</p>
            </div>
          </div>

          <fieldset>
            <legend className={labelClass}>Rows in the Messages list</legend>
            <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-3">
              <div>
                <label className="text-xs text-muted" htmlFor="s-first">First row after conversation</label>
                <br />
                <input id="s-first" min={1} max={50} {...num("messagesFirstAfter")} />
              </div>
              <div>
                <label className="text-xs text-muted" htmlFor="s-every">then after every</label>
                <br />
                <input id="s-every" min={1} max={50} {...num("messagesEvery")} />
              </div>
              <div>
                <label className="text-xs text-muted" htmlFor="s-rows">at most (rows)</label>
                <br />
                <input id="s-rows" min={0} max={10} {...num("messagesMaxRows")} />
              </div>
            </div>
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5" checked={form.messagesShortListRow} onChange={(e) => set("messagesShortListRow", e.target.checked)} />
              <span>
                A list shorter than that gets one row at the bottom
                <span className="block text-xs text-muted">Otherwise a member with only a few conversations would see no ad there. 0 rows turns the Messages list off.</span>
              </span>
            </label>
            <p className="mt-2 text-xs text-muted">
              With 4, 8 and 2: a row after the 4th conversation and another after the 12th. These rows sit between the conversations in the list;
              ads inside a conversation are set below. This applies to the website and the Android app alike.
            </p>
          </fieldset>

          <fieldset>
            <legend className={labelClass}>Ads inside a conversation</legend>
            <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-3">
              <div>
                <label className="text-xs text-muted" htmlFor="c-first">First ad after message</label>
                <br />
                <input id="c-first" min={1} max={500} {...num("chatFirstAfter")} />
              </div>
              <div>
                <label className="text-xs text-muted" htmlFor="c-every">then every</label>
                <br />
                <input id="c-every" min={1} max={500} {...num("chatEvery")} />
              </div>
              <div>
                <label className="text-xs text-muted" htmlFor="c-rows">at most (per conversation)</label>
                <br />
                <input id="c-rows" min={0} max={5} {...num("chatMaxRows")} />
              </div>
              <div>
                <label className="text-xs text-muted" htmlFor="c-clear">keep the latest messages clear</label>
                <br />
                <input id="c-clear" min={0} max={100} {...num("chatKeepLatestClear")} />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted">
              Only ads ticked "Inside a conversation" appear there, and only when "Inside a conversation" is ticked above. An ad is a labelled
              card between two messages, never a message, and the newest messages are never moved. Nothing from the conversation is used to
              pick the ad or sent to anyone: the server is told only how many messages there are. 0 ads turns it off.
            </p>
          </fieldset>

          {error && <p role="alert" className="rounded border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="rounded bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-50">
              {saving ? "Saving..." : "Save settings"}
            </button>
            {saved && <span role="status" className="text-sm text-green-800">Saved. Members see the change within a few seconds.</span>}
          </div>
        </form>
      )}
    </section>
  );
}
