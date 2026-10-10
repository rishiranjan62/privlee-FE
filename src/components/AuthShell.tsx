import type { ReactNode } from "react";
import Logo from "./Logo";
import { Link } from "react-router-dom";

export { inputClass, labelClass, primaryBtn } from "../lib/ui";

export function PrimaryFill() {
  return (
    <span className="absolute inset-0 -translate-x-full bg-[color:var(--l-gold)] transition-transform duration-500 ease-out group-hover:translate-x-0" />
  );
}

const cards = [
  { name: "Isha", meta: "34 · Mumbai", tone: "from-[#e8c9a0] to-[#c98f6b]", pos: "left-4 top-6 [--r:-7deg]", delay: "0s" },
  { name: "Rohan", meta: "38 · Delhi", tone: "from-[#cdb9a0] to-[#8e7a66]", pos: "right-4 top-40 [--r:6deg]", delay: "-2.5s" },
  { name: "Meera", meta: "31 · Pune", tone: "from-[#f0d4c0] to-[#d79a8a]", pos: "left-20 bottom-4 [--r:3deg]", delay: "-5s" },
];

function Showcase() {
  return (
    <aside className="relative isolate hidden overflow-hidden bg-[#f3e7d3] lg:block">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="drift absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[#f1cfa0]/80 blur-3xl" />
        <div className="drift absolute -right-24 top-1/3 h-[26rem] w-[26rem] rounded-full bg-[#f2b8a6]/70 blur-3xl" style={{ animationDelay: "-7s" }} />
        <div className="drift absolute bottom-[-8rem] left-1/4 h-[24rem] w-[24rem] rounded-full bg-[#e9dcc0]/90 blur-3xl" style={{ animationDelay: "-12s" }} />
        <div className="grain absolute inset-0" />
      </div>

      <div className="relative mx-auto flex h-full max-w-lg flex-col justify-between px-12 py-14">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[color:var(--l-gold)]">Discreet by design</p>

        <div className="relative my-8 h-[26rem]">
          {cards.map((c) => (
            <div
              key={c.name}
              className={`float absolute w-48 rounded-2xl border border-[color:var(--l-line)] bg-[color:var(--l-card)] p-2.5 shadow-[0_24px_60px_-20px_rgba(120,80,30,0.4)] ${c.pos}`}
              style={{ animationDelay: c.delay }}
            >
              <div className={`photo-unblur h-40 rounded-xl bg-gradient-to-br ${c.tone}`} style={{ animationDelay: c.delay }}>
                <div className="flex h-full items-center justify-center">
                  <div className="h-14 w-14 rounded-full bg-white/40" />
                </div>
              </div>
              <div className="px-1.5 pb-1 pt-3">
                <p className="font-display text-xl font-medium">{c.name}</p>
                <p className="text-xs text-[color:var(--l-muted)]">{c.meta}</p>
              </div>
            </div>
          ))}
        </div>

        <blockquote>
          <p className="font-display text-4xl font-medium leading-tight">
            Connection, without <span className="gold-text italic">exposure.</span>
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[color:var(--l-muted)]">
            No real names. Photos stay blurred until you choose. One tap hides the whole app.
          </p>
        </blockquote>
      </div>
    </aside>
  );
}

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="landing grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <main className="relative isolate flex flex-col px-6 py-8 sm:px-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden lg:hidden">
          <div className="drift absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#f1cfa0]/70 blur-3xl" />
          <div className="drift absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#f2c4b3]/60 blur-3xl" style={{ animationDelay: "-6s" }} />
        </div>
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Privlee, home" className="flex items-center">
            <Logo className="h-12" />
          </Link>
          <Link to="/" className="text-sm text-[color:var(--l-muted)] transition hover:text-[color:var(--l-ink)]">
            ← Back
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-center text-xs text-[color:var(--l-muted)]">
          Adults 18+ only · Your details are never shown ·{" "}
          <Link to="/terms" className="underline-offset-2 hover:underline">
            Terms
          </Link>{" "}
          ·{" "}
          <Link to="/privacy" className="underline-offset-2 hover:underline">
            Privacy
          </Link>
        </p>
      </main>
      <Showcase />
    </div>
  );
}
