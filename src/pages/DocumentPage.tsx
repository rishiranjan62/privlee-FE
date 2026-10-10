import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { LegalDocument } from "../lib/legal";
import Logo from "../components/Logo";
import { usePageMeta } from "../lib/seo";

export interface RelatedLink {
  to: string;
  label: string;
}

interface Props {
  doc: LegalDocument;
  description: string;
  /** The page's own path, for the canonical link. */
  path: string;
  /** Other pages worth reading next, shown at the foot. */
  related?: RelatedLink[];
  /** Structured data for search engines, e.g. FAQPage. */
  jsonLd?: object;
  /** Adds a numbered contents list; only worth it for long documents. */
  contents?: boolean;
}

/**
 * One layout for every public text page: Terms, Privacy, the FAQ and the guides. Reachable signed in
 * or out, so it never redirects, and "Back" returns to wherever the reader came from (the sign-up
 * form, say) rather than to a fixed page.
 */
export default function DocumentPage({ doc, description, path, related = [], jsonLd, contents = true }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  usePageMeta({ title: `${doc.title} - Privlee`, description, index: true, path, jsonLd });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  // location.key is "default" on a fresh load, when there is nothing to go back to.
  const canGoBack = location.key !== "default";

  return (
    <div className="landing min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-8">
        <Link to="/" aria-label="Privlee, home" className="flex items-center">
          <Logo className="h-12" />
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

        {contents && doc.sections.length > 4 && (
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
        )}

        {doc.sections.map((s, i) => (
          <section key={s.heading} id={`s${i + 1}`} className="mt-10 scroll-mt-6">
            <h2 className="font-display text-2xl font-medium">{s.heading}</h2>
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

        {related.length > 0 && (
          <nav aria-label="Related" className="mt-14 border-t border-[color:var(--l-line)] pt-6 text-sm text-[color:var(--l-muted)]">
            <p className="font-medium text-[color:var(--l-ink)]">Keep reading</p>
            <ul className="mt-3 space-y-1.5">
              {related.map((r) => (
                <li key={r.to}>
                  <Link to={r.to} className="font-medium text-[color:var(--l-gold)] hover:underline">
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <p className="mt-10 text-sm text-[color:var(--l-muted)]">
          <Link to="/signup" className="font-medium text-[color:var(--l-gold)] hover:underline">
            Create your private profile
          </Link>{" "}
          · <Link to="/terms" className="hover:underline">Terms</Link> ·{" "}
          <Link to="/privacy" className="hover:underline">Privacy</Link> ·{" "}
          <Link to="/faq" className="hover:underline">FAQ</Link> ·{" "}
          <Link to="/guides" className="hover:underline">Guides</Link>
        </p>
      </main>
    </div>
  );
}
