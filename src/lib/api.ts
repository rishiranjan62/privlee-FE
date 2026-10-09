import axios from "axios";
import type {
  AuthResponse,
  GoogleLoginResult,
  GoogleSignupPayload,
  LikeSummary,
  AdminMe,
  AdminPhoto,
  AdminUserDetail,
  AdminUserSummary,
  EvidenceResponse,
  ModerationActionCode,
  ReportDetail,
  ReportSummary,
  Admirer,
  AuditEntry,
  BlockedUser,
  AppNotification,
  Conversation,
  GiftOption,
  MatchSummary,
  GiftKey,
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
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const client = axios.create({ baseURL: "/api" });

client.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // An expired or rejected JWT comes back as 401 or 403. Without this the app sits on a
    // loading screen forever instead of sending the person back to sign in.
    const status = error.response?.status;
    const authFailed = status === 401 || status === 403;
    if (authFailed && tokenStore.get()) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login?expired=1");
      }
    }
    return Promise.reject(error);
  },
);

function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message ?? fallback;
  }
  return fallback;
}

export const api = {
  async signup(payload: SignupPayload): Promise<SignupResult> {
    try {
      const { data } = await client.post<SignupResult>("/auth/signup", payload);
      return data;
    } catch (err) {
      throw new Error(errorMessage(err, "Could not create your account"));
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

  async requestPhotoAccess(ownerId: string): Promise<void> {
    try {
      await client.post(`/photo-access/${ownerId}/request`);
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

  async setPhotoVisibility(photoId: string, blurred: boolean): Promise<Profile> {
    const { data } = await client.put<Profile>(`/profiles/me/photos/${photoId}/visibility`, {
      blurred,
    });
    return data;
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

  async uploadPhoto(file: File): Promise<Profile> {
    const form = new FormData();
    form.append("file", file);
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

  async heartbeat(): Promise<void> {
    await client.post("/presence/heartbeat");
  },

  async like(userId: string): Promise<{ matched: boolean; matchId: string | null }> {
    const { data } = await client.post(`/likes/${userId}`);
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

  async getAuditLog(page = 0, size = 50): Promise<AuditEntry[]> {
    const { data } = await client.get<AuditEntry[]>("/admin/audit", { params: { page, size } });
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

  async searchUsers(q: string): Promise<AdminUserSummary[]> {
    const { data } = await client.get<AdminUserSummary[]>("/admin/users", { params: { q } });
    return data;
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
    payload: { content?: string; type?: MessageType; gift?: GiftKey },
  ): Promise<Message> {
    const { data } = await client.post<Message>(`/matches/${matchId}/messages`, payload);
    return data;
  },

  async getConversations(): Promise<Conversation[]> {
    const { data } = await client.get<Conversation[]>("/conversations");
    return data;
  },

  async getUnreadCount(): Promise<number> {
    const { data } = await client.get<{ unread: number }>("/conversations/unread");
    return data.unread;
  },

  async startReading(matchId: string): Promise<void> {
    await client.post(`/conversations/${matchId}/reading`);
  },

  async stopReading(): Promise<void> {
    await client.delete("/conversations/reading");
  },

  async markConversationRead(matchId: string): Promise<void> {
    await client.post(`/matches/${matchId}/messages/read`);
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
