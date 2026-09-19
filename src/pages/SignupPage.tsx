import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Gender, LookingFor, RelationshipStatus } from "../lib/types";

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

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pseudonym, setPseudonym] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<Gender>("FEMALE");
  const [lookingFor, setLookingFor] = useState<LookingFor>("AFFAIR");
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>("MARRIED");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.signup({
        email,
        password,
        pseudonym,
        dateOfBirth,
        gender,
        lookingFor,
        relationshipStatus,
        city,
      });
      login(res.accessToken, res.pseudonym, res.userId);
      navigate("/discover");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text placeholder:text-text-muted focus:border-accent focus:outline-none";

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-center text-2xl font-semibold text-accent-soft">Privlee</h1>
        <p className="mb-8 text-center text-sm text-text-muted">
          No real name required. You choose what to reveal, and to whom.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            placeholder="Pseudonym (this is what others see)"
            required
            minLength={2}
            value={pseudonym}
            onChange={(e) => setPseudonym(e.target.value)}
            className={inputClass}
          />
          <input
            type="email"
            required
            placeholder="Email (private, never shown)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <div>
            <label className="mb-1 block text-xs text-text-muted">Date of birth (18+)</label>
            <input
              type="date"
              required
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={inputClass}
            />
          </div>
          <input
            placeholder="City"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputClass}
          />
          <div>
            <label className="mb-1 block text-xs text-text-muted">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className={inputClass}
            >
              {genders.map((g) => (
                <option key={g} value={g}>
                  {g.replace("_", " ").toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">Relationship status</label>
            <select
              value={relationshipStatus}
              onChange={(e) => setRelationshipStatus(e.target.value as RelationshipStatus)}
              className={inputClass}
            >
              {relationshipOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">Looking for</label>
            <select
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value as LookingFor)}
              className={inputClass}
            >
              {lookingForOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-ink transition hover:bg-accent-soft disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-accent-soft hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
