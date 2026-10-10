import AppDownloadSection from "../components/AppDownload";
import { Link } from "react-router-dom";
import { Reveal, RotatingWord, SpotCard, useScrollProgress } from "../components/landing";
import { pageMeta } from "../lib/pageMeta";
import Logo from "../components/Logo";
import { usePageMeta } from "../lib/seo";

const marquee = [
  "Pseudonym only",
  "Photos blurred by default",
  "Incognito mode",
  "One-tap panic button",
  "Adults 18+ only",
  "No public profiles",
];

const profiles = [
  { name: "Isha", meta: "34 · Mumbai", tone: "from-[#e8c9a0] to-[#c98f6b]", cls: "left-0 top-10 [--r:-7deg]", delay: "0s" },
  { name: "Rohan", meta: "38 · Delhi", tone: "from-[#cdb9a0] to-[#8e7a66]", cls: "right-0 top-0 [--r:6deg]", delay: "-2s" },
  { name: "Meera", meta: "31 · Pune", tone: "from-[#f0d4c0] to-[#d79a8a]", cls: "left-16 bottom-0 [--r:3deg]", delay: "-4s" },
];

const steps = [
  { n: "01", title: "Create a pseudonym", body: "Sign up in under a minute with a name that is yours alone." },
  { n: "02", title: "Set your intentions", body: "Say what you are looking for, plainly and without judgement." },
  { n: "03", title: "Connect in private", body: "Say hello, match, and talk, on terms you control." },
];

function HomeLink() {
  return (
    <Link to="/" aria-label="Privlee, home" className="flex items-center">
      <Logo className="h-12" />
    </Link>
  );
}

