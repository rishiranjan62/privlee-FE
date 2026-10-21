import { API_ORIGIN } from "./apiBase";
import axios, { type InternalAxiosRequestConfig } from "axios";
import { tokenExpired } from "./jwt";
import { adMemoryQuery, rememberShown } from "./adMemory";
import type {
  AndroidRelease,
  AdDay,
  AdSettings,
  AdForm,
  AdLocationOption,
  AdReach,
  AdminAd,
  AdPlacement,
  AdsOverview,
  AppReleaseInfo,
  AppReleasesOverview,
  ServedAd,
  AuthResponse,
  GoogleLoginResult,
  GoogleSignupPayload,
  LikeSummary,
  AdminMe,
  AdminPhoto,
  AdminUserDetail,
  AdminUserSummary,
  LedgerPage,
  MemberInvoice,
  PaymentFilters,
  PaymentOrderPage,
  PaymentsSummary,
  UserFacets,
  UserListQuery,
  EvidenceResponse,
  ModerationActionCode,
  ReportDetail,
  ReportSummary,
  Admirer,
  AuditEntry,
  Analytics,
  AuditFacets,
  Gender,
  Traffic,
  Granularity,
  AuditQuery,
  BlockedUser,
  AppNotification,
  NotificationType,
  Conversation,
  GiftOption,
  MatchSummary,
  GiftKey,
  LikeAllowance,
  MessagePricing,
  PackCatalogue,
  PaymentCheckout,
  PaymentStatus,
  WalletData,
  Message,
  Metrics,
  MessageType,
  Profile,
  PhotoAccessRequest,
  ProfileUpdate,
  ReportReason,
  SignupPayload,
  SignupResult,
} from "./types";

const TOKEN_KEY = "dd_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    // index.html marks the page "signed in" at load to hide the pre-written landing page, and that rule also
    // matches the login page (same .landing class). Signing out moves to /login without a reload, so the mark
    // has to come off here or the login page is there but hidden - a blank screen.
    document.documentElement.removeAttribute("data-signed-in");
  },
};

// withCredentials lets the API's small age-check cookie travel between privlee.com and api.privlee.com
// (same site, so it is a first-party cookie). The API only allows credentialed requests from the website.
const client = axios.create({ baseURL: `${API_ORIGIN}/api`, withCredentials: true });

client.interceptors.request.use((config) => {
  // Lets the server's log tell the website from the Android app.
  config.headers["X-Privlee-Client"] = "web";
  const token = tokenStore.get();
  // A request that already carries its own token (reportUsage, sent as someone signs out) keeps it.
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** "ok": a new access token is in place. "denied": the long-lived sign-in is gone, so the person must sign in. "unreachable": try again later. */
export type RefreshResult = "ok" | "denied" | "unreachable";

let refreshing: Promise<RefreshResult> | null = null;

/**
 * Trades the long-lived sign-in (an httpOnly cookie the page cannot read) for a new 30-minute token, so being away for
 * an hour does not mean signing in again. Only one runs at a time: several requests failing together share it.
 */
export function refreshSession(): Promise<RefreshResult> {
  if (!refreshing) {
    // A plain axios call, not `client`: its own failure handling must not apply to the request that asks for a refresh.
    refreshing = axios
      .post<AuthResponse>(`${API_ORIGIN}/api/auth/refresh`, {}, { withCredentials: true, headers: { "X-Privlee-Client": "web" } })
      .then(({ data }): RefreshResult => {
        tokenStore.set(data.accessToken);
        return "ok";
      })
      .catch((err): RefreshResult => (axios.isAxiosError(err) && err.response?.status === 401 ? "denied" : "unreachable"))
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/** Ends this browser's long-lived sign-in on the server. Best effort: signing out must work with no connection. */
export function endSession(): void {
  axios
    .post(`${API_ORIGIN}/api/auth/logout`, {}, { withCredentials: true, headers: { "X-Privlee-Client": "web" } })
    .catch(() => {});
}

type Retriable = InternalAxiosRequestConfig & { _retried?: boolean };

client.interceptors.response.use(
  (response) => {
    // Sliding session: while someone keeps using the site the server hands back a fresh token, so only real
    // inactivity signs them out. Swapped in only if the token that made this request is still the current one -
    // a response arriving after sign-out must not bring the session back.
    const renewed = response.headers["x-refreshed-token"];
    const sent = response.config.headers?.Authorization;
    if (renewed && sent === `Bearer ${tokenStore.get()}`) {
      tokenStore.set(renewed);
    }
    return response;
  },
  async (error) => {
    // An expired or rejected JWT comes back as 401 or 403. Without this the app sits on a
    // loading screen forever instead of sending the person back to sign in.
    const status = error.response?.status;
    const authFailed = status === 401 || status === 403;
    const token = tokenStore.get();
    // The 30-minute token has run out but the person has not: renew it from the long-lived sign-in and repeat the
    // request, so nobody sees a login page for being away a while.
    const original = error.config as Retriable | undefined;
    if (authFailed && token && original && !original._retried && !String(original.url).startsWith("/auth/") && (status === 401 || tokenExpired(token))) {
      const result = await refreshSession();
      if (result === "ok") {
        original._retried = true;
        original.headers.Authorization = `Bearer ${tokenStore.get()}`;
        return client(original);
      }
      // No connection (or the server is down): that is not the same as being signed out.
      if (result === "unreachable") return Promise.reject(error);
    }
    if (authFailed && tokenStore.get()) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login?expired=1");
      }
    }
    return Promise.reject(error);
  },
);

/** Fired on window whenever the member's credits change, so the header can refresh. */
export const WALLET_CHANGED = "privlee:wallet-changed";
/** Something that was unread has been read (or the other way round): the badges should be counted again. */
export const UNREAD_CHANGED = "privlee:unread-changed";
/** Fired when a like is sent, so the daily allowance shown on screen is looked up again. */
export const LIKE_SENT = "privlee:like-sent";

/** The file name a download asks for, from its Content-Disposition header. */
function filenameOf(header: unknown, fallback: string): string {
  const m = typeof header === "string" ? /filename="?([^";]+)"?/.exec(header) : null;
  return m ? m[1] : fallback;
}

