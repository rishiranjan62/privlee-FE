# SEO launch checklist

What the code already does, and what only a person can do. Work down the list once the site has a
real domain.

## What is built

- Public pages (`/`, `/login`, `/signup`, `/terms`, `/privacy`, `/faq`, `/guides`, each guide) are
  pre-rendered to plain HTML at build time, with their own title, description, canonical link and
  share tags. The FAQ also carries FAQPage structured data.
- Everything behind the sign-in (member app, admin, `/verify-email`) is `noindex` and disallowed in
  `robots.txt`.
- `robots.txt` is always written; `sitemap.xml` is written when `VITE_SITE_URL` is set.
- Google / Bing site-verification meta tags are written when their env vars are set.
- The member and admin code is split out of the first download, so the landing page stays light.

## 1. Build for production

```
VITE_SITE_URL=https://yourdomain.com \
VITE_GOOGLE_SITE_VERIFICATION=<code from Search Console> \
VITE_BING_SITE_VERIFICATION=<code from Bing Webmaster Tools> \
npm run build
```

All three are optional. Without `VITE_SITE_URL` there is no sitemap and no canonical links (rather
than wrong ones).

## 2. Host it so crawlers get the pre-built pages

- Serve `dist/<path>/index.html` for `/<path>` (e.g. `/faq` -> `dist/faq/index.html`). Netlify,
  Vercel, Cloudflare Pages and nginx `try_files $uri $uri/index.html /index.html` all do this.
- Any other path (the signed-in app: `/discover`, `/messages`...) falls back to `dist/index.html`.
- Serve over HTTPS, redirect `www` <-> bare domain to one of them, and make sure `/api` reaches the
  backend.
- Add a header `X-Robots-Tag: noindex, nofollow` for `/admin*`, `/verify-email*` and the member
  paths. It is a stronger guarantee than the page tag, and covers non-HTML responses.

## 3. Register with the search engines (free)

1. Google Search Console: add the domain property, copy the verification code into
   `VITE_GOOGLE_SITE_VERIFICATION`, rebuild and deploy, then verify.
2. Submit `https://yourdomain.com/sitemap.xml`.
3. Use "URL Inspection" on `/` and `/faq` and request indexing.
4. Do the same in Bing Webmaster Tools (it can import from Search Console).
5. Check back weekly: Pages (what is indexed), Performance (which searches show you).

## 4. Still to make

- A share image (1200x630) and then `og:image` / `og:url` in `index.html`.
- More guides and FAQ entries, each answering a question people really search. Add them to
  `src/lib/siteContent.ts`; they are picked up by the pages, the pre-render and the sitemap
  automatically.
- Do not publish near-identical city pages. Add a city page only if it has content of its own.

## 5. Promotion (people work, not code)

- Links from other sites matter most: one from a respected site beats many weak ones. Candidates:
  Product Hunt launch, a short press/blog pitch about privacy-first dating, relevant directories,
  and the social profiles for the brand (link them back to the site).
- Once the Android and iOS apps exist: store listings need keywords, screenshots and a privacy
  label, and ratings drive discovery.
- Check each platform's advertising and listing rules before planning paid promotion. Google Ads,
  Meta and the app stores restrict "affair"/infidelity positioning.

## Never publish

- How to leave the panic screen. It is taught once, inside the app, so a bystander cannot read it.
  (An older landing line that gave it away has been removed.)
