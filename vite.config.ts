import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createServer, defineConfig, loadEnv, type Plugin } from 'vite'
// Explicit extension: this file is checked under Node's module rules, which require one.
import { faq, guides } from './src/lib/siteContent.ts'

/** The pages search engines may list. Everything else sits behind the sign-in. */
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/terms',
  '/privacy',
  '/faq',
  '/guides',
  ...guides.map((g: { slug: string }) => `/guides/${g.slug}`),
]

/**
 * Where nothing should be crawled: the member app, the admin console, and the email-confirmation
 * page (its address carries a one-time token). None of these is reachable without signing in, so
 * this is belt and braces alongside the noindex tag each of those pages sets.
 */
const PRIVATE_PREFIXES = [
  '/admin',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/discover',
  '/likes',
  '/matches',
  '/messages',
  '/profile',
  '/blocked',
  '/credits',
  '/chat',
  '/u/',
]

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/**
 * Production-build SEO output:
 *  - robots.txt (always) and sitemap.xml (only with VITE_SITE_URL, since it needs the real domain);
 *  - a pre-rendered HTML file for every public page, so search engines and link previews see the
 *    real text without running any JavaScript. React replaces it as soon as the app loads;
 *  - Google / Bing site-verification tags, when VITE_GOOGLE_SITE_VERIFICATION or
 *    VITE_BING_SITE_VERIFICATION are set.
 */
