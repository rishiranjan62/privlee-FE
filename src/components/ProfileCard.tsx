import type { Profile } from "../lib/types";

const lookingForLabels: Record<string, string> = {
  AFFAIR: "An affair",
  EMOTIONAL_CONNECTION: "Emotional connection",
  FRIENDSHIP: "Friendship",
  CASUAL: "Something casual",
  OPEN_RELATIONSHIP: "Open relationship",
};

export default function ProfileCard({ profile }: { profile: Profile }) {
  const primaryPhoto = profile.photos.find((p) => p.primary) ?? profile.photos[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="relative flex h-72 items-center justify-center bg-surface-raised">
        {primaryPhoto ? (
          <img
            src={primaryPhoto.url}
            alt=""
            className={`h-full w-full object-cover ${primaryPhoto.blurred ? "blur-2xl scale-110" : ""}`}
          />
        ) : (
          <span className="text-5xl font-semibold text-text-muted">
            {profile.pseudonym.charAt(0).toUpperCase()}
          </span>
        )}
        {profile.verified && (
          <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-ink">
            Verified
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-semibold">{profile.pseudonym}</h3>
          <span className="text-sm text-text-muted">{profile.age}</span>
        </div>
        <p className="text-sm text-text-muted">{profile.city}</p>
        {profile.bio && <p className="mt-2 text-sm text-text">{profile.bio}</p>}
        <span className="mt-3 inline-block rounded-full border border-border px-2.5 py-1 text-xs text-text-muted">
          {lookingForLabels[profile.lookingFor] ?? profile.lookingFor}
        </span>
      </div>
    </div>
  );
}
