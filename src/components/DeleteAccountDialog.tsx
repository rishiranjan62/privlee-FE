import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { inputClass, labelClass } from "../lib/ui";
import PasswordInput from "./PasswordInput";

interface Props {
  /** False for Google accounts, which have no password to ask for. */
  hasPassword: boolean;
  onClose: () => void;
}

/**
 * Permanent. So it says plainly what goes and what stays, and the button stays off until the person
 * has typed the word - a mis-click cannot delete an account.
 */
export default function DeleteAccountDialog({ hasPassword, onClose }: Props) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const ready = confirm === "DELETE" && (!hasPassword || password.length > 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteAccount(hasPassword ? password : null, confirm);
      logout();
      navigate("/login?deleted=1", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete your account");
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink/40 px-4 py-6 backdrop-blur-sm"
      onClick={deleting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        className="w-full max-w-md rounded-3xl border border-line bg-card p-7 shadow-[0_40px_80px_-30px_rgba(29,26,22,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-title" className="font-display text-3xl font-medium">
          Delete your account?
        </h2>
        <p className="mt-2 text-sm text-muted">This can't be undone.</p>

        <div className="mt-5 space-y-4 text-sm">
          <div>
            <p className="font-medium">Deleted straight away</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
              <li>Your profile, answers and every photo</li>
              <li>Your matches, conversations and likes</li>
              <li>Your notifications and who you've blocked</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">Kept</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
              <li>Your email address, so we recognise you if you come back</li>
              <li>Any safety reports involving you, which we may need to act on</li>
            </ul>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {hasPassword && (
            <div>
              <label className={labelClass}>Your password</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
              />
            </div>
          )}
          <div>
            <label className={labelClass}>
              Type <span className="font-semibold text-ink">DELETE</span> to confirm
            </label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="rounded-full border border-line bg-white/60 px-5 py-2.5 text-sm transition hover:border-gold disabled:opacity-60"
            >
              Keep my account
            </button>
            <button
              disabled={!ready || deleting}
              className="rounded-full bg-danger px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {deleting ? "Deleting..." : "Delete my account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
