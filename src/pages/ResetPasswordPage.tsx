import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { usePageMeta } from "../lib/seo";
import PasswordInput from "../components/PasswordInput";
import AuthShell, { inputClass, labelClass, primaryBtn, PrimaryFill } from "../components/AuthShell";

/** Where the link in the reset email lands. */
export default function ResetPasswordPage() {
  // The address carries a one-time token, so this page must never be listed or cached.
  usePageMeta({ title: "Choose a new password - Privlee", index: false });
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token as string, password);
      navigate("/login?reset=1", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthShell>
        <div className="rise">
          <h1 className="font-display text-5xl font-medium leading-tight">That link didn't work.</h1>
          <p className="mt-4 text-[color:var(--l-muted)]">This link isn't valid. Request a new one.</p>
          <Link
            to="/forgot-password"
            className="mt-8 inline-block rounded-full bg-[color:var(--l-ink)] px-8 py-3 font-medium text-[color:var(--l-bg)] transition hover:bg-[color:var(--l-gold)]"
          >
            Get a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="rise">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[color:var(--l-gold)]">New password</p>
        <h1 className="mt-3 font-display text-5xl font-medium leading-tight">
          Choose a <span className="gold-text italic">new one.</span>
        </h1>
        <p className="mt-3 text-[color:var(--l-muted)]">You'll be signed out everywhere else once you've changed it.</p>
      </div>

      <form onSubmit={handleSubmit} className="rise mt-8 space-y-5" style={{ animationDelay: "100ms" }}>
        <div>
          <label className={labelClass}>New password</label>
          <PasswordInput
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Type it again</label>
          <PasswordInput
            required
            autoComplete="new-password"
            placeholder="The same password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-xl border border-[#e7c1bd] bg-[#fbeceb] px-4 py-3 text-sm text-[#a2453d]">
            {error}{" "}
            {/* An expired or used link can only be fixed by asking for another. */}
            {error.includes("link") && (
              <Link to="/forgot-password" className="font-medium underline underline-offset-4">
                Get a new link
              </Link>
            )}
          </p>
        )}
        <button type="submit" disabled={loading} className={primaryBtn}>
          <span className="relative z-10">{loading ? "Saving..." : "Change my password"}</span>
          <PrimaryFill />
        </button>
      </form>
    </AuthShell>
  );
}
