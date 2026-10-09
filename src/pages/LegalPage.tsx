import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { privacy, terms, type LegalDocument } from "../lib/legal";

/**
 * One layout for both documents. Reachable signed in or out, so it never redirects, and "Back"
 * returns to wherever the reader came from (the sign-up form, say) rather than to a fixed page.
 */
export default function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const doc: LegalDocument = kind === "terms" ? terms : privacy;
  const other = kind === "terms" ? { to: "/privacy", label: "Privacy Policy" } : { to: "/terms", label: "Terms of Service" };
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${doc.title} · Privlee`;
  }, [doc.title]);

  // location.key is "default" on a fresh load, when there is nothing to go back to.
  const canGoBack = location.key !== "default";

  return (
    <div className="landing min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-8">
        <Link to="/" className="font-display text-3xl font-semibold tracking-wide">
          Priv<span className="gold-text italic">lee</span>
        </Link>
        <button
          onClick={() => (canGoBack ? navigate(-1) : navigate("/"))}
          className="text-sm text-[color:var(--l-muted)] transition hover:text-[color:var(--l-ink)]"
        >
          ← Back
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20">
        <h1 className="font-display text-5xl font-medium leading-tight">{doc.title}</h1>
        <p className="mt-2 text-sm text-[color:var(--l-muted)]">Last updated {doc.updated}</p>
        <p className="mt-6 text-lg leading-relaxed">{doc.intro}</p>

        <nav aria-label="Contents" className="mt-8 rounded-2xl border border-[color:var(--l-line)] bg-[color:var(--l-card)] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--l-muted)]">On this page</p>
          <ol className="mt-3 columns-1 gap-8 text-sm sm:columns-2">
            {doc.sections.map((s, i) => (
              <li key={s.heading} className="py-0.5">
                <a href={`#s${i + 1}`} className="transition hover:text-[color:var(--l-gold)]">
                  {i + 1}. {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {doc.sections.map((s, i) => (
          <section key={s.heading} id={`s${i + 1}`} className="mt-10 scroll-mt-6">
            <h2 className="font-display text-2xl font-medium">
              {i + 1}. {s.heading}
            </h2>
            <div className="mt-3 space-y-3 leading-relaxed text-[color:var(--l-ink)]/90">
              {s.body.map((block, j) =>
                typeof block === "string" ? (
                  <p key={j}>{block}</p>
                ) : (
                  <ul key={j} className="list-disc space-y-1.5 pl-6">
                    {block.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ),
              )}
            </div>
          </section>
        ))}

        <p className="mt-14 border-t border-[color:var(--l-line)] pt-6 text-sm text-[color:var(--l-muted)]">
          Also read our{" "}
          <Link to={other.to} className="font-medium text-[color:var(--l-gold)] hover:underline">
            {other.label}
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
