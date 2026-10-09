import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { usePageMeta } from "../lib/seo";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";

/** Where the link in the verification email lands. Signs the person in on success. */
export default function VerifyEmailPage() {
  // The address carries a one-time sign-in token, so this page must never be listed or cached.
  usePageMeta({ title: "Confirming your email - Privlee", index: false });
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [welcomeBack, setWelcomeBack] = useState(false);
  // React StrictMode runs effects twice in development; the link is single-use, so a second call
  // would turn a success into "already used". One attempt per page load.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const token = params.get("token");
    if (!token) {
      setError("This link isn't valid.");
      return;
    }
    api
      .verifyEmail(token)
      .then((res) => {
        login(res.accessToken, res.pseudonym, res.userId);
        // Someone returning gets a moment of recognition before the app; everyone else goes straight in.
        if (res.welcomeBack) setWelcomeBack(true);
        else navigate("/discover", { replace: true });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "This link isn't valid."));
  }, [params, login, navigate]);

  return (
    <AuthShell>
      <div className="rise">
        {error ? (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-[color:var(--l-gold)]">Couldn't verify</p>
            <h1 className="mt-3 font-display text-5xl font-medium leading-tight">That link didn't work.</h1>
            <p className="mt-4 text-[color:var(--l-muted)]">{error}</p>
            <Link
              to="/login"
              className="mt-8 inline-block rounded-full bg-[color:var(--l-ink)] px-8 py-3 font-medium text-[color:var(--l-bg)] transition hover:bg-[color:var(--l-gold)]"
            >
              Sign in to get a new one
            </Link>
          </>
        ) : welcomeBack ? (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-[color:var(--l-gold)]">Good to see you</p>
            <h1 className="mt-3 font-display text-5xl font-medium leading-tight">
              Welcome <span className="gold-text italic">back.</span>
            </h1>
            <p className="mt-4 text-[color:var(--l-muted)]">
              Your earlier profile was deleted, so you're starting fresh. Nothing from before has come back.
            </p>
            <button
              onClick={() => navigate("/discover", { replace: true })}
              className="mt-8 inline-block rounded-full bg-[color:var(--l-ink)] px-8 py-3 font-medium text-[color:var(--l-bg)] transition hover:bg-[color:var(--l-gold)]"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-[color:var(--l-gold)]">Almost there</p>
            <h1 className="mt-3 font-display text-5xl font-medium leading-tight">Confirming your email...</h1>
          </>
        )}
      </div>
    </AuthShell>
  );
}
