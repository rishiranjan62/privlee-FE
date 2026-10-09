import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";
import GoogleButton, { Divider } from "../components/GoogleButton";
import AuthShell, { inputClass, labelClass, primaryBtn, PrimaryFill } from "../components/AuthShell";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const expired = params.get("expired") === "1";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      login(res.accessToken, res.pseudonym, res.userId);
      navigate("/discover");
    } catch (err) {
      setNeedsVerification((err as { code?: string }).code === "EMAIL_NOT_VERIFIED");
      setResent(false);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle(idToken: string) {
    setError(null);
    try {
      const res = await api.googleLogin(idToken);
      if (res.profileRequired) {
        navigate("/signup", { state: { googleIdToken: idToken } });
      } else if (res.auth) {
        login(res.auth.accessToken, res.auth.pseudonym, res.auth.userId);
        navigate("/discover");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <AuthShell>
      <div className="rise">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[color:var(--l-gold)]">Welcome back</p>
        <h1 className="mt-3 font-display text-5xl font-medium leading-tight">
          Step back <span className="gold-text italic">inside.</span>
        </h1>
        <p className="mt-3 text-[color:var(--l-muted)]">
          {expired
            ? "Your session timed out for safety. Sign in to carry on."
            : "Discreet by design. Sign in to pick up where you left off."}
        </p>
      </div>

      <div className="rise mt-10" style={{ animationDelay: "100ms" }}>
        <GoogleButton onCredential={handleGoogle} />
        <Divider />
      </div>

      <form onSubmit={handleSubmit} className="rise space-y-5" style={{ animationDelay: "160ms" }}>
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <PasswordInput
            required
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-xl border border-[#e7c1bd] bg-[#fbeceb] px-4 py-3 text-sm text-[#a2453d]">
            {error}
            {needsVerification && (
              <button
                type="button"
                onClick={async () => {
                  await api.resendVerification(email).catch(() => {});
                  setResent(true);
                }}
                className="mt-2 block font-medium underline underline-offset-4"
              >
                {resent ? "Link sent - check your inbox" : "Send me a new link"}
              </button>
            )}
          </p>
        )}
        <button type="submit" disabled={loading} className={primaryBtn}>
          <span className="relative z-10">{loading ? "Signing in..." : "Sign in"}</span>
          <PrimaryFill />
        </button>
      </form>

      <p className="rise mt-8 text-center text-sm text-[color:var(--l-muted)]" style={{ animationDelay: "220ms" }}>
        New here?{" "}
        <Link to="/signup" className="font-medium text-[color:var(--l-gold)] hover:underline">
          Create your private profile
        </Link>
      </p>
    </AuthShell>
  );
}
