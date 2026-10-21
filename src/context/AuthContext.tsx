import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { endSession, tokenStore } from "../lib/api";
import { usageTracker } from "../lib/usage";

interface AuthState {
  isAuthenticated: boolean;
  pseudonym: string | null;
  userId: string | null;
  login: (token: string, pseudonym: string, userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(tokenStore.get());
  const [pseudonym, setPseudonym] = useState<string | null>(
    localStorage.getItem("dd_pseudonym"),
  );
  const [userId, setUserId] = useState<string | null>(localStorage.getItem("dd_user_id"));

  const value = useMemo<AuthState>(
    () => ({
      isAuthenticated: !!token,
      pseudonym,
      userId,
      login: (newToken: string, newPseudonym: string, newUserId: string) => {
        tokenStore.set(newToken);
        localStorage.setItem("dd_pseudonym", newPseudonym);
        localStorage.setItem("dd_user_id", newUserId);
        setToken(newToken);
        setPseudonym(newPseudonym);
        setUserId(newUserId);
      },
      logout: () => {
        // Send the last time-in-app report while the token is still there; afterwards the server can only refuse it.
        usageTracker.stop();
        endSession();
        tokenStore.clear();
        localStorage.removeItem("dd_pseudonym");
        localStorage.removeItem("dd_user_id");
        setToken(null);
        setPseudonym(null);
        setUserId(null);
      },
    }),
    [token, pseudonym, userId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
