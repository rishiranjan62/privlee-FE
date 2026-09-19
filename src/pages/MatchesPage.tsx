import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { MatchSummary } from "../lib/types";

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);

  useEffect(() => {
    api.getMatches().then(setMatches);
  }, []);

  if (!matches) {
    return <p className="text-center text-text-muted">Loading matches...</p>;
  }

  if (matches.length === 0) {
    return (
      <p className="text-center text-text-muted">
        No matches yet - keep browsing in Discover.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {matches.map((match) => (
        <li key={match.matchId}>
          <Link
            to={`/chat/${match.matchId}`}
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3 transition hover:border-accent"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-lg font-semibold text-text-muted">
              {match.otherUser.pseudonym.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{match.otherUser.pseudonym}</p>
              <p className="text-sm text-text-muted">{match.otherUser.city}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