function ProfileCard({ p }: { p: (typeof profiles)[number] }) {
  return (
    <div
      className={`float absolute w-44 rounded-2xl border border-[color:var(--l-line)] bg-[color:var(--l-card)] p-2.5 shadow-[0_24px_60px_-20px_rgba(120,80,30,0.35)] sm:w-52 ${p.cls}`}
      style={{ animationDelay: p.delay }}
    >
      <div className={`photo-unblur h-44 rounded-xl bg-gradient-to-br sm:h-56 ${p.tone}`} style={{ animationDelay: p.delay }}>
        <div className="flex h-full items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-white/40" />
        </div>
      </div>
      <div className="px-1.5 pb-1 pt-3">
        <p className="font-display text-xl font-medium">{p.name}</p>
        <p className="text-xs text-[color:var(--l-muted)]">{p.meta}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  usePageMeta({
    ...pageMeta.landing,
    index: true,
    path: "/",
  });
  const { progress, scrolled } = useScrollProgress();

  return (
    <div className="landing relative min-h-full overflow-x-clip">
      <div
        className="fixed left-0 top-0 z-50 h-[2px] origin-left bg-[color:var(--l-gold)]"
        style={{ width: "100%", transform: `scaleX(${progress})` }}
      />

      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
          scrolled ? "border-b border-[color:var(--l-line)] bg-[color:var(--l-bg)]/80 backdrop-blur-xl" : ""
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:h-20">
          <HomeLink />
          <nav className="flex items-center gap-7 text-sm">
            <a href="#privacy" className="hidden text-[color:var(--l-muted)] transition hover:text-[color:var(--l-ink)] sm:block">
              Privacy
            </a>
            <a href="#how" className="hidden text-[color:var(--l-muted)] transition hover:text-[color:var(--l-ink)] sm:block">
              How it works
            </a>
            <a href="#app" className="hidden text-[color:var(--l-muted)] transition hover:text-[color:var(--l-ink)] sm:block">
              App
            </a>
            <Link to="/login" className="text-[color:var(--l-muted)] transition hover:text-[color:var(--l-ink)]">
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-[color:var(--l-ink)] px-5 py-2 text-[color:var(--l-bg)] transition hover:bg-[color:var(--l-gold)]"
            >
              Join
            </Link>
          </nav>
        </div>
        {/* The three section links sit in the header from sm up; on a phone they get a slim row of their own. */}
        <nav aria-label="Sections" className="flex justify-center gap-7 pb-2 text-xs text-[color:var(--l-muted)] sm:hidden">
          <a href="#privacy" className="transition hover:text-[color:var(--l-ink)]">Privacy</a>
          <a href="#how" className="transition hover:text-[color:var(--l-ink)]">How it works</a>
          <a href="#app" className="transition hover:text-[color:var(--l-ink)]">App</a>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative isolate">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="drift absolute -left-40 -top-32 h-[34rem] w-[34rem] rounded-full bg-[#f1cfa0]/70 blur-3xl" />
          <div
            className="drift absolute -right-32 top-20 h-[30rem] w-[30rem] rounded-full bg-[#f2c4b3]/60 blur-3xl"
            style={{ animationDelay: "-6s" }}
          />
          <div
            className="drift absolute bottom-[-10rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-[#e9dcc0]/80 blur-3xl"
            style={{ animationDelay: "-11s" }}
          />
          <div className="grain absolute inset-0" />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 pb-24 pt-36 lg:grid-cols-2 lg:pt-44">
          <div>
            <p className="rise-soft inline-flex items-center gap-2 rounded-full border border-[color:var(--l-line)] bg-white/60 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.25em] text-[color:var(--l-gold)] backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-[color:var(--l-gold)] [animation:pulse-ring_2s_ease-out_infinite]" />
                <span className="relative h-2 w-2 rounded-full bg-[color:var(--l-gold)]" />
              </span>
              Discreet by design
            </p>
            <h1
              className="rise-soft mt-7 font-display text-6xl font-medium leading-[1.02] sm:text-7xl lg:text-[5.5rem]"
              style={{ animationDelay: "120ms" }}
            >
              Connection,
              <br />
              without <RotatingWord words={["exposure.", "judgement.", "noise.", "a trace."]} />
            </h1>
            <p
              className="rise-soft mt-8 max-w-md text-lg font-light leading-relaxed text-[color:var(--l-muted)]"
              style={{ animationDelay: "260ms" }}
            >
              A quiet, private space for adults who want to meet on their own terms. No real names. No public
              profiles. Nothing left on show.
            </p>
            <div className="rise-soft mt-10 flex flex-wrap items-center gap-4" style={{ animationDelay: "380ms" }}>
              <Link
                to="/signup"
                className="group relative overflow-hidden rounded-full bg-[color:var(--l-ink)] px-8 py-3.5 font-medium text-[color:var(--l-bg)] shadow-[0_18px_40px_-14px_rgba(29,26,22,0.6)] transition hover:-translate-y-0.5"
              >
                <span className="relative z-10">Create your private profile</span>
                <span className="absolute inset-0 -translate-x-full bg-[color:var(--l-gold)] transition-transform duration-500 ease-out group-hover:translate-x-0" />
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-[color:var(--l-line)] bg-white/50 px-8 py-3.5 backdrop-blur transition hover:border-[color:var(--l-gold)]"
              >
                Sign in
              </Link>
            </div>
            <p className="rise-soft mt-6 text-xs text-[color:var(--l-muted)]" style={{ animationDelay: "480ms" }}>
              Adults 18+ only.
            </p>
          </div>

          <div className="rise relative mx-auto h-[28rem] w-full max-w-md sm:h-[32rem]" style={{ animationDelay: "300ms" }}>
            {profiles.map((p) => (
              <ProfileCard key={p.name} p={p} />
            ))}
            <p className="absolute -bottom-2 right-0 text-xs italic text-[color:var(--l-muted)]">
              Photos stay blurred until you choose.
            </p>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="overflow-hidden border-y border-[color:var(--l-line)] bg-white/50 py-5">
        <div className="marquee-track flex w-max gap-12 whitespace-nowrap">
          {[...marquee, ...marquee, ...marquee, ...marquee].map((m, i) => (
            <span key={i} className="flex items-center gap-12 font-display text-xl italic text-[color:var(--l-muted)]">
              {m}
              <span className="text-[color:var(--l-gold)]">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* PRIVACY BENTO */}
      <section id="privacy" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-28">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[color:var(--l-gold)]">Privacy first</p>
          <h2 className="mt-4 max-w-2xl font-display text-5xl font-medium leading-tight sm:text-6xl">
            Built around keeping you <span className="gold-text italic">unseen.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-5 md:grid-cols-6">
          <Reveal className="md:col-span-4">
            <SpotCard className="h-full rounded-3xl border border-[color:var(--l-line)] bg-[color:var(--l-card)] p-8 shadow-[0_30px_60px_-40px_rgba(120,80,30,0.4)]">
              <h3 className="font-display text-3xl font-medium">Photos stay blurred</h3>
              <p className="mt-3 max-w-md leading-relaxed text-[color:var(--l-muted)]">
                Your pictures are hidden by default. You decide who sees you, and when.
              </p>
              <div className="mt-8 flex gap-4">
                {["from-[#e8c9a0] to-[#c98f6b]", "from-[#f0d4c0] to-[#d79a8a]", "from-[#cdb9a0] to-[#8e7a66]"].map((t, i) => (
                  <div
                    key={i}
                    className={`photo-unblur h-28 flex-1 rounded-xl bg-gradient-to-br ${t}`}
                    style={{ animationDelay: `${-i * 1.6}s` }}
                  />
                ))}
              </div>
            </SpotCard>
          </Reveal>

          <Reveal delay={120} className="md:col-span-2">
            <SpotCard className="h-full rounded-3xl border border-[color:var(--l-line)] bg-[color:var(--l-card)] p-8 shadow-[0_30px_60px_-40px_rgba(120,80,30,0.4)]">
              <h3 className="font-display text-3xl font-medium">Pseudonym only</h3>
              <p className="mt-3 leading-relaxed text-[color:var(--l-muted)]">
                No real name, ever. Your email is never shown to anyone.
              </p>
              <div className="mt-8 rounded-xl border border-dashed border-[color:var(--l-line)] px-4 py-3 font-mono text-sm text-[color:var(--l-muted)]">
                <span className="line-through opacity-60">Priya Sharma</span>
                <span className="mx-2">→</span>
                <span className="text-[color:var(--l-gold)]">NightOwl</span>
              </div>
            </SpotCard>
          </Reveal>

          <Reveal className="md:col-span-2">
            <SpotCard className="h-full rounded-3xl border border-[color:var(--l-line)] bg-[color:var(--l-card)] p-8 shadow-[0_30px_60px_-40px_rgba(120,80,30,0.4)]">
              <h3 className="font-display text-3xl font-medium">Incognito mode</h3>
              <p className="mt-3 leading-relaxed text-[color:var(--l-muted)]">
                Step out of discovery whenever you like. Browse quietly.
              </p>
              <div className="mt-8 flex h-8 w-14 items-center rounded-full bg-[color:var(--l-ink)] p-1">
                <div className="h-6 w-6 translate-x-6 rounded-full bg-[color:var(--l-gold)] transition" />
              </div>
            </SpotCard>
          </Reveal>

          <Reveal delay={120} className="md:col-span-4">
            <SpotCard className="h-full rounded-3xl bg-[color:var(--l-ink)] p-8 text-[color:var(--l-bg)] shadow-[0_30px_60px_-30px_rgba(29,26,22,0.6)]">
              <h3 className="font-display text-3xl font-medium">A panic button, always in reach</h3>
              <p className="mt-3 max-w-md leading-relaxed text-[#cfc6b6]">
                One tap turns Privlee into an ordinary notes screen. Only you know the way back.
              </p>
              <div className="mt-8 flex items-center gap-4">
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-[#d4a762] [animation:pulse-ring_2.2s_ease-out_infinite]" />
                  <span className="relative h-12 w-12 rounded-full bg-[#d4a762]" />
                </div>
                <span className="font-display text-xl italic text-[#d4a762]">Gone in a heartbeat.</span>
              </div>
            </SpotCard>
          </Reveal>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="scroll-mt-24 border-t border-[color:var(--l-line)] bg-white/50">
        <div className="mx-auto max-w-6xl px-6 py-28">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-[color:var(--l-gold)]">How it works</p>
            <h2 className="mt-4 font-display text-5xl font-medium sm:text-6xl">Three quiet steps.</h2>
          </Reveal>
          <ol className="mt-16 grid gap-12 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.n}>
                <Reveal delay={i * 140}>
                  <span className="gold-text font-display text-7xl font-medium">{s.n}</span>
                  <div className="mt-4 h-px w-full bg-gradient-to-r from-[color:var(--l-gold)] to-transparent" />
                  <h3 className="mt-5 text-xl font-medium">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-[color:var(--l-muted)]">{s.body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* APP */}
      <AppDownloadSection />

      {/* CTA */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="drift absolute left-1/4 top-0 h-96 w-96 rounded-full bg-[#f1cfa0]/60 blur-3xl" />
          <div className="drift absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-[#f2c4b3]/50 blur-3xl" style={{ animationDelay: "-8s" }} />
        </div>
        <Reveal className="mx-auto max-w-3xl px-6 py-32 text-center">
          <h2 className="font-display text-5xl font-medium leading-tight sm:text-7xl">
            Discretion isn't a feature.
            <br />
            <span className="gold-text italic">It's the whole point.</span>
          </h2>
          <Link
            to="/signup"
            className="mt-12 inline-block rounded-full bg-[color:var(--l-ink)] px-10 py-4 font-medium text-[color:var(--l-bg)] shadow-[0_18px_40px_-14px_rgba(29,26,22,0.6)] transition hover:-translate-y-0.5 hover:bg-[color:var(--l-gold)]"
          >
            Join Privlee
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-[color:var(--l-line)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-[color:var(--l-muted)] sm:flex-row">
          <HomeLink />
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} Privlee. For adults 18+.</span>
            <Link to="/terms" className="transition hover:text-[color:var(--l-ink)]">
              Terms
            </Link>
            <Link to="/privacy" className="transition hover:text-[color:var(--l-ink)]">
              Privacy
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