function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message ?? fallback;
  }
  return fallback;
}

/** Where the Android beta is downloaded from. Every download goes through the API, which is how it is counted. */
export const ANDROID_DOWNLOAD_URL = `${API_ORIGIN}/api/app/android/download`;

export const api = {
  /** Whether there is an Android beta to download, which version, how big, and its checksum. */
  async getAndroidRelease(): Promise<AndroidRelease> {
    const { data } = await client.get<AndroidRelease>("/app/android");
    return data;
  },

  // --- sponsored placements -------------------------------------------------------------------------------------

  /** The sponsored item for a screen, or none. Asking is what counts it as shown. */
  async getAds(placement: AdPlacement, limit = 1, conversations?: number, messages?: number): Promise<ServedAd[]> {
    // The browser's own memory of what it has shown goes along, so the server can avoid repeats; see lib/adMemory. For the Messages
    // list the server is told how many conversations there are and decides how many rows fit and where each goes.
    const { data } = await client.get<ServedAd[]>("/ads", {
      // Only a count: what the messages say, and who they are with, never leaves the page.
      params: {
        placement,
        limit,
        ...(conversations === undefined ? {} : { conversations }),
        ...(messages === undefined ? {} : { messages }),
        ...adMemoryQuery(),
      },
    });
    rememberShown(data.map((a) => a.id));
    return data;
  },

  /** Every state, and every listed city, an ad can be aimed at. */
  async getAdLocations(): Promise<AdLocationOption[]> {
    const { data } = await client.get<AdLocationOption[]>("/admin/ads/locations");
    return data;
  },

  /** How many current members an aim reaches. */
  async getAdReach(locations: string[]): Promise<AdReach> {
    const { data } = await client.get<AdReach>("/admin/ads/reach", { params: { locations: locations.join(",") } });
    return data;
  },

  async saveAdSettings(settings: AdSettings): Promise<AdSettings> {
    try {
      const { data } = await client.put<AdSettings>("/admin/ads/settings", settings);
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "Could not save the settings"));
    }
  },

  async getAdsOverview(): Promise<AdsOverview> {
    const { data } = await client.get<AdsOverview>("/admin/ads");
    return data;
  },

  async getAdDaily(id: string, days = 30): Promise<AdDay[]> {
    const { data } = await client.get<AdDay[]>(`/admin/ads/${id}/daily`, { params: { days } });
    return data;
  },

  async saveAd(id: string | null, form: AdForm, image: File | null, removeImage: boolean): Promise<AdminAd> {
    const body = new FormData();
    body.append("advertiser", form.advertiser);
    body.append("title", form.title);
    body.append("body", form.body);
    body.append("ctaLabel", form.ctaLabel);
    body.append("targetUrl", form.targetUrl);
    body.append("placements", form.placements.join(","));
    body.append("locations", form.locations.join(","));
    body.append("startsAt", form.startsAt);
    body.append("endsAt", form.endsAt);
    body.append("weight", String(form.weight));
    if (form.impressionCap.trim()) body.append("impressionCap", form.impressionCap.trim());
    if (form.maxPerDay.trim()) body.append("maxPerDay", form.maxPerDay.trim());
    if (form.minGapHours.trim()) body.append("minGapHours", form.minGapHours.trim());
    if (image) body.append("image", image);
    try {
      if (id) {
        body.append("removeImage", String(removeImage));
        const { data } = await client.put<AdminAd>(`/admin/ads/${id}`, body);
        return data;
      }
      const { data } = await client.post<AdminAd>("/admin/ads", body);
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "Could not save that ad"));
    }
  },

  async setAdActive(id: string, active: boolean): Promise<AdminAd> {
    try {
      const { data } = await client.post<AdminAd>(`/admin/ads/${id}/${active ? "resume" : "pause"}`);
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "Could not change that ad"));
    }
  },

  async deleteAd(id: string): Promise<void> {
    try {
      await client.delete(`/admin/ads/${id}`);
    } catch (err) {
      throw new Error(errorMessage(err, "Could not delete that ad"));
    }
  },

  async getAppReleases(): Promise<AppReleasesOverview> {
    const { data } = await client.get<AppReleasesOverview>("/admin/app-releases");
    return data;
  },

  /** Stores a build. Nobody can download it until it is published. */
  async uploadAppRelease(versionName: string, notes: string, file: File): Promise<AppReleaseInfo> {
    const form = new FormData();
    form.append("versionName", versionName);
    if (notes.trim()) form.append("notes", notes.trim());
    form.append("file", file);
    try {
      const { data } = await client.post<AppReleaseInfo>("/admin/app-releases", form);
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "Could not upload that build"));
    }
  },

  /** Links a build already in file storage; the server reads it, checks it and works out its size and checksum. */
  async linkAppRelease(versionName: string, notes: string, url: string): Promise<AppReleaseInfo> {
    try {
      const { data } = await client.post<AppReleaseInfo>("/admin/app-releases/hosted", {
        versionName,
        notes: notes.trim() || null,
        url,
      });
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "Could not link that build"));
    }
  },

  /** Takes a build that is not the current one off the list. Its download counts stay in the totals. */
  async removeAppRelease(id: string): Promise<void> {
    try {
      await client.delete(`/admin/app-releases/${id}`);
    } catch (err) {
      throw new Error(errorMessage(err, "Could not remove that build"));
    }
  },

  async publishAppRelease(id: string): Promise<AppReleaseInfo> {
    try {
      const { data } = await client.post<AppReleaseInfo>(`/admin/app-releases/${id}/publish`);
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "Could not publish that build"));
    }
  },

  /** Whether joining currently needs an invite code. */
  async getSignupConfig(): Promise<{ inviteRequired: boolean }> {
    try {
      const { data } = await client.get<{ inviteRequired: boolean }>("/auth/signup-config");
      return data;
    } catch {
      // If we cannot ask, show the field: a code nobody needs is harmless, a missing one blocks sign-up.
      return { inviteRequired: true };
    }
  },

  async signup(payload: SignupPayload): Promise<SignupResult> {
    try {
      const { data } = await client.post<SignupResult>("/auth/signup", payload);
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "Could not create your account"));
    }
  },

  /**
   * Asked as soon as the birth date is typed. A minor gets the server's 400, and the browser is
   * remembered as turned away, so it cannot just retry with another date.
   */
  async checkAge(dateOfBirth: string): Promise<void> {
    try {
      await client.post("/auth/age-check", { dateOfBirth });
    } catch (err) {
      throw new Error(errorMessage(err, "We couldn't check that date. Please try again."));
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data } = await client.post<AuthResponse>("/auth/login", { email, password });
      return data;
    } catch (err) {
      // The server flags "right password, unverified email" so the page can offer a resend
      // instead of just an error.
      const code = axios.isAxiosError(err) ? err.response?.data?.code : undefined;
      throw Object.assign(new Error(errorMessage(err, "Invalid email or password")), { code });
    }
  },

  async verifyEmail(token: string): Promise<AuthResponse> {
    try {
      const { data } = await client.post<AuthResponse>("/auth/verify-email", { token });
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "This link isn't valid."));
    }
  },

  /** Always succeeds from the caller's point of view - the server never says whether the email exists. */
  async resendVerification(email: string): Promise<void> {
    await client.post("/auth/resend-verification", { email });
  },

  /**
   * Asks for a reset link. The server answers the same whatever the address, and only emails one to an
   * address that has an account, so a success here says nothing about whether it did.
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      await client.post("/auth/forgot-password", { email });
    } catch (err) {
      throw new Error(errorMessage(err, "We couldn't do that just now. Please try again."));
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await client.post("/auth/reset-password", { token, newPassword });
    } catch (err) {
      throw new Error(errorMessage(err, "We couldn't change your password. Please try again."));
    }
  },

  async getAdminMetrics(): Promise<Metrics> {
    const { data } = await client.get<Metrics>("/admin/metrics");
    return data;
  },

  async googleLogin(idToken: string): Promise<GoogleLoginResult> {
    try {
      const { data } = await client.post<GoogleLoginResult>("/auth/google", { idToken });
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "Google sign-in failed. Please try again."));
    }
  },

  async googleSignup(payload: GoogleSignupPayload): Promise<AuthResponse> {
    try {
      const { data } = await client.post<AuthResponse>("/auth/google/signup", payload);
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "Could not create your account"));
    }
  },

  /** What asking to see someone's photos costs, in credits - matched or not. */
  async getPhotoRequestCost(): Promise<number> {
    const { data } = await client.get<{ cost: number }>("/photo-access/pricing");
    return data.cost;
  },

  async requestPhotoAccess(ownerId: string): Promise<void> {
    try {
      await client.post(`/photo-access/${ownerId}/request`);
      window.dispatchEvent(new Event(WALLET_CHANGED));
    } catch (err) {
      throw new Error(errorMessage(err, "Could not send that request"));
    }
  },

  async getIncomingPhotoRequests(): Promise<PhotoAccessRequest[]> {
    const { data } = await client.get<PhotoAccessRequest[]>("/photo-access/incoming");
    return data;
  },

  async getApprovedPhotoViewers(): Promise<PhotoAccessRequest[]> {
    const { data } = await client.get<PhotoAccessRequest[]>("/photo-access/approved");
    return data;
  },

  async respondToPhotoRequest(requestId: string, approve: boolean): Promise<void> {
    await client.post(`/photo-access/${requestId}/${approve ? "approve" : "decline"}`);
  },

  async revokePhotoAccess(viewerId: string): Promise<void> {
    await client.delete(`/photo-access/viewers/${viewerId}`);
  },

  async deletePhoto(photoId: string): Promise<Profile> {
    const { data } = await client.delete<Profile>(`/profiles/me/photos/${photoId}`);
    return data;
  },

  async reorderPhotos(photoIds: string[]): Promise<Profile> {
    const { data } = await client.put<Profile>("/profiles/me/photos/order", { photoIds });
    return data;
  },

  /** Either setting may be left out to keep it. `privatePhoto: true` moves the photo into the private album. */
  async setPhotoVisibility(
    photoId: string,
    change: { blurred?: boolean; privatePhoto?: boolean },
  ): Promise<Profile> {
    try {
      const { data } = await client.put<Profile>(`/profiles/me/photos/${photoId}/visibility`, change);
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "Could not change that photo"));
    }
  },

  // ---- the private album: nobody sees it unless the owner lets them in, or they pay to be let in

  async getPrivatePhotoPricing(): Promise<{ unlockCost: number; requestCost: number }> {
    const { data } = await client.get<{ unlockCost: number; requestCost: number }>("/private-photos/pricing");
    return data;
  },

  async requestPrivatePhotos(ownerId: string): Promise<void> {
    try {
      await client.post(`/private-photos/${ownerId}/request`);
      window.dispatchEvent(new Event(WALLET_CHANGED));
    } catch (err) {
      throw new Error(errorMessage(err, "Could not send that request"));
    }
  },

  /** Pays to see the album at once. */
  async unlockPrivatePhotos(ownerId: string): Promise<void> {
    try {
      await client.post(`/private-photos/${ownerId}/unlock`);
      window.dispatchEvent(new Event(WALLET_CHANGED));
    } catch (err) {
      throw new Error(errorMessage(err, "Could not unlock the private photos"));
    }
  },

  async getIncomingPrivateRequests(): Promise<PhotoAccessRequest[]> {
    const { data } = await client.get<PhotoAccessRequest[]>("/private-photos/incoming");
    return data;
  },

  async getApprovedPrivateViewers(): Promise<PhotoAccessRequest[]> {
    const { data } = await client.get<PhotoAccessRequest[]>("/private-photos/approved");
    return data;
  },

  async respondToPrivateRequest(requestId: string, approve: boolean): Promise<void> {
    await client.post(`/private-photos/${requestId}/${approve ? "approve" : "decline"}`);
  },

  async revokePrivateAccess(viewerId: string): Promise<void> {
    await client.delete(`/private-photos/viewers/${viewerId}`);
  },

  async changePassword(currentPassword: string | null, newPassword: string): Promise<void> {
    try {
      await client.post("/auth/password", { currentPassword, newPassword });
    } catch (err) {
      throw new Error(errorMessage(err, "Could not change your password"));
    }
  },

  async getMyProfile(): Promise<Profile> {
    const { data } = await client.get<Profile>("/profiles/me");
    return data;
  },

  async getProfileById(userId: string): Promise<Profile> {
    try {
      const { data } = await client.get<Profile>(`/profiles/${userId}`);
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "Could not load that profile"));
    }
  },

  async updateMyProfile(payload: ProfileUpdate): Promise<Profile> {
    const { data } = await client.put<Profile>("/profiles/me", payload);
    return data;
  },

  async uploadPhoto(file: File, privatePhoto = false): Promise<Profile> {
    const form = new FormData();
    form.append("file", file);
    if (privatePhoto) form.append("private", "true");
    const { data } = await client.post<Profile>("/profiles/me/photos", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  async getOnline(limit = 30): Promise<Profile[]> {
    const { data } = await client.get<Profile[]>("/discovery/online", { params: { limit } });
    return data;
  },

  async getNearby(limit = 30): Promise<Profile[]> {
    const { data } = await client.get<Profile[]>("/discovery/nearby", { params: { limit } });
    return data;
  },

  async getNewMembers(limit = 30): Promise<Profile[]> {
    const { data } = await client.get<Profile[]>("/discovery/new", { params: { limit } });
    return data;
  },

  /** Permanently deletes the signed-in member's account. `password` is null for Google accounts. */
  async deleteAccount(password: string | null, confirm: string): Promise<void> {
    try {
      await client.post("/account/delete", { password, confirm });
    } catch (err) {
      throw new Error(errorMessage(err, "Could not delete your account"));
    }
  },

  async reportUsage(seconds: number): Promise<void> {
    // The token is read now, not when axios gets round to sending: on sign-out the last report is sent just
    // before the token is cleared, and by the time the request is actually built it would be gone.
    const token = tokenStore.get();
    await client.post("/presence/usage", { seconds }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  },

  async getTraffic(granularity: Granularity, from?: string, to?: string): Promise<Traffic> {
    const { data } = await client.get<Traffic>("/admin/analytics/traffic", {
      params: { granularity, ...(from ? { from } : {}), ...(to ? { to } : {}) },
    });
    return data;
  },

  async heartbeat(): Promise<void> {
    await client.post("/presence/heartbeat");
  },

  async like(userId: string): Promise<{ matched: boolean; matchId: string | null }> {
    try {
      const { data } = await client.post(`/likes/${userId}`);
      // An extra like spends credits, and every like uses up some of today's allowance.
      window.dispatchEvent(new Event(LIKE_SENT));
      window.dispatchEvent(new Event(WALLET_CHANGED));
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "That like didn't go through. Please try again."));
    }
  },

  async getLikeAllowance(): Promise<LikeAllowance> {
    const { data } = await client.get<LikeAllowance>("/likes/allowance");
    return data;
  },

  async getReceivedLikes(): Promise<Admirer[]> {
    const { data } = await client.get<Admirer[]>("/likes/received");
    return data;
  },

  async getNotifications(): Promise<AppNotification[]> {
    const { data } = await client.get<AppNotification[]>("/notifications");
    return data;
  },

  async getUnreadNotificationCount(): Promise<number> {
    const { data } = await client.get<{ unread: number }>("/notifications/unread");
    return data.unread;
  },

  async markNotificationsRead(): Promise<void> {
    await client.post("/notifications/read");
  },

  /** "Clear all": removes every notification. */
  async clearNotifications(): Promise<void> {
    await client.delete("/notifications");
  },

  // --- staff notifications (the member endpoints above refuse admins) ---

  async getAdminNotifications(): Promise<AppNotification[]> {
    const { data } = await client.get<AppNotification[]>("/admin/notifications");
    return data;
  },

  async getAdminUnreadCount(): Promise<number> {
    const { data } = await client.get<{ unread: number }>("/admin/notifications/unread");
    return data.unread;
  },

  /** With a type, only that kind is cleared (e.g. photo prompts once the photos page is opened). */
  async markAdminNotificationsRead(type?: NotificationType): Promise<void> {
    await client.post("/admin/notifications/read", null, { params: type ? { type } : {} });
  },

  async getSentLikes(): Promise<Profile[]> {
    const { data } = await client.get<Profile[]>("/likes/sent");
    return data;
  },

  async markLikesSeen(): Promise<void> {
    await client.post("/likes/seen");
  },

  async getLikeSummary(): Promise<LikeSummary> {
    const { data } = await client.get<LikeSummary>("/likes/summary");
    return data;
  },

  async unlike(userId: string): Promise<void> {
    await client.delete(`/likes/${userId}`);
  },

  async getAdminMe(): Promise<AdminMe> {
    const { data } = await client.get<AdminMe>("/admin/me");
    return data;
  },

  async getAuditLog(query: AuditQuery = {}, page = 0, size = 50): Promise<AuditEntry[]> {
    // Empty filters are dropped so they are never sent as blank values.
    const filters = Object.fromEntries(Object.entries(query).filter(([, v]) => v));
    const { data } = await client.get<AuditEntry[]>("/admin/audit", { params: { ...filters, page, size } });
    return data;
  },

  async getAnalytics(granularity: Granularity, from?: string, to?: string, gender?: Gender, city?: string): Promise<Analytics> {
    const { data } = await client.get<Analytics>("/admin/analytics", {
      params: { granularity, ...(from ? { from } : {}), ...(to ? { to } : {}), ...(gender ? { gender } : {}), ...(city ? { city } : {}) },
    });
    return data;
  },

  // ---- admin: payments

  async getPaymentsSummary(granularity: Granularity, from?: string, to?: string): Promise<PaymentsSummary> {
    const { data } = await client.get<PaymentsSummary>("/admin/payments/summary", {
      params: { granularity, ...(from ? { from } : {}), ...(to ? { to } : {}) },
    });
    return data;
  },

  async getPaymentOrders(filters: PaymentFilters, page: number, size = 25): Promise<PaymentOrderPage> {
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const { data } = await client.get<PaymentOrderPage>("/admin/payments/orders", { params: { ...clean, page, size } });
    return data;
  },

  /** The orders that match, as CSV text. */
  async exportPaymentOrders(filters: PaymentFilters): Promise<string> {
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const { data } = await client.get<string>("/admin/payments/orders/export", { params: clean, responseType: "text" });
    return data;
  },

  async getCreditLedger(filters: { reason?: string; q?: string; from?: string; to?: string }, page: number, size = 25): Promise<LedgerPage> {
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const { data } = await client.get<LedgerPage>("/admin/payments/ledger", { params: { ...clean, page, size } });
    return data;
  },

  /** The invoice PDF for an order. Returns the file and the name to save it under. */
  async downloadAdminInvoice(orderId: string): Promise<{ blob: Blob; filename: string }> {
    const res = await client.get<Blob>(`/admin/payments/orders/${encodeURIComponent(orderId)}/invoice`, { responseType: "blob" });
    return { blob: res.data, filename: filenameOf(res.headers["content-disposition"], "invoice.pdf") };
  },

  async issueInvoice(orderId: string): Promise<string> {
    try {
      const { data } = await client.post<{ invoiceNumber: string }>(`/admin/payments/orders/${encodeURIComponent(orderId)}/invoice`);
      return data.invoiceNumber;
    } catch (err) {
      throw new Error(errorMessage(err, "Could not issue the invoice"));
    }
  },

  async emailInvoice(orderId: string): Promise<void> {
    try {
      await client.post(`/admin/payments/orders/${encodeURIComponent(orderId)}/invoice/email`);
    } catch (err) {
      throw new Error(errorMessage(err, "Could not send the invoice"));
    }
  },

  /** Issues an invoice for every paid order that has none. Returns how many. */
  async issueMissingInvoices(): Promise<number> {
    try {
      const { data } = await client.post<{ issued: number }>("/admin/payments/invoices/generate-missing");
      return data.issued;
    } catch (err) {
      throw new Error(errorMessage(err, "Could not issue the invoices"));
    }
  },

  /** One line per invoice issued in the range (India dates), as CSV, for GST returns. */
  async downloadGstRegister(from: string, to: string): Promise<string> {
    const { data } = await client.get<string>("/admin/payments/invoices/register", { params: { from, to }, responseType: "text" });
    return data;
  },

  // ---- a member's own invoices

  async getMyInvoices(): Promise<MemberInvoice[]> {
    const { data } = await client.get<MemberInvoice[]>("/payments/invoices");
    return data;
  },

  async downloadMyInvoice(orderId: string): Promise<{ blob: Blob; filename: string }> {
    const res = await client.get<Blob>(`/payments/invoices/${encodeURIComponent(orderId)}/pdf`, { responseType: "blob" });
    return { blob: res.data, filename: filenameOf(res.headers["content-disposition"], "invoice.pdf") };
  },

  /** Asks Cashfree again about an unsettled order. Safe to repeat. */
  async recheckPaymentOrder(orderId: string): Promise<{ orderId: string; status: string; message: string }> {
    try {
      const { data } = await client.post<{ orderId: string; status: string; message: string }>(
        `/admin/payments/orders/${encodeURIComponent(orderId)}/recheck`,
      );
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "Could not check that order"));
    }
  },

  async getAuditFacets(): Promise<AuditFacets> {
    const { data } = await client.get<AuditFacets>("/admin/audit/facets");
    return data;
  },

  async getReports(view: "open" | "resolved"): Promise<ReportSummary[]> {
    const { data } = await client.get<ReportSummary[]>("/admin/reports", { params: { view } });
    return data;
  },

  async getReportCounts(): Promise<{ open: number; priority: number }> {
    const { data } = await client.get<{ open: number; priority: number }>("/admin/reports/counts");
    return data;
  },

  async getReport(id: string): Promise<ReportDetail> {
    const { data } = await client.get<ReportDetail>(`/admin/reports/${id}`);
    return data;
  },

  async getReportConversation(id: string): Promise<EvidenceResponse> {
    const { data } = await client.get<EvidenceResponse>(`/admin/reports/${id}/conversation`);
    return data;
  },

  async resolveReport(
    id: string,
    body: { action: ModerationActionCode; reason: string; message?: string; days?: number },
  ): Promise<void> {
    try {
      await client.post(`/admin/reports/${id}/resolve`, body);
    } catch (err) {
      throw new Error(errorMessage(err, "Could not resolve this report"));
    }
  },

  async listUsers(query: UserListQuery): Promise<AdminUserSummary[]> {
    const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== ""));
    const { data } = await client.get<AdminUserSummary[]>("/admin/users", { params });
    return data;
  },

  async getUserFacets(): Promise<UserFacets> {
    const { data } = await client.get<UserFacets>("/admin/users/facets");
    return data;
  },

  /** Gives a member credits; returns their new balance. */
  async grantCredits(userId: string, amount: number, reason: string): Promise<number> {
    try {
      const { data } = await client.post<{ balance: number }>(`/admin/users/${userId}/credits`, { amount, reason });
      return data.balance;
    } catch (err) {
      throw new Error(errorMessage(err, "Could not give credits"));
    }
  },

  /** Erases a suspected minor's data and bans the account. Irreversible. */
  async removeMinor(userId: string, reason: string): Promise<void> {
    try {
      await client.post(`/admin/users/${userId}/remove-minor`, { reason });
    } catch (err) {
      throw new Error(errorMessage(err, "Could not remove this account"));
    }
  },

  async getAdminUser(id: string): Promise<AdminUserDetail> {
    const { data } = await client.get<AdminUserDetail>(`/admin/users/${id}`);
    return data;
  },

  async getAdminUserPhotos(id: string): Promise<AdminPhoto[]> {
    const { data } = await client.get<AdminPhoto[]>(`/admin/users/${id}/photos`);
    return data;
  },

  async getRecentUploads(): Promise<AdminPhoto[]> {
    const { data } = await client.get<AdminPhoto[]>("/admin/photos/recent");
    return data;
  },

  async removeUserPhoto(userId: string, photoId: string, reason: string, message: string): Promise<void> {
    try {
      await client.post(`/admin/users/${userId}/photos/${photoId}/remove`, { reason, message });
    } catch (err) {
      throw new Error(errorMessage(err, "Could not remove that photo"));
    }
  },

  async sanctionUser(
    id: string,
    body: { action: ModerationActionCode; reason: string; message?: string; days?: number },
  ): Promise<void> {
    try {
      await client.post(`/admin/users/${id}/sanction`, body);
    } catch (err) {
      throw new Error(errorMessage(err, "Could not apply that action"));
    }
  },

  async reinstateUser(userId: string, reason: string): Promise<void> {
    try {
      await client.post(`/admin/users/${userId}/reinstate`, { reason });
    } catch (err) {
      throw new Error(errorMessage(err, "Could not reinstate this account"));
    }
  },

  async blockUser(userId: string): Promise<void> {
    await client.post(`/blocks/${userId}`);
  },

  async unblockUser(userId: string): Promise<void> {
    await client.delete(`/blocks/${userId}`);
  },

  async getBlockedUsers(): Promise<BlockedUser[]> {
    const { data } = await client.get<BlockedUser[]>("/blocks");
    return data;
  },

  async unmatch(matchId: string): Promise<void> {
    await client.delete(`/matches/${matchId}`);
  },

  async getMatches(): Promise<MatchSummary[]> {
    const { data } = await client.get<MatchSummary[]>("/matches");
    return data;
  },

  async getMessages(matchId: string): Promise<Message[]> {
    const { data } = await client.get<Message[]>(`/matches/${matchId}/messages`);
    return data;
  },

  async sendMessage(
    matchId: string,
    payload: { content?: string; type?: MessageType; gift?: GiftKey; replyToId?: string },
  ): Promise<Message> {
    try {
      const { data } = await client.post<Message>(`/matches/${matchId}/messages`, payload);
      // Gifts, and texts in a conversation someone paid to start, spend credits.
      window.dispatchEvent(new Event(WALLET_CHANGED));
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "That didn't send. Please try again."));
    }
  },

  /** Leaves a reaction on a message, or takes it back when it is the same one again. */
  async reactToMessage(matchId: string, messageId: string, emoji: string | null): Promise<Message> {
    try {
      const url = `/matches/${matchId}/messages/${messageId}/reaction`;
      const { data } = emoji
        ? await client.put<Message>(url, { emoji })
        : await client.delete<Message>(url);
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "That reaction didn't go through."));
    }
  },

  /** A picture or GIF, already shrunk by the page. Only between people who have matched. */
  async sendImage(matchId: string, file: File, replyToId?: string): Promise<Message> {
    const form = new FormData();
    form.append("file", file);
    if (replyToId) form.append("replyTo", replyToId);
    try {
      const { data } = await client.post<Message>(`/matches/${matchId}/messages/image`, form);
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "That picture didn't send. Please try again."));
    }
  },

  /**
   * Deletes a message: "me" removes it from your view only (any message), "everyone" wipes it for both of you
   * (your own messages only).
   */
  async deleteMessage(matchId: string, messageId: string, scope: "me" | "everyone"): Promise<void> {
    try {
      await client.delete(`/matches/${matchId}/messages/${messageId}`, { params: { scope } });
    } catch (err) {
      throw new Error(errorMessage(err, "That message couldn't be deleted. Please try again."));
    }
  },

  /** Changes the words of a text message you sent. Returns it as it now reads. */
  async editMessage(matchId: string, messageId: string, content: string): Promise<Message> {
    try {
      const { data } = await client.patch<Message>(`/matches/${matchId}/messages/${messageId}`, { content });
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "That message couldn't be edited. Please try again."));
    }
  },

  /** A short video, already shrunk by the page. Only between people who have matched. */
  async sendVideo(matchId: string, file: File, replyToId?: string): Promise<Message> {
    const form = new FormData();
    form.append("file", file);
    if (replyToId) form.append("replyTo", replyToId);
    try {
      const { data } = await client.post<Message>(`/matches/${matchId}/messages/video`, form);
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "That video didn't send. Please try again."));
    }
  },

  /** What opening a conversation with someone you have not matched with costs. */
  async getStartPricing(): Promise<MessagePricing> {
    const { data } = await client.get<MessagePricing>("/conversations/start-pricing");
    return data;
  },

  /** What the next text costs in this conversation: 0 in a real match, or once they have written back. */
  async getMessagePricing(matchId: string): Promise<MessagePricing> {
    const { data } = await client.get<MessagePricing>(`/matches/${matchId}/messages/pricing`);
    return data;
  },

  /** Writes to someone you have not matched with. Costs credits; returns the conversation that now exists. */
  async messageMember(userId: string, content: string): Promise<{ matchId: string; message: Message }> {
    try {
      const { data } = await client.post<{ matchId: string; message: Message }>(`/conversations/start/${userId}`, { content });
      window.dispatchEvent(new Event(WALLET_CHANGED));
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "That message didn't send. Please try again."));
    }
  },

  async getConversations(): Promise<Conversation[]> {
    const { data } = await client.get<Conversation[]>("/conversations");
    return data;
  },

  async getWallet(): Promise<WalletData> {
    const { data } = await client.get<WalletData>("/wallet");
    return data;
  },

  async getPacks(): Promise<PackCatalogue> {
    const { data } = await client.get<PackCatalogue>("/payments/packs");
    return data;
  },

  /** Starts a purchase. The server prices it by pack id; only the id is sent. */
  async startPurchase(packId: string): Promise<PaymentCheckout> {
    try {
      const { data } = await client.post<PaymentCheckout>("/payments/orders", { packId });
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "We couldn't start that payment. Please try again."));
    }
  },

  /** Asks the server to check an order with the payment provider and add the credits if it was paid. */
  async confirmPurchase(orderId: string): Promise<PaymentStatus> {
    const { data } = await client.post<{ status: PaymentStatus }>(`/payments/orders/${encodeURIComponent(orderId)}/confirm`);
    if (data.status === "PAID") window.dispatchEvent(new Event(WALLET_CHANGED));
    return data.status;
  },

  async getUnreadCount(): Promise<number> {
    const { data } = await client.get<{ unread: number }>("/conversations/unread");
    return data.unread;
  },

  async startReading(matchId: string): Promise<void> {
    await client.post(`/conversations/${matchId}/reading`);
  },

  /** With the thread's id, only that thread is closed - a late "closed" can never undo a newer "opened". */
  async stopReading(matchId?: string): Promise<void> {
    await client.delete("/conversations/reading", { params: matchId ? { matchId } : {} });
  },

  async markConversationRead(matchId: string): Promise<void> {
    await client.post(`/matches/${matchId}/messages/read`);
    // Counted again only now that the server knows: the badge that was drawn when the message arrived is out of date.
    window.dispatchEvent(new Event(UNREAD_CHANGED));
  },

  async getGiftCatalogue(matchId: string): Promise<GiftOption[]> {
    const { data } = await client.get<GiftOption[]>(`/matches/${matchId}/messages/gifts`);
    return data;
  },

  async report(reportedUserId: string, reason: ReportReason, details: string): Promise<void> {
    try {
      await client.post("/safety/reports", { reportedUserId, reason, details });
    } catch (err) {
      throw new Error(errorMessage(err, "Could not send your report"));
    }
  },

  async panic(): Promise<void> {
    await client.post("/safety/panic");
  },
};
