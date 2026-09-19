import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Profile } from "../lib/types";
import ProfileCard from "../components/ProfileCard";

export default function DiscoverPage() {
  const [feed, setFeed] = useState<Profile[] | null>(null);
  const [index, setIndex] = useState(0);
  const [matchToast, setMatchToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getFeed()
      .then(setFeed)
      .catch(() => setError("Could not load profiles right now"));
  }, []);

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
    setIndex((i) => i + 1);
  }

  function handlePass() {
    setIndex((i) => i + 1);
  }

  if (error) {
    return <p className="text-center text-text-muted">{error}</p>;
  }

  if (!feed) {
    return <p className="text-center text-text-muted">Loading profiles...</p>;
  }

  const current = feed[index];

  return (
    <div>
      {matchToast && (
        <div className="mb-4 rounded-lg border border-accent bg-surface-raised px-4 py-3 text-sm text-accent-soft">
          {matchToast}
        </div>
      )}
      {current ? (
        <div className="mx-auto max-w-sm">
          <ProfileCard profile={current} />
          <div className="mt-4 flex justify-center gap-4">
            <button
              onClick={handlePass}
              className="rounded-full border border-border px-6 py-2.5 text-text-muted transition hover:border-danger hover:text-danger"
            >
              Pass
            </button>
            <button
              onClick={() => handleLike(current.userId)}
              className="rounded-full bg-accent px-6 py-2.5 font-medium text-ink transition hover:bg-accent-soft"
            >
              Like
            </button>
          </div>
        </div>
      ) : (
        <p className="text-center text-text-muted">
          No more profiles nearby right now - check back soon.
        </p>
      )}
    </div>
  );
}
