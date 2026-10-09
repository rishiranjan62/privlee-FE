import type { Profile } from "../lib/types";
import { lookingForLabels } from "../lib/labels";

interface Props {
  profile: Profile;
  expanded: boolean;
  onToggle: () => void;
  onLike: () => void;
  onPass: () => void;
}

export default function DiscoveryRow({ profile, expanded, onToggle, onLike, onPass }: Props) {
  const primaryPhoto = profile.photos.find((p) => p.primary) ?? profile.photos[0];

  return (
    <li className="border-b border-border last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-1 py-4 text-left transition hover:bg-surface-raised/40"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-sm font-semibold text-text-muted">
          {primaryPhoto ? (
            <img
              src={primaryPhoto.url}
              alt=""
              className={`h-full w-full object-cover ${primaryPhoto.blurred ? "blur-sm" : ""}`}
            />
          ) : (
            profile.pseudonym.charAt(0).toUpperCase()
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="font-medium text-text">{profile.pseudonym}</span>
            <span className="text-sm text-text-muted">{profile.age}</span>
            <span className="text-sm text-text-muted">· {profile.city}</span>
            {profile.verified && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent-soft">
                Verified
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-sm text-text-muted">
            {lookingForLabels[profile.lookingFor] ?? profile.lookingFor}
          </span>
        </span>

        {!expanded && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onLike();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onLike();
              }
            }}
            className="shrink-0 text-sm text-accent-soft hover:underline"
          >
            Say hello ›
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-1 pb-4 pl-[3.75rem]">
          {profile.bio && <p className="mb-3 text-sm text-text">{profile.bio}</p>}
          <div className="flex gap-3">
            <button
              onClick={onPass}
              className="rounded-full border border-border px-4 py-1.5 text-sm text-text-muted transition hover:border-danger hover:text-danger"
            >
              Not now
            </button>
            <button
              onClick={onLike}
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-ink transition hover:bg-accent-soft"
            >
              Say hello
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
