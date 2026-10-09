import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChangePasswordDialog from "../components/ChangePasswordDialog";
import { useAuth } from "../context/AuthContext";
import { tintFor } from "../lib/avatar";
import type { AdminMe } from "../lib/types";

/**
 * The staff counterpart of the member profile menu: one avatar button, and the account actions
 * (change password, log out) inside it - so the header carries one control, not three.
 */
export default function AdminProfileMenu({ me }: { me: AdminMe }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const name = me.pseudonym || me.email;

  return (
    <>
      <div ref={wrapper} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 transition ${
            open ? "border-white/60 bg-white/10" : "border-white/25 hover:bg-white/10"
          }`}
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br font-display text-sm font-medium text-white/90 ${tintFor(
              name,
            )}`}
          >
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="hidden text-sm text-white/80 sm:block">{name}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`h-3 w-3 text-white/60 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-lg border border-line bg-white py-1 text-ink shadow-lg"
          >
            <div className="border-b border-line/70 px-4 py-2.5">
              <p className="text-xs uppercase tracking-wider text-muted">Signed in as</p>
              <p className="truncate text-sm font-medium">{me.email}</p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                setChangingPassword(true);
              }}
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm transition hover:bg-[#faf9f6]"
            >
              Update password
            </button>
            <div className="my-1 h-px bg-line/70" />
            <button
              onClick={() => {
                setOpen(false);
                logout();
                navigate("/login");
              }}
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm text-danger transition hover:bg-[#faf9f6]"
            >
              Log out
            </button>
          </div>
        )}
      </div>

      {changingPassword && <ChangePasswordDialog hasExistingPassword onClose={() => setChangingPassword(false)} />}
    </>
  );
}
