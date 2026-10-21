import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import ProfileTile from "../components/ProfileTile";
import SponsoredSlot from "../components/SponsoredSlot";
import { tileGrid } from "../lib/ui";
import type { MatchSummary } from "../lib/types";

function Header() {
  return (
    <header className="rise mb-10">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Matches</p>
      <h1 className="mt-3 font-display text-5xl font-medium leading-tight">
        The ones who <span className="gold-text italic">said yes too.</span>
      </h1>
    </header>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getMatches().then(setMatches);
  }, []);

  if (!matches) {
    return (
      <>
        <Header />
        <p className="py-12 text-center text-muted">Loading matches...</p>
      </>
    );
  }

  if (matches.length === 0) {
    return (
      <>
        <Header />
        <div className="rounded-3xl border border-dashed border-line bg-white/50 px-6 py-16 text-center">
          <p className="font-display text-2xl">No matches yet.</p>
          <p className="mt-2 text-sm text-muted">
            Say hello to a few people in Discover — when they say hello back, they land here.
          </p>
          <Link
            to="/discover"
            className="group relative mt-8 inline-block overflow-hidden rounded-full bg-ink px-8 py-3 font-medium text-canvas transition hover:-translate-y-0.5"
          >
            <span className="relative z-10">Browse Discover</span>
            <span className="absolute inset-0 -translate-x-full bg-gold transition-transform duration-500 ease-out group-hover:translate-x-0" />
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <ul className={tileGrid}>
        {matches.map((match) => (
          <ProfileTile
            key={match.matchId}
            profile={match.otherUser}
            to={`/messages/${match.matchId}`}
            actionLabel="View profile"
            onAction={() => navigate(`/u/${match.otherUser.userId}`)}
          />
        ))}
      </ul>
      <SponsoredSlot placement="MATCHES" className="mt-10" />
    </>
  );
}
