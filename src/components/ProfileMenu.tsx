import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { tintFor } from "../lib/avatar";
import { useAuth } from "../context/AuthContext";
import ChangePasswordDialog from "./ChangePasswordDialog";
import DeleteAccountDialog from "./DeleteAccountDialog";

export default function ProfileMenu() {
  const { pseudonym, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
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

  async function openPasswordDialog() {
    setOpen(false);
    // Google accounts have no password of their own, so they are not asked for a current one.
    try {
      const me = await api.getMyProfile();
      setHasPassword(me.passwordSet !== false);
    } catch {
      setHasPassword(true);
    }
    setShowPasswordDialog(true);
  }

  async function openDeleteDialog() {
    setOpen(false);
    // Google accounts have no password to ask for, so they confirm by typing the word alone.
    try {
      const me = await api.getMyProfile();
      setHasPassword(me.passwordSet !== false);
    } catch {
      setHasPassword(true);
    }
    setShowDeleteDialog(true);
  }

  const name = pseudonym ?? "?";

  return (
    <>
      <div ref={wrapper} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-1 transition sm:pr-2.5 ${
            open ? "border-gold bg-white" : "border-line bg-white/60 hover:border-gold"
          }`}
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br font-display text-sm font-medium text-white/90 ${tintFor(
              name,
            )}`}
          >
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="hidden text-sm sm:block">{name}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`hidden h-3 w-3 text-muted transition-transform sm:block ${open ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-line bg-card py-1 shadow-[0_30px_60px_-24px_rgba(120,80,30,0.5)]"
          >
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="block px-4 py-2.5 text-sm transition hover:bg-white"
            >
              Your profile
            </Link>
            <Link
              to="/credits"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="block px-4 py-2.5 text-sm transition hover:bg-white"
            >
              Credits
            </Link>
            <Link
              to="/blocked"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="block px-4 py-2.5 text-sm transition hover:bg-white"
            >
              Blocked profiles
            </Link>
            <button
              onClick={openPasswordDialog}
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm transition hover:bg-white"
            >
              Update password
            </button>
            <Link
              to="/terms"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="block px-4 py-2.5 text-sm transition hover:bg-white"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="block px-4 py-2.5 text-sm transition hover:bg-white"
            >
              Privacy Policy
            </Link>
            <button
              onClick={openDeleteDialog}
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm transition hover:bg-white"
            >
              Delete account
            </button>
            <div className="my-1 h-px bg-line/70" />
            <button
              onClick={() => {
                setOpen(false);
                logout();
                navigate("/login");
              }}
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm text-danger transition hover:bg-white"
            >
              Log out
            </button>
          </div>
        )}
      </div>

      {showDeleteDialog && (
        <DeleteAccountDialog hasPassword={hasPassword} onClose={() => setShowDeleteDialog(false)} />
      )}

      {showPasswordDialog && (
        <ChangePasswordDialog
          hasExistingPassword={hasPassword}
          onClose={() => setShowPasswordDialog(false)}
        />
      )}
    </>
  );
}
