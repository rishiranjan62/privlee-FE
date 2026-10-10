/**
 * Where the API lives, as a browser reaches it. Empty in development (Vite proxies /api, so requests
 * stay on the website's own address). In production the website and the API are on different
 * subdomains - privlee.com and api.privlee.com - so this is the API's full address, set with
 * VITE_API_URL at build time (no trailing slash).
 */
export const API_ORIGIN = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "");
