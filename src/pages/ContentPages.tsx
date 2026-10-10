import { Link, Navigate, useParams } from "react-router-dom";
import { privacy, terms } from "../lib/legal";
import { faq, findGuide, guideJsonLd, guides } from "../lib/siteContent";
import { usePageMeta } from "../lib/seo";
import Logo from "../components/Logo";
import DocumentPage from "./DocumentPage";

/** Terms and Privacy cross-link; everything public links on to the guides. */
export function TermsPage() {
  return (
    <DocumentPage
      doc={terms}
      path="/terms"
      description="The terms of using Privlee."
      related={[{ to: "/privacy", label: "Privacy Policy" }, { to: "/faq", label: "Frequently asked questions" }]}
    />
  );
}

export function PrivacyPage() {
  return (
    <DocumentPage
      doc={privacy}
      path="/privacy"
      description="How Privlee collects, uses and protects your information."
      related={[{ to: "/terms", label: "Terms of Service" }, { to: "/faq", label: "Frequently asked questions" }]}
    />
  );
}

export function FaqPage() {
  // Lets a search engine show each question and answer directly in the results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.sections.map((s) => ({
      "@type": "Question",
      name: s.heading,
      acceptedAnswer: { "@type": "Answer", text: s.body.filter((b): b is string => typeof b === "string").join(" ") },
    })),
  };
  return (
    <DocumentPage
      doc={faq}
      path="/faq"
      description={faq.description}
      jsonLd={jsonLd}
      contents={false}
      related={[{ to: "/guides", label: "Guides" }, { to: "/privacy", label: "Privacy Policy" }]}
    />
  );
}

export function GuidesIndexPage() {
  usePageMeta({
    title: "Guides - Privlee",
    description: "Plain guides to staying private and safe on Privlee: photo privacy, the panic button, pseudonyms, and meeting someone new.",
    index: true,
    path: "/guides",
  });
  return (
    <div className="landing min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-8">
        <Link to="/" aria-label="Privlee, home" className="flex items-center">
          <Logo className="h-12" />
        </Link>
        <Link to="/" className="text-sm text-[color:var(--l-muted)] transition hover:text-[color:var(--l-ink)]">
          ← Home
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-20">
        <h1 className="font-display text-5xl font-medium leading-tight">Guides</h1>
        <p className="mt-6 text-lg leading-relaxed">
          Plain explanations of how Privlee protects your privacy, and how to stay safe.
        </p>
        <ul className="mt-10 space-y-4">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link
                to={`/guides/${g.slug}`}
                className="block rounded-2xl border border-[color:var(--l-line)] bg-[color:var(--l-card)] p-6 transition hover:border-[color:var(--l-gold)]"
              >
                <h2 className="font-display text-2xl font-medium">{g.title}</h2>
                <p className="mt-2 text-[color:var(--l-muted)]">{g.description}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-sm text-[color:var(--l-muted)]">
          Looking for quick answers? Read the{" "}
          <Link to="/faq" className="font-medium text-[color:var(--l-gold)] hover:underline">
            FAQ
          </Link>
          .
        </p>
      </main>
    </div>
  );
}

export function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const guide = findGuide(slug);
  if (!guide) return <Navigate to="/guides" replace />;
  return (
    <DocumentPage
      doc={guide}
      path={`/guides/${guide.slug}`}
      description={guide.description}
      jsonLd={guideJsonLd(guide)}
      contents={false}
      related={[
        ...guides.filter((g) => g.slug !== guide.slug).map((g) => ({ to: `/guides/${g.slug}`, label: g.title })),
        { to: "/faq", label: "Frequently asked questions" },
      ]}
    />
  );
}
