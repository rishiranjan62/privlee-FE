import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { privacy, terms, type LegalDocument } from "../lib/legal";
import { pageMeta } from "../lib/pageMeta";
import { faq, guides } from "../lib/siteContent";

/**
 * Plain-HTML versions of the public pages, written into the production build (see vite.config.ts).
 *
 * Why: the real pages are assembled in the browser by JavaScript. A search engine - or a link
 * preview, or anyone with scripts off - that does not run it would see an empty page. These shells
 * are the same text, present in the HTML from the first byte. When the app loads, React replaces
 * them, so people see the real, animated page.
 *
 * Keep the wording in step with the real pages: showing a crawler different text from what people
 * see is the one thing search engines punish.
 */

export interface Shell {
  title: string;
  description: string;
  body: string;
  /** Structured data to include for this page, if any. */
  jsonLd?: object;
}

const NAV = (
  <p>
    <a href="/signup">Create your private profile</a> · <a href="/login">Sign in</a> · <a href="/faq">FAQ</a> ·{" "}
    <a href="/guides">Guides</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a>
  </p>
);

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="landing min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="font-display text-3xl font-semibold tracking-wide">
          Priv<span className="gold-text italic">lee</span>
        </p>
        {children}
        <footer className="mt-12 text-sm text-[color:var(--l-muted)]">{NAV}</footer>
      </div>
    </div>
  );
}

function DocumentBody({ doc }: { doc: LegalDocument }) {
  return (
    <main>
      <h1 className="mt-10 font-display text-5xl font-medium leading-tight">{doc.title}</h1>
      <p className="mt-2 text-sm">Last updated {doc.updated}</p>
      <p className="mt-6 text-lg">{doc.intro}</p>
      {doc.sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="font-display text-2xl font-medium">{s.heading}</h2>
          {s.body.map((b, i) =>
            typeof b === "string" ? (
              <p key={i} className="mt-3">
                {b}
              </p>
            ) : (
              <ul key={i} className="mt-3 list-disc pl-6">
                {b.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
    </main>
  );
}

const render = (node: ReactNode) => renderToStaticMarkup(<Frame>{node}</Frame>);

function documentShell(doc: LegalDocument, description: string, jsonLd?: object): Shell {
  return { title: `${doc.title} - Privlee`, description, body: render(<DocumentBody doc={doc} />), jsonLd };
}

/** The pages worth pre-building, by path. Anything else is the signed-in app and stays client-side. */
export function renderShell(path: string): Shell | null {
  switch (path) {
    case "/":
      return {
        ...pageMeta.landing,
        body: render(
          <main>
            <h1 className="mt-10 font-display text-6xl font-medium leading-tight">Connection, without exposure.</h1>
            <p className="mt-6 text-lg">
              A quiet, private space for adults who want to meet on their own terms. No real names. No public
              profiles. Nothing left on show.
            </p>
            <h2 className="mt-12 font-display text-3xl font-medium">Built around keeping you unseen.</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>
                <strong>Photos stay blurred.</strong> Your pictures are hidden by default. You decide who sees you,
                and when.
              </li>
              <li>
                <strong>Pseudonym only.</strong> No real name, ever. Your email is never shown to anyone.
              </li>
              <li>
                <strong>Incognito mode.</strong> Step out of discovery whenever you like. Browse quietly.
              </li>
              <li>
                <strong>A panic button, always in reach.</strong> One tap turns Privlee into an ordinary notes
                screen. Only you know the way back.
              </li>
            </ul>
            <h2 className="mt-12 font-display text-3xl font-medium">Three quiet steps.</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-6">
              <li>
                <strong>Create a pseudonym.</strong> Sign up in under a minute with a name that is yours alone.
              </li>
              <li>
                <strong>Set your intentions.</strong> Say what you are looking for, plainly and without judgement.
              </li>
              <li>
                <strong>Connect in private.</strong> Say hello, match, and talk, on terms you control.
              </li>
            </ol>
            <p className="mt-10 text-sm">Adults 18+ only.</p>
          </main>,
        ),
      };
    case "/login":
      return {
        ...pageMeta.login,
        body: render(
          <main>
            <h1 className="mt-10 font-display text-5xl font-medium leading-tight">Step back inside.</h1>
            <p className="mt-4">Discreet by design. Sign in to pick up where you left off.</p>
            <p className="mt-6">
              New here? <a href="/signup">Create your private profile</a>.
            </p>
          </main>,
        ),
      };
    case "/signup":
      return {
        ...pageMeta.signup,
        body: render(
          <main>
            <h1 className="mt-10 font-display text-5xl font-medium leading-tight">Create your private profile.</h1>
            <p className="mt-4">
              Choose a pseudonym, tell us a little about you, and say what brings you here. Nothing but your
              pseudonym is ever shown. Adults 18+ only.
            </p>
            <p className="mt-6">
              Already have an account? <a href="/login">Sign in</a>.
            </p>
          </main>,
        ),
      };
    case "/terms":
      return documentShell(terms, "The terms of using Privlee.");
    case "/privacy":
      return documentShell(privacy, "How Privlee collects, uses and protects your information.");
    case "/faq":
      return documentShell(faq, faq.description, {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.sections.map((s) => ({
          "@type": "Question",
          name: s.heading,
          acceptedAnswer: {
            "@type": "Answer",
            text: s.body.filter((b): b is string => typeof b === "string").join(" "),
          },
        })),
      });
    case "/guides":
      return {
        title: "Guides - Privlee",
        description:
          "Plain guides to staying private and safe on Privlee: photo privacy, the panic button, pseudonyms, and meeting someone new.",
        body: render(
          <main>
            <h1 className="mt-10 font-display text-5xl font-medium leading-tight">Guides</h1>
            <p className="mt-6 text-lg">Plain explanations of how Privlee protects your privacy, and how to stay safe.</p>
            <ul className="mt-8 space-y-4">
              {guides.map((g) => (
                <li key={g.slug}>
                  <h2 className="font-display text-2xl font-medium">
                    <a href={`/guides/${g.slug}`}>{g.title}</a>
                  </h2>
                  <p className="mt-1">{g.description}</p>
                </li>
              ))}
            </ul>
          </main>,
        ),
      };
    default: {
      const guide = guides.find((g) => `/guides/${g.slug}` === path);
      return guide ? documentShell(guide, guide.description) : null;
    }
  }
}
