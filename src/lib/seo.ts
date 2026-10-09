import { useEffect } from "react";

/**
 * The public address of the site, e.g. https://privlee.example (no trailing slash). Set
 * VITE_SITE_URL when building for production; without it, canonical links are simply left out
 * rather than pointing somewhere wrong.
 */
const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "");

interface PageMeta {
  title: string;
  description?: string;
  /** Whether search engines may list this page. Everything behind the sign-in is false. */
  index: boolean;
  /** The page's own path, for its canonical link. Leave out for pages that are not indexed. */
  path?: string;
  /** Structured data (JSON-LD) describing the page, e.g. a FAQ. Removed again when absent. */
  jsonLd?: object;
}

function setMeta(name: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.name = name;
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function setCanonical(href: string | null) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
}

const JSON_LD_ID = "page-json-ld";

function setJsonLd(data: object | undefined) {
  document.getElementById(JSON_LD_ID)?.remove();
  if (!data) return;
  const script = document.createElement("script");
  script.id = JSON_LD_ID;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * Sets the tab title, description, indexing rule and canonical link for the current page.
 *
 * Every page states its robots rule explicitly. If only the private pages said "noindex", a public
 * page reached after one of them would still carry the old value, since the tags live on the
 * document and not on the page.
 */
export function usePageMeta({ title, description, index, path, jsonLd }: PageMeta) {
  useEffect(() => {
    document.title = title;
    if (description) setMeta("description", description);
    setMeta("robots", index ? "index, follow" : "noindex, nofollow");
    setCanonical(index && SITE_URL && path !== undefined ? SITE_URL + path : null);
    setJsonLd(jsonLd);
    // The content is constant per page, so the effect runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, index, path]);
}
