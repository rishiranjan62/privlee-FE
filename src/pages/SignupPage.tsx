import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { terms } from "../lib/legal";
import { pageMeta } from "../lib/pageMeta";
import { usePageMeta } from "../lib/seo";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";
import GoogleButton, { Divider } from "../components/GoogleButton";
import CityInput from "../components/CityInput";
import ProfileExtrasFields, { emptyExtras } from "../components/ProfileExtrasFields";
import AuthShell, {
  inputClass,
  labelClass,
  primaryBtn,
  PrimaryFill,
} from "../components/AuthShell";
import type { Gender, LookingFor, ProfileExtras, RelationshipStatus } from "../lib/types";

const genders: Gender[] = ["FEMALE", "MALE", "NON_BINARY", "OTHER"];
const lookingForOptions: { value: LookingFor; label: string }[] = [
  { value: "AFFAIR", label: "An affair" },
  { value: "EMOTIONAL_CONNECTION", label: "Emotional connection" },
  { value: "FRIENDSHIP", label: "Friendship" },
  { value: "CASUAL", label: "Something casual" },
  { value: "OPEN_RELATIONSHIP", label: "Open relationship" },
];
const relationshipOptions: { value: RelationshipStatus; label: string }[] = [
  { value: "MARRIED", label: "Married" },
  { value: "ATTACHED", label: "Attached" },
  { value: "OPEN_RELATIONSHIP", label: "Open relationship" },
  { value: "DIVORCED", label: "Divorced" },
  { value: "SINGLE", label: "Single" },
];

