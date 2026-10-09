import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ChangePasswordDialog from "../components/ChangePasswordDialog";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { NavLink } from "react-router-dom";
import type { AdminMe } from "../lib/types";

const links = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/reports", label: "Reports", end: false },
  { to: "/admin/users", label: "Users", end: false },
  { to: "/admin/photos", label: "Recent photos", end: false },
  { to: "/admin/audit", label: "Audit log", end: false },
];

/**
 * Deliberately unlike the user app: dark bar, dense tables, no decoration. An admin should never
 * be unsure which of the two they are looking at - mistaking one for the other is how mistakes
 * get made on live accounts.
 */
export default function AdminLayout({ me, children }: { me: AdminMe; children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);
  const [counts, setCounts] = useState({ open: 0, priority: 0 });

  // Refreshed per page, not pushed: the queue is worked through deliberately, not watched live.
  useEffect(() => {
    api.getReportCounts().then(setCounts).catch(() => {});
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <header className="bg-ink text-canvas">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3">
          <div className="flex items-center gap-8">
            <span className="font-display text-xl font-semibold tracking-wide">
              Privlee <span className="ml-1 rounded bg-gold px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-widest text-white">Admin</span>
            </span>
            <nav className="flex gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `rounded px-3 py-1.5 text-sm transition ${
                      isActive ? "bg-white/15 text-white" : "text-white/60 hover:text-white"
                    }`
                  }
                >
                  {l.label}
                  {l.to === "/admin/reports" && counts.open > 0 && (
                    <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${counts.priority > 0 ? "bg-danger text-white" : "bg-gold text-white"}`}>
                      {counts.open}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-white/60 sm:block">{me.email}</span>
            <button
              onClick={() => setChangingPassword(true)}
              className="rounded border border-white/25 px-3 py-1.5 transition hover:bg-white/10"
            >
              Password
            </button>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="rounded border border-white/25 px-3 py-1.5 transition hover:bg-white/10"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      {changingPassword && (
        <ChangePasswordDialog hasExistingPassword onClose={() => setChangingPassword(false)} />
      )}
    </div>
  );
}
