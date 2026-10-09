import { api, tokenStore } from "./api";

let cachedFor: string | null = null;
let cached: Promise<boolean> | null = null;

/**
 * Whether the signed-in account is staff. Asked once per session rather than on every page; the
 * answer is keyed on the token so signing in as someone else cannot reuse the previous answer.
 *
 * This only decides which screens to show. The server refuses member requests from admins (and
 * admin requests from members) on its own, whatever the browser believes.
 */
export function isAdminAccount(): Promise<boolean> {
  const token = tokenStore.get();
  if (!token) return Promise.resolve(false);
  if (cached && cachedFor === token) return cached;
  cachedFor = token;
  cached = api.getAdminMe().then(() => true, () => false);
  return cached;
}
