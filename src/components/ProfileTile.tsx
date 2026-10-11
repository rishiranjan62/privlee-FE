import { Link } from "react-router-dom";
import { tintFor } from "../lib/avatar";
import { genderLabels, lookingForLabels } from "../lib/labels";
import type { Profile } from "../lib/types";

interface Props {
  profile: Profile;
  /** Where the tile itself leads. Defaults to the person's profile. */
  to?: string;
  actionLabel: string;
  onAction: () => void;
  /** "danger" is for undoing something, e.g. taking a like back; "liked" is the settled look of a like already sent. */
  actionTone?: "default" | "danger" | "liked";
  disabled?: boolean;
  /** Say whether the person is a man, a woman... - for lists that mix genders. */
  showGender?: boolean;
}

/** The square profile card used by Discover and Likes. */
export default function ProfileTile({
  profile,
  to,
  actionLabel,
  onAction,
  actionTone = "default",
  disabled = false,
  showGender = false,
}: Props) {
  const photo = profile.photos.find((p) => p.primary) ?? profile.photos[0];

  return (
    <li className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-card shadow-[0_14px_28px_-20px_rgba(120,80,30,0.5)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_36px_-18px_rgba(120,80,30,0.6)]">
      {photo ? (
        <img
          src={photo.url}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
            photo.blurred ? "blur-lg" : ""
          }`}
        />
      ) : (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br pb-14 ${tintFor(
            profile.pseudonym,
          )}`}
        >
          {/* Padded off the bottom so the initial clears the name and button below. */}
          <span className="font-display text-4xl font-medium text-white/60">
            {profile.pseudonym.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Scrim keeps the name legible over any photo. */}
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

      {/* The whole tile opens the profile; the button below sits above this layer. */}
      <Link
        to={to ?? `/u/${profile.userId}`}
        aria-label={`Open ${profile.pseudonym}`}
        className="absolute inset-0"
      />

      {profile.verified && (
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold">
          Verified
        </span>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5">
        <p className="flex items-baseline gap-1 font-display text-base font-medium leading-tight text-white">
          <span className="truncate">{profile.pseudonym}</span>
          <span className="text-xs font-normal text-white/70">{profile.age}</span>
        </p>
        <p className="truncate text-[11px] leading-tight text-white/70">
          {showGender && `${genderLabels[profile.gender] ?? profile.gender} · `}
          {profile.city} · {lookingForLabels[profile.lookingFor] ?? profile.lookingFor}
        </p>

        <button
          onClick={onAction}
          disabled={disabled}
          className={`pointer-events-auto mt-2.5 w-full rounded-full py-2 text-xs font-medium text-white backdrop-blur-md transition ${
            actionTone === "liked"
              ? "cursor-default bg-gold/80"
              : `bg-white/15 disabled:opacity-50 ${
                  actionTone === "danger" ? "hover:bg-danger" : "hover:bg-gold focus-visible:bg-gold"
                }`
          }`}
        >
          {actionLabel}
        </button>
      </div>
    </li>
  );
}
