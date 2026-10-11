import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Profile } from "../lib/types";
import ProfileTile from "./ProfileTile";
import { tileGrid } from "../lib/ui";

// Two full rows on a wide screen before "View all" appears.
const PREVIEW_COUNT = 12;

interface Props {
  title: string;
  subtitle?: string;
  profiles: Profile[];
  emptyLabel: string;
  onLike: (userId: string) => void;
  showGender?: boolean;
}

export default function DiscoverySection({
  title,
  subtitle,
  profiles,
  emptyLabel,
  onLike,
  showGender = false,
}: Props) {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? profiles : profiles.slice(0, PREVIEW_COUNT);
  const hasMore = profiles.length > PREVIEW_COUNT;

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-medium leading-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {hasMore && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="shrink-0 text-sm font-medium text-gold transition hover:underline"
          >
            {showAll ? "Show less" : `View all (${profiles.length})`}
          </button>
        )}
      </div>

      {profiles.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line bg-white/50 px-6 py-10 text-center text-sm text-muted">
          {emptyLabel}
        </p>
      ) : (
        <ul className={tileGrid}>
          {visible.map((profile) => (
            <ProfileTile
              key={profile.userId}
              profile={profile}
              showGender={showGender}
              // Matches stay in the feed, so offer the conversation rather than a second like; someone already liked
              // stays too, and says so instead of offering to be liked again.
              actionLabel={profile.matchId ? "Message" : profile.likedByMe ? "♥  Liked" : "♥  Like"}
              actionTone={!profile.matchId && profile.likedByMe ? "liked" : "default"}
              disabled={!profile.matchId && Boolean(profile.likedByMe)}
              onAction={() =>
                profile.matchId
                  ? navigate(`/messages/${profile.matchId}`)
                  : profile.likedByMe
                    ? undefined
                    : onLike(profile.userId)
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}
