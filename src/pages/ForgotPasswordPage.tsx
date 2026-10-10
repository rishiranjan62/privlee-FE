import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { usePageMeta } from "../lib/seo";
import AuthShell, { inputClass, labelClass, primaryBtn, PrimaryFill } from "../components/AuthShell";

export default function ForgotPasswordPage() {
  usePageMeta({ title: "Reset your password - Privlee", index: false });
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      // The same screen for every address. Whether a link was sent is deliberately not said, so this
      // form cannot be used to find out who has an account.
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="rise">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[color:var(--l-gold)]">Forgot your password?</p>
        <h1 className="mt-3 font-display text-5xl font-medium leading-tight">
          Let's get you <span className="gold-text italic">back in.</span>
        </h1>
      </div>

      {sent ? (
        <div className="rise mt-8" style={{ animationDelay: "100ms" }}>
          <p role="status" className="rounded-xl border border-[#e3d3b4] bg-[#fbf3e1] px-4 py-3 text-sm">
            If that address has an account, a link to choose a new password is on its way. It works once and expires
            in an hour. Check your spam folder if it doesn't appear.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-block text-sm font-medium text-[color:var(--l-gold)] hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rise mt-8 space-y-5" style={{ animationDelay: "100ms" }}>
          <p className="text-[color:var(--l-muted)]">
            Enter the email address you signed up with and we'll send you a link to choose a new password.
          </p>
          <div>
            <label htmlFor="forgot-email" className={labelClass}>Email</label>
            <input id="forgot-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-xl border border-[#e7c1bd] bg-[#fbeceb] px-4 py-3 text-sm text-[#a2453d]">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading || !email.trim()} className={primaryBtn}>
            <span className="relative z-10">{loading ? "Sending..." : "Send me a link"}</span>
            <PrimaryFill />
          </button>
          <p className="text-center text-sm text-[color:var(--l-muted)]">
            <Link to="/login" className="font-medium text-[color:var(--l-gold)] hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
