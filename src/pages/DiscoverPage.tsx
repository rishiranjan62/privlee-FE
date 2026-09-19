import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Profile } from "../lib/types";
import DiscoveryRow from "../components/DiscoveryRow";

export default function DiscoverPage() {
  const [feed, setFeed] = useState<Profile[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [matchToast, setMatchToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getFeed()
      .then(setFeed)
      .catch(() => setError("Could not load profiles right now"));
  }, []);

  function removeFromFeed(userId: string) {
    setFeed((prev) => (prev ? prev.filter((p) => p.userId !== userId) : prev));
    setExpandedId((current) => (current === userId ? null : current));
  }

  async function handleLike(userId: string) {
    try {
      const result = await api.like(userId);
      if (result.matched) {
        setMatchToast("It's a match! Say hello in your Matches tab.");
        setTimeout(() => setMatchToast(null), 4000);
      }
    } catch {
      // move on regardless - a failed like shouldn't block browsing
    }
    removeFromFeed(userId);
  }

  function handlePass(userId: string) {
    removeFromFeed(userId);
  }

  if (error) {
    return <p className="text-center text-text-muted">{error}</p>;
  }

  if (!feed) {
    return <p className="text-center text-text-muted">Loading profiles...</p>;
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-lg font-semibold">Nearby, quietly</h1>
      <p className="mb-4 text-sm text-text-muted">
        Tap someone to learn more before you say hello.
      </p>

      {matchToast && (
        <div className="mb-4 rounded-lg border border-accent bg-surface-raised px-4 py-3 text-sm text-accent-soft">
          {matchToast}
        </div>
      )}

      {feed.length === 0 ? (
        <p className="text-center text-text-muted">
          No more profiles nearby right now - check back soon.
        </p>
      ) : (
        <ul className="rounded-2xl border border-border bg-surface px-3">
          {feed.map((profile) => (
            <DiscoveryRow
              key={profile.userId}
              profile={profile}
              expanded={expandedId === profile.userId}
              onToggle={() =>
                setExpandedId((current) => (current === profile.userId ? null : profile.userId))
              }
              onLike={() => handleLike(profile.userId)}
              onPass={() => handlePass(profile.userId)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
