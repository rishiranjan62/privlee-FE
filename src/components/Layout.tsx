import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Navigate, NavLink, useLocation } from "react-router-dom";
import { isAdminAccount } from "../lib/adminStatus";
import { api } from "../lib/api";
import { useStreamEvent } from "../context/StreamContext";
import { usePageMeta } from "../lib/seo";
import Logo from "./Logo";
import PanicButton from "./PanicButton";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";
import WalletChip from "./WalletChip";

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
        fill ? "flex h-dvh flex-col overflow-clip" : "min-h-screen overflow-x-clip"
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
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-5 sm:py-4">
          {/* The logo and the member's own controls always share one row: nothing here may be pushed off-screen. */}
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <NavLink to="/discover" aria-label="Privlee, home" className="flex shrink-0 items-center">
              <Logo className="h-7 min-[320px]:h-8 sm:h-10" />
            </NavLink>

            {/* On a wide screen the sections sit between the logo and the controls. */}
            <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
              <SectionLinks pendingLikes={pendingLikes} unreadMessages={unreadMessages} />
            </nav>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <WalletChip />
              <NotificationBell />
              <ProfileMenu />
            </div>
          </div>

          {/* On a phone they get a row of their own - four equal tabs - so none of them can be clipped. */}
          <nav className="mt-3 grid grid-cols-4 gap-1 md:hidden" aria-label="Sections">
            <SectionLinks pendingLikes={pendingLikes} unreadMessages={unreadMessages} compact />
          </nav>
        </div>
      </header>

      <main
        className={`mx-auto w-full max-w-6xl px-4 sm:px-5 ${fill ? "flex min-h-0 flex-1 flex-col py-4 sm:py-6" : "py-6 sm:py-10"}`}
      >
        {children}
      </main>
      <PanicButton />
    </div>
  );
}

/** The four sections as pills, with their badges. {@code compact} is the phone version: equal width, centred. */
function SectionLinks({
  pendingLikes,
  unreadMessages,
  compact = false,
}: {
  pendingLikes: number;
  unreadMessages: number;
  compact?: boolean;
}) {
  return (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `relative inline-flex items-center justify-center rounded-full transition ${
              compact ? "min-w-0 px-0.5 py-1.5 text-[11px] min-[320px]:text-[12px] min-[360px]:text-[13px]" : "px-4 py-1.5 text-sm"
            } ${isActive ? "bg-ink text-canvas" : "text-muted hover:bg-white/70 hover:text-ink"}`
          }
        >
          <span className="truncate">{item.label}</span>
          {item.to === "/likes" && pendingLikes > 0 && <Badge count={pendingLikes} floating={compact} />}
          {item.to === "/messages" && unreadMessages > 0 && <Badge count={unreadMessages} floating={compact} />}
        </NavLink>
      ))}
    </>
  );
}

/** {@code floating} pins the count over the corner of its tab, so on a phone it never takes room from the label. */
function Badge({ count, floating = false }: { count: number; floating?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gold font-semibold text-white ${
        floating
          ? "absolute -right-0.5 -top-1.5 h-4 min-w-4 px-1 text-[10px] ring-2 ring-canvas"
          : "ml-1 h-5 min-w-5 px-1.5 text-[11px]"
      }`}
    >
      {count}
    </span>
  );
}
