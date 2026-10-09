import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Navigate, NavLink, useLocation } from "react-router-dom";
import { isAdminAccount } from "../lib/adminStatus";
import { api } from "../lib/api";
import { useStreamEvent } from "../context/StreamContext";
import { usePageMeta } from "../lib/seo";
import PanicButton from "./PanicButton";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";

const navItems = [
  { to: "/discover", label: "Discover" },
  { to: "/likes", label: "Likes" },
  { to: "/matches", label: "Matches" },
  { to: "/messages", label: "Messages" },
];

/**
 * `fill` makes the page exactly one screen tall, so a page that manages its own scrolling (the
 * conversation view) has a single scrollbar - its own - instead of a second one for the whole page.
 */
export default function Layout({ children, fill = false }: { children: ReactNode; fill?: boolean }) {
  // Staff never see the member app. Decided before anything renders, so no member page mounts and
  // fires requests the server would only refuse.
  const [staff, setStaff] = useState<boolean | null>(null);
  useEffect(() => {
    isAdminAccount().then(setStaff);
  }, []);
  if (staff === null) return <div className="min-h-screen bg-canvas" />;
  if (staff) return <Navigate to="/admin" replace />;
  return <MemberShell fill={fill}>{children}</MemberShell>;
}

function MemberShell({ children, fill }: { children: ReactNode; fill: boolean }) {
  // Everything behind the sign-in is private: keep it out of search results.
  usePageMeta({ title: "Privlee", index: false });
  const location = useLocation();
  const [pendingLikes, setPendingLikes] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const refreshBadges = useCallback(() => {
    api
      .getLikeSummary()
      .then((s) => setPendingLikes(s.received))
      .catch(() => setPendingLikes(0));
    api
      .getUnreadCount()
      .then(setUnreadMessages)
      .catch(() => setUnreadMessages(0));
  }, []);

  // Being on the Likes page is what marks those likes seen. Done here, and before re-counting,
  // so the badge cannot be refreshed by one component while another is still clearing it.
  useEffect(() => {
    if (!location.pathname.startsWith("/likes")) {
      refreshBadges();
      return;
    }
    api
      .markLikesSeen()
      .catch(() => {})
      .finally(refreshBadges);
  }, [location.pathname, refreshBadges]);

  // Kept current by the server pushing events - there is no timer.
  useStreamEvent(refreshBadges);

  return (
    <div
      className={`relative isolate bg-canvas ${
        fill ? "flex h-dvh flex-col overflow-hidden" : "min-h-screen overflow-x-clip"
      }`}
    >
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="drift absolute -left-40 -top-48 h-[32rem] w-[32rem] rounded-full bg-[#f1cfa0]/45 blur-3xl" />
        <div
          className="drift absolute -right-40 top-1/3 h-[28rem] w-[28rem] rounded-full bg-[#f2c4b3]/35 blur-3xl"
          style={{ animationDelay: "-8s" }}
        />
        <div className="grain absolute inset-0" />
      </div>

      <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <NavLink to="/discover" className="font-display text-2xl font-semibold tracking-wide">
            Priv<span className="gold-text italic">lee</span>
          </NavLink>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `inline-flex items-center rounded-full px-4 py-1.5 text-sm transition ${
                    isActive
                      ? "bg-ink text-canvas"
                      : "text-muted hover:bg-white/70 hover:text-ink"
                  }`
                }
              >
                {item.label}
                {item.to === "/likes" && pendingLikes > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-semibold text-white">
                    {pendingLikes}
                  </span>
                )}
                {item.to === "/messages" && unreadMessages > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-semibold text-white">
                    {unreadMessages}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileMenu />
          </div>
        </div>
      </header>

      <main
        className={`mx-auto w-full max-w-6xl px-5 ${fill ? "flex min-h-0 flex-1 flex-col py-6" : "py-10"}`}
      >
        {children}
      </main>
      <PanicButton />
    </div>
  );
}
