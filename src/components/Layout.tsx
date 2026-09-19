import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PanicButton from "./PanicButton";

const navItems = [
  { to: "/discover", label: "Discover" },
  { to: "/matches", label: "Matches" },
  { to: "/profile", label: "Profile" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { pseudonym, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="font-semibold tracking-tight text-accent-soft">Confide</span>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 text-sm transition ${
                    isActive
                      ? "bg-surface-raised text-text"
                      : "text-text-muted hover:text-text"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <span>{pseudonym}</span>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="rounded-full border border-border px-3 py-1.5 transition hover:border-accent hover:text-accent-soft"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      <PanicButton />
    </div>
  );
}
