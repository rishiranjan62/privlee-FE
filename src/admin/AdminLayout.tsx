import { useEffect, useState, type ReactNode } from "react";
import NotificationBell from "../components/NotificationBell";
import Logo from "../components/Logo";
import AdminProfileMenu from "./AdminProfileMenu";
import { usePageMeta } from "../lib/seo";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useStreamEvent } from "../context/StreamContext";
import { NavLink } from "react-router-dom";
import type { AdminMe } from "../lib/types";

/** Three groups, in the order an admin works: look after people, then the business, then the app itself. */
const groups = [
  [
    { to: "/admin", label: "Overview", end: true },
    { to: "/admin/reports", label: "Reports", end: false },
    { to: "/admin/users", label: "Users", end: false },
    { to: "/admin/photos", label: "Photos", end: false },
  ],
  [
    { to: "/admin/analytics", label: "Analytics", end: false },
    { to: "/admin/payments", label: "Payments", end: false },
    { to: "/admin/ads", label: "Ads", end: false },
  ],
  [
    { to: "/admin/app", label: "App", end: false },
    { to: "/admin/audit", label: "Audit log", end: false },
  ],
];

/**
 * Deliberately unlike the user app: dark bar, dense tables, no decoration. An admin should never
 * be unsure which of the two they are looking at - mistaking one for the other is how mistakes
 * get made on live accounts.
 */
export default function AdminLayout({ me, children }: { me: AdminMe; children: ReactNode }) {
  usePageMeta({ title: "Privlee Admin", index: false });
  const location = useLocation();
  const [counts, setCounts] = useState({ open: 0, priority: 0 });

  const refreshCounts = () => api.getReportCounts().then(setCounts).catch(() => {});

  // On every page change, and the moment the server says a new report has come in.
  useEffect(() => {
    refreshCounts();
  }, [location.pathname]);
  useStreamEvent((event) => {
    if (event.type === "ADMIN_NEW_REPORT") refreshCounts();
  });

  // The photo prompt is "go and look"; once the page is open it has done its job.
  useEffect(() => {
    if (location.pathname.startsWith("/admin/photos")) {
      api.markAdminNotificationsRead("ADMIN_PHOTOS_UPLOADED").catch(() => {});
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <header className="bg-ink text-canvas">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-5">
          {/* On a phone this group dissolves, so the logo and the controls share the first row and the links get a second one. */}
          <div className="contents items-center gap-8 lg:flex">
            <span className="flex items-center gap-2 font-display text-xl font-semibold tracking-wide">
              <Logo variant="dark" className="h-9" /> <span className="ml-1 rounded bg-gold px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-widest text-white">Admin</span>
            </span>
            <nav className="order-last flex w-full gap-1 overflow-x-auto pb-1 lg:order-none lg:w-auto lg:overflow-visible lg:pb-0">
              {groups.map((group, g) => (
                <div key={g} className="flex shrink-0 items-center gap-0.5 border-l border-white/15 pl-1.5 first:border-l-0 first:pl-0 [&:not(:first-child)]:ml-1.5">
                {group.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `shrink-0 whitespace-nowrap rounded px-2.5 py-1.5 text-sm transition ${
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
                </div>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <NotificationBell staff />
            <AdminProfileMenu me={me} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8">{children}</main>
    </div>
  );
}
