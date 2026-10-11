/**
 * Whether a sign-in token has run out, read from its own expiry (no signature check: this only decides what to do
 * next, never whether to trust it). A token that cannot be read counts as run out.
 */
export function tokenExpired(token: string, skewSeconds = 0): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}
