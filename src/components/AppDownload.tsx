import { useEffect, useState } from "react";
import { ANDROID_DOWNLOAD_URL, api } from "../lib/api";
import { Reveal } from "./landing";
import type { AndroidRelease } from "../lib/types";

const megabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const card =
  "flex flex-col rounded-3xl border border-[color:var(--l-line)] bg-white/70 p-8 shadow-[0_30px_60px_-40px_rgba(120,80,30,0.4)]";

function Pill({ children, tone = "gold" }: { children: string; tone?: "gold" | "muted" }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
        tone === "gold" ? "bg-[color:var(--l-gold)]/15 text-[color:var(--l-gold)]" : "bg-black/5 text-[color:var(--l-muted)]"
      }`}
    >
      {children}
    </span>
  );
}

/** The "Get the app" section of the landing page: an Android beta to download, and iPhone coming later. */
export default function AppDownloadSection() {
  // null while we ask, "none" if the question could not be answered at all.
  const [release, setRelease] = useState<AndroidRelease | "none" | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    api
      .getAndroidRelease()
      .then((r) => live && setRelease(r))
      .catch(() => live && setRelease("none"));
    return () => {
      live = false;
    };
  }, []);

  const onAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
  const ready = release !== null && release !== "none" && release.available;

  async function copyChecksum(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard blocked: the checksum is on screen to select by hand. */
    }
  }

  return (
    <section id="app" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-28">
      <Reveal>
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[color:var(--l-gold)]">Get the app</p>
        <h2 className="mt-4 font-display text-5xl font-medium sm:text-6xl">
          Take it <span className="gold-text italic">with you.</span>
        </h2>
        <p className="mt-5 max-w-2xl leading-relaxed text-[color:var(--l-muted)]">
          The Privlee app is in beta. It does everything the website does, with a button that hides it instantly, and it
          keeps itself out of your phone's screenshots and recent-apps view.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {/* ANDROID */}
        <Reveal>
          <div className={card}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-3xl font-medium">Android</h3>
              <Pill>Beta</Pill>
            </div>

            {ready ? (
              <p className="mt-3 text-sm text-[color:var(--l-muted)]">
                Version {release.versionName}
                {release.sizeBytes ? ` · ${megabytes(release.sizeBytes)}` : ""}
                {release.publishedAt ? ` · ${new Date(release.publishedAt).toLocaleDateString()}` : ""}
              </p>
            ) : (
              <p className="mt-3 text-sm text-[color:var(--l-muted)]">
                {release === null ? "Checking for the latest build..." : "The beta isn't open for download just yet. Check back soon."}
              </p>
            )}

            <p className="mt-4 leading-relaxed text-[color:var(--l-muted)]">
              It's a beta, so expect a few rough edges. It isn't on the Play Store yet, so you download it here and install
              it yourself. It takes about a minute.
            </p>

            {ready ? (
              <a
                href={ANDROID_DOWNLOAD_URL}
                download
                className="mt-7 inline-flex w-fit items-center justify-center rounded-full bg-[color:var(--l-ink)] px-8 py-3.5 font-medium text-[color:var(--l-bg)] shadow-[0_18px_40px_-14px_rgba(29,26,22,0.6)] transition hover:-translate-y-0.5 hover:bg-[color:var(--l-gold)]"
              >
                Download for Android
              </a>
            ) : (
              <span
                aria-disabled="true"
                className="mt-7 inline-flex w-fit cursor-not-allowed items-center justify-center rounded-full bg-[color:var(--l-ink)]/40 px-8 py-3.5 font-medium text-[color:var(--l-bg)]"
              >
                Download for Android
              </span>
            )}
            {ready && !onAndroid && (
              <p className="mt-3 text-sm text-[color:var(--l-muted)]">Open this page on your Android phone to install it.</p>
            )}

            <details className="mt-7 border-t border-[color:var(--l-line)] pt-5" open={ready && onAndroid}>
              <summary className="cursor-pointer text-sm font-medium">How to install</summary>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--l-muted)]">
                <li>Tap <strong className="text-[color:var(--l-ink)]">Download for Android</strong> on your phone.</li>
                <li>When it finishes, open the file from the notification or your Downloads.</li>
                <li>If Android asks, allow your browser to install apps this once. It only needs to be allowed for this file.</li>
                <li>If Google Play Protect warns that the app is unrecognised, choose <strong className="text-[color:var(--l-ink)]">Install anyway</strong>. That is expected for a beta that isn't on the Play Store.</li>
                <li>Open Privlee and sign in with the same account you use on the website.</li>
              </ol>
              <p className="mt-4 text-sm leading-relaxed text-[color:var(--l-muted)]">
                A website can't install an app by itself, so Android always asks you to confirm. To update, download the
                newest version the same way and install it over the old one.
              </p>
            </details>

            {ready && release.sha256 && (
              <details className="mt-4 border-t border-[color:var(--l-line)] pt-5">
                <summary className="cursor-pointer text-sm font-medium">Check your download</summary>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--l-muted)]">
                  Only install the app from this page. Its SHA-256 fingerprint is below; the file you downloaded should
                  give the same one.
                </p>
                <p className="mt-3 break-all rounded-xl bg-black/5 p-3 font-mono text-xs">{release.sha256}</p>
                <button
                  type="button"
                  onClick={() => copyChecksum(release.sha256 as string)}
                  className="mt-2 text-sm text-[color:var(--l-gold)] hover:underline"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </details>
            )}
          </div>
        </Reveal>

        {/* IPHONE */}
        <Reveal delay={140}>
          <div className={`${card} opacity-90`}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-3xl font-medium">iPhone</h3>
              <Pill tone="muted">Coming soon</Pill>
            </div>
            <p className="mt-4 leading-relaxed text-[color:var(--l-muted)]">
              An iPhone app is on its way. Until then, Privlee works in your phone's browser, and nothing is installed on
              your phone.
            </p>
            <span
              aria-disabled="true"
              className="mt-7 inline-flex w-fit cursor-not-allowed items-center justify-center rounded-full border border-[color:var(--l-line)] bg-white/60 px-8 py-3.5 font-medium text-[color:var(--l-muted)]"
            >
              Coming soon
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
