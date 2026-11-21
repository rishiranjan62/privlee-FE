import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { ThoughtSettings } from "../lib/types";

const card = "rounded border border-line bg-white p-5";

/**
 * The switch for Thoughts. Everything stays hidden from members until it is on. There are deliberately no daily limits on posts or
 * comments; the server only guards against a script flooding the feed.
 */
export default function ThoughtsAdminPage() {
  const [saved, setSaved] = useState<ThoughtSettings | null>(null);
  const [draft, setDraft] = useState<ThoughtSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api
      .getThoughtSettings()
      .then((s) => {
        setSaved(s);
        setDraft(s);
      })
      .catch(() => setMessage({ ok: false, text: "Could not load the settings." }));
  }, []);

  const changed = saved && draft && JSON.stringify(saved) !== JSON.stringify(draft);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    try {
      const s = await api.saveThoughtSettings(draft);
      setSaved(s);
      setDraft(s);
      setMessage({ ok: true, text: s.enabled ? "Saved. Thoughts is on for members." : "Saved. Thoughts is off." });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Could not save" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Thoughts</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Short posts members share with their matches or with everyone, with comments and hearts. It stays hidden from members until you switch it on.
        </p>
      </div>

      {draft === null ? (
        <p className="text-sm text-muted">{message?.text ?? "Loading…"}</p>
      ) : (
        <section className={card}>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} className="mt-1 h-4 w-4" />
            <span>
              <span className="font-medium">Thoughts is on</span>
              <span className="block text-sm text-muted">
                Members see a Thoughts tab, can post, comment and heart. Turning it off hides it again at once; nothing is deleted.
              </span>
            </span>
          </label>

          <label className="mt-5 block text-sm">
            <span className="font-medium">Days before a thought disappears</span>
            <input
              type="number"
              min={1}
              max={90}
              value={draft.expireDays}
              onChange={(e) => setDraft({ ...draft, expireDays: Number(e.target.value) })}
              className="mt-1 block w-28 rounded border border-line px-2.5 py-2 text-sm outline-none focus:border-gold"
            />
            <span className="mt-1 block text-muted">Its comments and hearts go with it. Applies to thoughts shared from now on.</span>
          </label>

          <label className="mt-5 flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={draft.requirePhoto} onChange={(e) => setDraft({ ...draft, requirePhoto: e.target.checked })} className="mt-1 h-4 w-4" />
            <span>
              <span className="font-medium">Only members with a photo can post</span>
              <span className="block text-sm text-muted">Commenting and hearts are open to everyone. Posting needs a main photo, which keeps throwaway accounts out.</span>
            </span>
          </label>

          <div className="mt-6 flex items-center gap-4">
            <button onClick={save} disabled={busy || !changed} className="rounded bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-40">
              {busy ? "Saving…" : "Save"}
            </button>
            {message && <span className={`text-sm ${message.ok ? "text-green-800" : "text-red-700"}`}>{message.text}</span>}
          </div>
        </section>
      )}

      <section className={card}>
        <h2 className="text-base font-semibold">How it is kept in check</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>There is no daily limit for a person. A script that floods the feed is stopped automatically.</li>
          <li>Phone numbers, emails, links and usernames from other apps are refused.</li>
          <li>Every thought and comment has a Report button. Reports arrive in <Link to="/admin/reports" className="text-gold hover:underline">Reports</Link>, with the reported words kept even if the author deletes them.</li>
          <li>From a report you can hide the post from members. Everything you do is in the Audit log.</li>
          <li>Matches-only posts are seen by mutual matches only. Someone who merely liked the author sees public posts only.</li>
        </ul>
      </section>
    </div>
  );
}
