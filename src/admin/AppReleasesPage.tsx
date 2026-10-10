import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import MiniBarChart from "./MiniBarChart";
import type { AppReleaseInfo, AppReleasesOverview } from "../lib/types";

function Tile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="h-full rounded-lg border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const megabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "-");

export default function AppReleasesPage() {
  const [data, setData] = useState<AppReleasesOverview | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkVersion, setLinkVersion] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNotes, setLinkNotes] = useState("");
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api
      .getAppReleases()
      .then((d) => {
        setData(d);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(load, [load]);

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      const created = await api.uploadAppRelease(version, notes, file);
      setNotice(`Version ${created.versionName} is uploaded and checked. Nobody can download it until you publish it.`);
      setVersion("");
      setNotes("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that build");
    } finally {
      setUploading(false);
    }
  }

  async function link(e: FormEvent) {
    e.preventDefault();
    setLinking(true);
    setError(null);
    setNotice(null);
    try {
      const created = await api.linkAppRelease(linkVersion, linkNotes, linkUrl);
      setNotice(`Version ${created.versionName} is linked and checked. Nobody can download it until you publish it.`);
      setLinkVersion("");
      setLinkUrl("");
      setLinkNotes("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link that build");
    } finally {
      setLinking(false);
    }
  }

  async function publish(release: AppReleaseInfo) {
    if (
      !window.confirm(
        `Make version ${release.versionName} the download on the website? Everyone who taps Download will get this build.`,
      )
    ) {
      return;
    }
    setPublishing(release.id);
    setError(null);
    setNotice(null);
    try {
      await api.publishAppRelease(release.id);
      setNotice(`Version ${release.versionName} is now the download.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish that build");
    } finally {
      setPublishing(null);
    }
  }

  if (failed) return <p className="py-10 text-center text-muted">Could not load this page.</p>;
  if (!data) return <p className="py-10 text-center text-muted">Loading...</p>;

  const current = data.releases.find((r) => r.current);

  return (
    <div>
      <h1 className="text-2xl font-semibold">App downloads</h1>
      <p className="mt-1 text-sm text-muted">
        The Android beta people can download from the website. A download is counted when someone starts it from the
        website; it is not a count of installs, and nothing about who downloaded it is kept.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="All time" value={data.total} />
        <Tile label="Today" value={data.today} hint="UTC day" />
        <Tile label="Last 7 days" value={data.last7Days} />
        <Tile label="Last 30 days" value={data.last30Days} />
      </div>

      <div className="mt-3">
        <MiniBarChart
          series={{
            key: "app-downloads",
            label: "Downloads per day",
            points: data.daily.map((d) => ({ day: d.day, value: d.downloads })),
          }}
        />
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted">On the website now</h2>
      <p className="mt-2 text-sm">
        {current ? (
          <>
            Version <strong>{current.versionName}</strong> ({megabytes(current.sizeBytes)}), published {when(current.publishedAt)}.
          </>
        ) : (
          <span className="text-muted">Nothing is published yet, so visitors see "The beta isn't open for download just yet".</span>
        )}
      </p>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted">Builds</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#f4f2ee] text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2">Version</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Uploaded</th>
              <th className="px-3 py-2">Downloads</th>
              <th className="px-3 py-2">SHA-256</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {data.releases.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted">
                  No builds uploaded yet.
                </td>
              </tr>
            )}
            {data.releases.map((r) => (
              <tr key={r.id} className="border-t border-line/60 align-top">
                <td className="px-3 py-2">
                  <strong>{r.versionName}</strong>
                  {r.hosted && <span className="ml-2 rounded border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted">Hosted</span>}
                  {r.current && <span className="ml-2 rounded bg-gold px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Current</span>}
                  {r.notes && <p className="mt-0.5 text-xs text-muted">{r.notes}</p>}
                </td>
                <td className="px-3 py-2 tabular-nums">{megabytes(r.sizeBytes)}</td>
                <td className="px-3 py-2 text-xs">{when(r.uploadedAt)}</td>
                <td className="px-3 py-2 tabular-nums">{r.downloads.toLocaleString()}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-muted" title={r.sha256}>
                  {r.sha256.slice(0, 16)}...
                </td>
                <td className="px-3 py-2 text-right">
                  {!r.current && (
                    <button
                      onClick={() => publish(r)}
                      disabled={publishing !== null}
                      className="rounded border border-line px-3 py-1 text-xs transition hover:border-gold disabled:opacity-50"
                    >
                      {publishing === r.id ? "Publishing..." : "Publish"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.hostedBaseUrl && (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted">Link a build from file storage</h2>
          <form onSubmit={link} className="mt-3 max-w-xl space-y-4 rounded-lg border border-line bg-white p-4">
            <p className="text-xs leading-relaxed text-muted">
              For a build you have already put in the storage bucket. The server reads the file once, checks it is an app
              package and works out its size and checksum itself. Downloads still go through Privlee, so they are still
              counted. Only addresses under {data.hostedBaseUrl} are accepted.
            </p>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="link-version">
                Version
              </label>
              <input
                id="link-version"
                value={linkVersion}
                onChange={(e) => setLinkVersion(e.target.value)}
                placeholder="0.2.0-beta1"
                maxLength={40}
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="link-url">
                Address of the .apk
              </label>
              <input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder={`${data.hostedBaseUrl}/privlee-0.2.0-beta1.apk`}
                maxLength={500}
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="link-notes">
                Notes (optional)
              </label>
              <input
                id="link-notes"
                value={linkNotes}
                onChange={(e) => setLinkNotes(e.target.value)}
                maxLength={1000}
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </div>
            <button
              type="submit"
              disabled={linking || !linkVersion.trim() || !linkUrl.trim() || !data.uploadEnabled}
              className="rounded bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-50"
            >
              {linking ? "Checking the file..." : "Link"}
            </button>
          </form>
        </>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted">Upload a new build</h2>
      <form onSubmit={upload} className="mt-3 max-w-xl space-y-4 rounded-lg border border-line bg-white p-4">
        <p className="rounded border border-gold/40 bg-gold/10 px-3 py-2 text-xs leading-relaxed">
          Everyone who taps Download installs this file on their phone. Only upload a build you made yourself, from the
          source, and signed with your release key. Every upload and every publish is recorded in the audit log.
        </p>
        {!data.uploadEnabled && (
          <p className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            Uploading is switched off on this server.
          </p>
        )}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="app-version">
            Version
          </label>
          <input
            id="app-version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="0.1.0-beta1"
            maxLength={40}
            className="mt-1 w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="app-notes">
            Notes (optional)
          </label>
          <input
            id="app-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            placeholder="What changed in this build"
            className="mt-1 w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="app-file">
            The .apk file (up to {data.maxUploadMb} MB)
          </label>
          <input
            id="app-file"
            ref={fileInput}
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm"
          />
        </div>
        {error && (
          <p role="alert" className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded border border-gold/40 bg-gold/10 px-3 py-2 text-sm">
            {notice}
          </p>
        )}
        <button
          type="submit"
          disabled={uploading || !file || !version.trim() || !data.uploadEnabled}
          className="rounded bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
