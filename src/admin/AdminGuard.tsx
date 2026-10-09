import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { AdminMe } from "../lib/types";

/**
 * Renders its children only for admins, and a plain "not found" for everyone else.
 *
 * <p>This is a courtesy, not the security: the server refuses non-admins on every /api/admin call
 * regardless of what the browser shows. Hiding the page only avoids showing a broken screen.
 */
export default function AdminGuard({ children }: { children: (me: AdminMe) => ReactNode }) {
  const [state, setState] = useState<"loading" | "denied" | AdminMe>("loading");

  useEffect(() => {
    api
      .getAdminMe()
      .then(setState)
      .catch(() => setState("denied"));
  }, []);

  if (state === "loading") {
    return <p className="p-12 text-center text-muted">Loading...</p>;
  }
  if (state === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
        <p className="font-display text-6xl">404</p>
        <p className="mt-3 text-muted">There's nothing here.</p>
        <Link to="/discover" className="mt-8 text-sm font-medium text-gold hover:underline">
          Back to Privlee
        </Link>
      </div>
    );
  }
  return <>{children(state)}</>;
}
