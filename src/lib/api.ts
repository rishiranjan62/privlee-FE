import axios from "axios";
import type {
  AuthResponse,
  MatchSummary,
  Message,
  Profile,
  ReportReason,
  SignupPayload,
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
    if (error.response?.status === 401) {
      tokenStore.clear();
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
  async signup(payload: SignupPayload): Promise<AuthResponse> {
    try {
      const { data } = await client.post<AuthResponse>("/auth/signup", payload);
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
      throw new Error(errorMessage(err, "Invalid email or password"));
    }
  },

  async getMyProfile(): Promise<Profile> {
    const { data } = await client.get<Profile>("/profiles/me");
    return data;
  },

  async updateMyProfile(payload: {
    bio: string;
    lookingFor: string;
    relationshipStatus: string;
    city: string;
    discreetMode: boolean;
  }): Promise<Profile> {
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

  async getFeed(): Promise<Profile[]> {
    const { data } = await client.get<Profile[]>("/discovery/feed");
    return data;
  },

  async like(userId: string): Promise<{ matched: boolean; matchId: string | null }> {
    const { data } = await client.post(`/likes/${userId}`);
    return data;
  },

  async getMatches(): Promise<MatchSummary[]> {
    const { data } = await client.get<MatchSummary[]>("/matches");
    return data;
  },

  async getMessages(matchId: string): Promise<Message[]> {
    const { data } = await client.get<Message[]>(`/matches/${matchId}/messages`);
    return data;
  },

  async sendMessage(matchId: string, content: string): Promise<Message> {
    const { data } = await client.post<Message>(`/matches/${matchId}/messages`, { content });
    return data;
  },

  async report(reportedUserId: string, reason: ReportReason, details: string): Promise<void> {
    await client.post("/safety/reports", { reportedUserId, reason, details });
  },

  async panic(): Promise<void> {
    await client.post("/safety/panic");
  },
};