function seoOutput(env: Record<string, string>): Plugin {
  const base = env.VITE_SITE_URL?.replace(/\/$/, '')
  // Anything but "open" keeps the site out of search: nothing to crawl, nothing to list.
  const open = env.VITE_SITE_MODE === 'open'
  const verification = [
    env.VITE_GOOGLE_SITE_VERIFICATION &&
      `<meta name="google-site-verification" content="${escapeAttr(env.VITE_GOOGLE_SITE_VERIFICATION)}" />`,
    env.VITE_BING_SITE_VERIFICATION &&
      `<meta name="msvalidate.01" content="${escapeAttr(env.VITE_BING_SITE_VERIFICATION)}" />`,
  ].filter(Boolean)

  return {
    name: 'privlee-seo-output',
    apply: 'build',
    generateBundle: {
      order: 'post',
      async handler(_options, bundle) {
        // --- robots.txt and sitemap.xml
        const rules = [...PUBLIC_PATHS.map((p) => `Allow: ${p}$`), ...PRIVATE_PREFIXES.map((p) => `Disallow: ${p}`)]
        // AI search engines and assistants that fetch a page when someone asks them to. They are named so their
        // access is a stated choice, with exactly the same rules as everyone else: the public pages, never the app.
        const assistants = [
          'OAI-SearchBot',
          'ChatGPT-User',
          'Claude-SearchBot',
          'Claude-User',
          'PerplexityBot',
          'Perplexity-User',
          'Applebot',
          'Bingbot',
          'Googlebot',
        ]
        const robots = open
          ? [
              ...[...assistants, '*'].flatMap((agent) => [`User-agent: ${agent}`, ...rules, '']),
              ...(base ? [`Sitemap: ${base}/sitemap.xml`, ''] : []),
            ].join('\n')
          : 'User-agent: *\nDisallow: /\n'
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })

        // A short, plain-text map of the site for AI assistants and agents (https://llmstxt.org).
        if (base && open) {
          const link = (title: string, path: string, note: string) => `- [${title}](${base}${path}): ${note}`
          const llms = [
            '# Privlee',
            '',
            '> Privlee is a private, pseudonym-only space for adults (18+) seeking discreet connection. Members use a chosen pseudonym, photos are blurred until the owner allows someone to see them, and a panic button turns the app into an ordinary notes screen.',
            '',
            'Members need an account to browse profiles; the pages below are the public ones. Profiles, messages and the member app are private and are not available to crawlers or agents.',
            '',
            '## Start here',
            link('Home', '/', 'what Privlee is and how it protects privacy'),
            link('Create a profile', '/signup', 'free sign-up with email or Google; adults 18+ only'),
            link('Sign in', '/login', 'for existing members'),
            '',
            '## Learn more',
            link('FAQ', '/faq', faq.description),
            ...guides.map((g: { title: string; slug: string; description: string }) => link(g.title, `/guides/${g.slug}`, g.description)),
            '',
            '## Policies',
            link('Terms of Service', '/terms', 'the rules for using Privlee'),
            link('Privacy Policy', '/privacy', 'what is collected, how it is used and protected'),
            '',
          ].join('\n')
          this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llms })
        }

        if (base && open) {
          const day = new Date().toISOString().slice(0, 10)
          const urls = PUBLIC_PATHS.map(
            (p) => `  <url><loc>${base}${p === '/' ? '/' : p}</loc><lastmod>${day}</lastmod></url>`,
          ).join('\n')
          this.emitFile({
            type: 'asset',
            fileName: 'sitemap.xml',
            source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
          })
        }

        // --- pre-rendered public pages
        // The two faces the first screen is drawn in (the headline, and the body text), fetched at once instead of
        // only after the stylesheet has been read. The hashed file names come from the bundle.
        const preloads = Object.keys(bundle)
          .filter((f) => /assets\/(cormorant-garamond-latin-500|inter-latin-300|inter-latin-400)-normal-.*\.woff2$/.test(f))
          .map((f) => `<link rel="preload" as="font" type="font/woff2" href="/${f}" crossorigin />`)

        const index = bundle['index.html']
        if (!index || index.type !== 'asset') return
        const template = String(index.source)

        // The page text comes from the app's own source, so it is loaded the way the dev server
        // would load it (TSX, path aliases) rather than from the bundle.
        const server = await createServer({
          appType: 'custom',
          logLevel: 'error',
          server: { middlewareMode: true },
        })
        try {
          const { renderShell } = (await server.ssrLoadModule('/src/seo/shells.tsx')) as {
            renderShell: (path: string) => { title: string; description: string; body: string; jsonLd?: object } | null
          }
          for (const path of PUBLIC_PATHS) {
            const shell = renderShell(path)
            if (!shell) continue

            let html = template
              .replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(shell.title)}</title>`)
              .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeAttr(shell.description)}$2`)
              .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeAttr(shell.title)}$2`)
              .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeAttr(shell.description)}$2`)
              .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escapeAttr(shell.title)}$2`)
              .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escapeAttr(shell.description)}$2`)
              .replace('<div id="root"></div>', `<div id="root">${shell.body}</div>`)

            const extra = [
              ...preloads,
              open ? '<meta name="robots" content="index, follow" />' : '<meta name="robots" content="noindex, nofollow" />',
              open && base ? `<link rel="canonical" href="${base}${path}" />` : '',
              open && base ? `<meta property="og:url" content="${base}${path}" />` : '',
              // The picture shown when a link is shared. Needs the real address, so only with VITE_SITE_URL.
              base ? `<meta property="og:image" content="${base}/brand/og-image.png" />` : '',
              base ? '<meta property="og:image:width" content="1200" />' : '',
              base ? '<meta property="og:image:height" content="630" />' : '',
              base ? `<meta name="twitter:image" content="${base}/brand/og-image.png" />` : '',
              base ? '<meta property="og:image:alt" content="Privlee - connection, without exposure" />' : '',
              base ? '<meta name="twitter:image:alt" content="Privlee - connection, without exposure" />' : '',
              ...verification,
              shell.jsonLd ? `<script type="application/ld+json">${JSON.stringify(shell.jsonLd)}</script>` : '',
            ].filter(Boolean)
            // The site-wide "WebSite" description belongs on the home page only; there it also names the address.
            if (path === '/' && base) html = html.replace('"name": "Privlee",', `"name": "Privlee",\n        "url": "${base}/",`)
            // Who runs the site, with its logo - what a search engine may show beside the result.
            const organization =
              path === '/' && base
                ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Privlee', url: `${base}/`, logo: `${base}/icon-512.png` })}</script>`
                : ''
            if (path !== '/') html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
            html = html.replace('</head>', `    ${[...extra, organization].filter(Boolean).join('\n    ')}\n  </head>`)
            if (base) html = html.replace('<meta name="twitter:card" content="summary" />', '<meta name="twitter:card" content="summary_large_image" />')

            if (path === '/') index.source = html
            else this.emitFile({ type: 'asset', fileName: `${path.slice(1)}/index.html`, source: html })
          }
        } finally {
          await server.close()
        }
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), tailwindcss(), seoOutput(env)],
    server: {
      port: 5173,
      proxy: {
        '/api': process.env.API_URL ?? 'http://localhost:8080',
        '/uploads': process.env.API_URL ?? 'http://localhost:8080',
      },
    },
  }
})
