import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { LookingFor, Profile, RelationshipStatus } from "../lib/types";

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

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getMyProfile().then(setProfile);
  }, []);

  if (!profile) {
    return <p className="text-center text-text-muted">Loading your profile...</p>;
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await api.updateMyProfile({
        bio: profile.bio ?? "",
        lookingFor: profile.lookingFor,
        relationshipStatus: profile.relationshipStatus,
        city: profile.city,
        discreetMode: profile.discreetMode,
      });
      setProfile(updated);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const updated = await api.uploadPhoto(file);
    setProfile(updated);
    if (fileInput.current) fileInput.current.value = "";
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text placeholder:text-text-muted focus:border-accent focus:outline-none";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{profile.pseudonym}</h2>
        <p className="text-sm text-text-muted">
          Real name is never collected. Photos stay blurred until you choose to reveal them
          to someone.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-xs text-text-muted">Photos</label>
        <div className="flex flex-wrap gap-3">
          {profile.photos.map((p) => (
            <img
              key={p.id}
              src={p.url}
              className={`h-20 w-20 rounded-lg object-cover ${p.blurred ? "blur-md" : ""}`}
            />
          ))}
          <button
            onClick={() => fileInput.current?.click()}
            className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-border text-text-muted hover:border-accent"
          >
            +
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-text-muted">About you</label>
        <textarea
          value={profile.bio ?? ""}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          maxLength={500}
          rows={3}
          className={inputClass}
        />
      </div>

      <input
        value={profile.city}
        onChange={(e) => setProfile({ ...profile, city: e.target.value })}
        placeholder="City"
        className={inputClass}
      />

      <div>
        <label className="mb-1 block text-xs text-text-muted">Relationship status</label>
        <select
          value={profile.relationshipStatus}
          onChange={(e) =>
            setProfile({ ...profile, relationshipStatus: e.target.value as RelationshipStatus })
          }
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
          value={profile.lookingFor}
          onChange={(e) => setProfile({ ...profile, lookingFor: e.target.value as LookingFor })}
          className={inputClass}
        >
          {lookingForOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
        <span className="text-sm">
          Incognito browsing
          <span className="block text-xs text-text-muted">
            Hide your profile from Discover while you browse
          </span>
        </span>
        <input
          type="checkbox"
          checked={profile.discreetMode}
          onChange={(e) => setProfile({ ...profile, discreetMode: e.target.checked })}
          className="h-5 w-5 accent-[var(--color-accent)]"
        />
      </label>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-ink transition hover:bg-accent-soft disabled:opacity-60"
      >
        {saving ? "Saving..." : savedAt ? "Saved" : "Save changes"}
      </button>
    </div>
  );
}
