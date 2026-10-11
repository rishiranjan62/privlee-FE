import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import CityInput from "../components/CityInput";
import ProfileExtrasFields from "../components/ProfileExtrasFields";
import PhotoAccessManager from "../components/PhotoAccessManager";
import PhotoManager from "../components/PhotoManager";
import InterestedInPicker from "../components/InterestedInPicker";
import { cardClass, inputClass, labelClass, pillClass } from "../lib/ui";
import { genderLabels } from "../lib/labels";
import type { LookingFor, Profile, ProfileExtras, RelationshipStatus } from "../lib/types";

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

/**
 * The editable half of a profile, as a comparable string. Photos are excluded: they save
 * through their own endpoints, so they are already persisted by the time we compare.
 */
function editableFingerprint(p: Profile): string {
  return JSON.stringify([
    p.bio ?? "",
    p.lookingFor,
    p.relationshipStatus,
    p.city,
    p.discreetMode,
    [...p.interests].sort(),
    p.smoking,
    p.drinking,
    p.dislikes ?? "",
    p.wantsInConnection ?? "",
    p.discretionLevel,
    [...p.availability].sort(),
    // Choosing nothing and choosing everyone mean the same thing, so they are not a change.
    (p.interestedIn ?? []).length === 4 ? [] : [...(p.interestedIn ?? [])].sort(),
  ]);
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMyProfile()
      .then((p) => {
        setProfile(p);
        setSaved(p);
      })
      .catch(() => setLoadError("Could not load your profile."));
  }, []);

  const dirty =
    profile !== null && saved !== null && editableFingerprint(profile) !== editableFingerprint(saved);

  if (loadError) {
    return (
      <p className="rounded-3xl border border-dashed border-line bg-white/50 px-6 py-12 text-center text-muted">
        {loadError}
      </p>
    );
  }

  if (!profile) {
    return <p className="py-12 text-center text-muted">Loading your profile...</p>;
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
        interestedIn: profile.interestedIn ?? [],
        interests: profile.interests,
        smoking: profile.smoking,
        drinking: profile.drinking,
        dislikes: profile.dislikes,
        wantsInConnection: profile.wantsInConnection,
        discretionLevel: profile.discretionLevel,
        availability: profile.availability,
      });
      setProfile(updated);
      setSaved(updated);
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
    // Photos persist on upload, so take only those from the response - overwriting the whole
    // profile would throw away any edits still sitting unsaved in the form.
    setProfile((prev) => (prev ? { ...prev, photos: updated.photos } : updated));
    setSaved((prev) => (prev ? { ...prev, photos: updated.photos } : updated));
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="rise">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Your profile</p>
        <h1 className="mt-3 font-display text-5xl font-medium leading-tight">
          {profile.pseudonym}
        </h1>
        <p className="mt-3 max-w-md text-muted">
          Your real name is never collected. You always see your own photos clearly — everyone else
          sees them blurred.
        </p>
      </header>

      <section className={`${cardClass} p-7`}>
        <PhotoManager
          photos={profile.photos}
          onAdd={() => fileInput.current?.click()}
          onPhotosChanged={(updated) => {
            // Photos persist immediately, so mirror them into both copies and leave
            // any unsaved text edits in the form untouched.
            setProfile((prev) => (prev ? { ...prev, photos: updated.photos } : updated));
            setSaved((prev) => (prev ? { ...prev, photos: updated.photos } : updated));
          }}
        />
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </section>

      <PhotoAccessManager />

      <section className={`${cardClass} space-y-6 p-7`}>
        <div>
          <label className={labelClass}>About you</label>
          <textarea
            value={profile.bio ?? ""}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            maxLength={500}
            rows={3}
            placeholder="A few lines, in your own words."
            className={inputClass}
          />
          <p className="mt-1.5 text-right text-xs text-muted">
            {(profile.bio ?? "").length}/500
          </p>
        </div>

        <div>
          <label className={labelClass}>Gender</label>
          <p className="rounded-full border border-line bg-white/50 px-5 py-3 text-muted" aria-readonly="true">
            {genderLabels[profile.gender] ?? profile.gender}
          </p>
          <p className="mt-2 text-xs text-muted">Your gender is part of how others find you, so it can't be changed.</p>
        </div>

        <div>
          <label className={labelClass}>City</label>
          <CityInput value={profile.city} onChange={(city) => setProfile({ ...profile, city })} />
        </div>

        <div>
          <label className={labelClass}>Relationship status</label>
          <div className="flex flex-wrap gap-2">
            {relationshipOptions.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => setProfile({ ...profile, relationshipStatus: o.value })}
                className={pillClass(profile.relationshipStatus === o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Looking for</label>
          <div className="flex flex-wrap gap-2">
            {lookingForOptions.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => setProfile({ ...profile, lookingFor: o.value })}
                className={pillClass(profile.lookingFor === o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Show me</label>
          <InterestedInPicker
            value={profile.interestedIn ?? []}
            onChange={(interestedIn) => setProfile({ ...profile, interestedIn })}
            pillClass={pillClass}
          />
          <p className="mt-2 text-xs text-muted">Only these profiles appear in Discover. Nobody else can see this choice.</p>
        </div>
      </section>

      <section className={`${cardClass} space-y-6 p-7`}>
        <div>
          <h2 className="font-display text-2xl font-medium">More about you</h2>
          <p className="mt-1 text-sm text-muted">
            All optional, and all visible on your profile when someone opens it.
          </p>
        </div>
        <ProfileExtrasFields
          value={profile}
          onChange={(patch: Partial<ProfileExtras>) => setProfile({ ...profile, ...patch })}
        />
      </section>

      <section className={`${cardClass} p-7`}>
        <button
          type="button"
          role="switch"
          aria-checked={profile.discreetMode}
          onClick={() => setProfile({ ...profile, discreetMode: !profile.discreetMode })}
          className="flex w-full items-center justify-between gap-6 text-left"
        >
          <span>
            <span className="font-display text-2xl font-medium">Incognito browsing</span>
            <span className="mt-1 block text-sm text-muted">
              Hide your profile from Discover while you browse.
            </span>
          </span>
          <span
            className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${
              profile.discreetMode ? "bg-ink" : "bg-line"
            }`}
          >
            <span
              className={`h-6 w-6 rounded-full transition-transform duration-300 ${
                profile.discreetMode ? "translate-x-6 bg-gold" : "translate-x-0 bg-white"
              }`}
            />
          </span>
        </button>
      </section>

      <button
        onClick={handleSave}
        disabled={saving || !dirty}
        className="group relative w-full overflow-hidden rounded-full bg-ink px-6 py-3.5 font-medium text-canvas shadow-[0_18px_40px_-14px_rgba(29,26,22,0.6)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
      >
        <span className="relative z-10">
          {saving ? "Saving..." : savedAt ? "Saved" : "Save changes"}
        </span>
        {dirty && (
          <span className="absolute inset-0 -translate-x-full bg-gold transition-transform duration-500 ease-out group-hover:translate-x-0" />
        )}
      </button>
      {dirty && !saving && (
        <p className="-mt-2 text-center text-xs text-muted">You have unsaved changes.</p>
      )}
    </div>
  );
}