/** The most recent birth date that is still 18 or over, as YYYY-MM-DD for a date field's `max`. */
function latestAdultBirthDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SignupPage() {
  usePageMeta({
    ...pageMeta.signup,
    index: true,
    path: "/signup",
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pseudonym, setPseudonym] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<Gender>("FEMALE");
  const [lookingFor, setLookingFor] = useState<LookingFor>("AFFAIR");
  const [relationshipStatus, setRelationshipStatus] =
    useState<RelationshipStatus>("MARRIED");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [extras, setExtras] = useState<ProfileExtras>(emptyExtras);
  const location = useLocation();
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(
    (location.state as { googleIdToken?: string } | null)?.googleIdToken ??
      null,
  );
  // Set only after Google has proved the address, so greeting them reveals nothing to anyone else.
  // "I am 18 or over and agree to the Terms and Privacy Policy" - required before the account is made.
  const [accepted, setAccepted] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState(
    (location.state as { welcomeBack?: boolean } | null)?.welcomeBack ?? false,
  );
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === 1) {
      // Told straight away, before the rest of the form is filled in. The server remembers a refusal
      // for this browser, so another date cannot simply be typed in its place.
      setError(null);
      setLoading(true);
      try {
        await api.checkAge(dateOfBirth);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        return;
      } finally {
        setLoading(false);
      }
    }
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    await createAccount(extras);
  }

  const hasExtras = (e: ProfileExtras) =>
    e.interests.length > 0 ||
    e.availability.length > 0 ||
    Boolean(e.smoking || e.drinking || e.discretionLevel || e.wantsInConnection || e.dislikes);

  async function createAccount(optional: ProfileExtras) {
    setError(null);
    setLoading(true);
    try {
      const profile = {
        pseudonym,
        dateOfBirth,
        gender,
        lookingFor,
        relationshipStatus,
        city,
        acceptedTerms: accepted,
        termsVersion: terms.updated,
      };
      if (!googleIdToken) {
        // The optional answers travel with the account details: there is no token to save them
        // with afterwards, because nobody is signed in until their email is verified.
        await api.signup({ email, password, ...profile, ...optional });
        setSentTo(email);
        return;
      }
      const res = await api.googleSignup({ idToken: googleIdToken, ...profile });
      login(res.accessToken, res.pseudonym, res.userId);
      // The account exists now; the optional answers are a best-effort follow-up.
      if (hasExtras(optional)) {
        try {
          await api.updateMyProfile({
            bio: "",
            lookingFor,
            relationshipStatus,
            city,
            discreetMode: false,
            ...optional,
          });
        } catch {
          // Not worth blocking entry - they can fill these in from Profile.
        }
      }
      navigate("/discover");
    } catch (err) {
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
        setGoogleIdToken(idToken);
        setWelcomeBack(res.welcomeBack ?? false);
      } else if (res.auth) {
        login(res.auth.accessToken, res.auth.pseudonym, res.auth.userId);
        navigate("/discover");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const stepMeta = [
    {
      title: welcomeBack && googleIdToken ? "Welcome back" : "Choose how you appear",
      sub: googleIdToken
        ? welcomeBack
          ? "Google confirmed your email. Your earlier profile was deleted, so set up a fresh one - pick a pseudonym to begin."
          : "Google confirmed your email. Now pick a pseudonym. Your Google name is never used."
        : "A pseudonym is all anyone ever sees.",
    },
    {
      title: "A little about you",
      sub: "Used only to show you relevant people nearby.",
    },
    { title: "What brings you here?", sub: "Say it plainly. No judgement." },
    {
      title: "A fuller picture",
      sub: "All optional. Skip it and fill it in later from your profile.",
    },
  ];

  const pill = (active: boolean) =>
    `cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
      active
        ? "border-[color:var(--l-ink)] bg-[color:var(--l-ink)] text-[color:var(--l-bg)]"
        : "border-[color:var(--l-line)] bg-white/60 hover:border-[color:var(--l-gold)]"
    }`;

  if (sentTo) {
    return (
      <AuthShell>
        <div className="rise">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[color:var(--l-gold)]">One last thing</p>
          <h1 className="mt-3 font-display text-5xl font-medium leading-tight">
            Check your <span className="gold-text italic">inbox.</span>
          </h1>
          <p className="mt-4 text-[color:var(--l-muted)]">
            We sent a link to <span className="text-[color:var(--l-ink)]">{sentTo}</span>. Open it to finish
            creating your account. It works once and expires in 24 hours.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
            <button
              onClick={async () => {
                await api.resendVerification(sentTo).catch(() => {});
                setResent(true);
              }}
              className="rounded-full border border-[color:var(--l-line)] bg-white/60 px-6 py-3 transition hover:border-[color:var(--l-gold)]"
            >
              {resent ? "Sent again" : "Send it again"}
            </button>
            <Link to="/login" className="font-medium text-[color:var(--l-gold)] hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-8 flex items-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 overflow-hidden rounded-full bg-[color:var(--l-line)]"
          >
            <div
              className="h-full rounded-full bg-[color:var(--l-gold)] transition-all duration-700 ease-out"
              style={{ width: i <= step ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      <div key={`h${step}`} className="rise">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[color:var(--l-gold)]">
          Step {step + 1} of 4
        </p>
        <h1 className="mt-3 font-display text-5xl font-medium leading-tight">
          {stepMeta[step].title}
        </h1>
        <p className="mt-3 text-[color:var(--l-muted)]">{stepMeta[step].sub}</p>
      </div>

      {step === 0 && !googleIdToken && (
        <div className="mt-8">
          <GoogleButton onCredential={handleGoogle} />
          <Divider />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={step === 0 && !googleIdToken ? "" : "mt-9"}
      >
        <div
          key={`s${step}`}
          className="rise space-y-5"
          style={{ animationDelay: "100ms" }}
        >
          {step === 0 && (
            <>
              <div>
                <label className={labelClass}>Pseudonym</label>
                <input
                  placeholder="What others will see"
                  required
                  minLength={2}
                  maxLength={30}
                  value={pseudonym}
                  onChange={(e) => setPseudonym(e.target.value)}
                  className={inputClass}
                />
              </div>
              {!googleIdToken && (
                <>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="Private, never shown"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Password</label>
                    <PasswordInput
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Date of birth (18+)</label>
                  <input
                    type="date"
                    required
                    // Nobody chooses a date that would make them under 18; the server checks again.
                    min="1900-01-01"
                    max={latestAdultBirthDate()}
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <CityInput value={city} onChange={setCity} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <div className="flex flex-wrap gap-2">
                  {genders.map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setGender(g)}
                      className={pill(gender === g)}
                    >
                      {g
                        .replace("_", " ")
                        .toLowerCase()
                        .replace(/^./, (c) => c.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Relationship status</label>
                <div className="flex flex-wrap gap-2">
                  {relationshipOptions.map((o) => (
                    <button
                      type="button"
                      key={o.value}
                      onClick={() => setRelationshipStatus(o.value)}
                      className={pill(relationshipStatus === o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {lookingForOptions.map((o) => (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => setLookingFor(o.value)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition ${
                    lookingFor === o.value
                      ? "border-[color:var(--l-gold)] bg-white shadow-[0_16px_36px_-22px_rgba(120,80,30,0.6)]"
                      : "border-[color:var(--l-line)] bg-white/60 hover:border-[color:var(--l-gold)]"
                  }`}
                >
                  <span className="font-display text-xl">{o.label}</span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition ${
                      lookingFor === o.value
                        ? "border-[color:var(--l-gold)] bg-[color:var(--l-gold)] text-white"
                        : "border-[color:var(--l-line)] text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 3 && <ProfileExtrasFields value={extras} onChange={(patch) => setExtras({ ...extras, ...patch })} />}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-[#e7c1bd] bg-[#fbeceb] px-4 py-3 text-sm text-[#a2453d]"
            >
              {error}
            </p>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="rounded-full border border-[color:var(--l-line)] bg-white/60 px-6 py-3.5 transition hover:border-[color:var(--l-gold)]"
            >
              Back
            </button>
          )}
          <button type="submit" disabled={loading || (step === 2 && !accepted)} className={primaryBtn}>
            <span className="relative z-10">
              {step < 2
                ? "Continue"
                : loading
                  ? "Creating account..."
                  : "Create my private profile"}
            </span>
            <PrimaryFill />
          </button>
        </div>

        {/* Ticked before the button that creates the account; the server refuses a sign-up without it. */}
        {step === 2 && (
          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[color:var(--l-muted)]">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--l-gold)]"
            />
            <span>
              I am 18 or over, and I agree to the{" "}
              <Link to="/terms" target="_blank" className="font-medium text-[color:var(--l-gold)] hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" target="_blank" className="font-medium text-[color:var(--l-gold)] hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        )}

        {step === 3 && (
          <button
            type="button"
            onClick={() => createAccount(emptyExtras)}
            disabled={loading}
            className="mt-4 w-full text-center text-sm text-[color:var(--l-muted)] underline-offset-4 transition hover:text-[color:var(--l-ink)] hover:underline disabled:opacity-60"
          >
            Skip for now
          </button>
        )}
      </form>

      <p className="mt-8 text-center text-sm text-[color:var(--l-muted)]">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-[color:var(--l-gold)] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
