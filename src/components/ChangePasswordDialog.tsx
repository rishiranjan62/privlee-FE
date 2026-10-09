import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import PasswordInput from "./PasswordInput";
import { inputClass, labelClass } from "../lib/ui";

interface Props {
  /** False for Google accounts that have never chosen a password of their own. */
  hasExistingPassword: boolean;
  onClose: () => void;
}

export default function ChangePasswordDialog({ hasExistingPassword, onClose }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      setError("Those two passwords don't match");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.changePassword(hasExistingPassword ? current : null, next);
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change your password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-line bg-card p-7 shadow-[0_40px_80px_-30px_rgba(29,26,22,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-3xl font-medium">
          {hasExistingPassword ? "Change password" : "Set a password"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {hasExistingPassword
            ? "You'll stay signed in on this device."
            : "You signed up with Google, so you don't have a password yet. Setting one lets you sign in without it."}
        </p>

        {done ? (
          <p className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
            Password updated.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {hasExistingPassword && (
              <div>
                <label className={labelClass}>Current password</label>
                <PasswordInput
                  required
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className={labelClass}>New password</label>
              <PasswordInput
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Confirm new password</label>
              <PasswordInput
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-[#e7c1bd] bg-[#fbeceb] px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-line bg-white/60 px-6 py-3 text-sm transition hover:border-gold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-full bg-ink px-6 py-3 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-60"
              >
                {saving ? "Saving..." : hasExistingPassword ? "Change password" : "Set password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
