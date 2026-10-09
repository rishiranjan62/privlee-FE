import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useStreamEvent } from "../context/StreamContext";
import type { Profile } from "../lib/types";
import DiscoverySection from "../components/DiscoverySection";

interface Sections {
  online: Profile[];
  nearby: Profile[];
  fresh: Profile[];
}

const HEARTBEAT_INTERVAL_MS = 60_000;

export default function DiscoverPage() {
  const [sections, setSections] = useState<Sections | null>(null);
  const [matchToast, setMatchToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([api.getOnline(), api.getNearby(), api.getNewMembers()])
      .then(([online, nearby, fresh]) => setSections({ online, nearby, fresh }))
      .catch(() => setError("Could not load profiles right now"));
  }, []);

  useEffect(load, [load]);

  // A granted photo, or a new match, changes what these tiles should show.
  useStreamEvent((event) => {
    if (
      event.type === "PHOTO_ACCESS_GRANTED" ||
      event.type === "PHOTO_ACCESS_REVOKED" ||
      event.type === "MATCH"
    ) {
      load();
    }
  });

  useEffect(() => {
    api.heartbeat().catch(() => {});
    const interval = setInterval(() => api.heartbeat().catch(() => {}), HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  function removeEverywhere(userId: string) {
    setSections((prev) =>
      prev && {
        online: prev.online.filter((p) => p.userId !== userId),
        nearby: prev.nearby.filter((p) => p.userId !== userId),
        fresh: prev.fresh.filter((p) => p.userId !== userId),
      },
    );
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
    removeEverywhere(userId);
  }

  if (error) {
    return (
      <p className="rounded-3xl border border-dashed border-line bg-white/50 px-6 py-12 text-center text-muted">
        {error}
      </p>
    );
  }

  if (!sections) {
    return <p className="py-12 text-center text-muted">Loading profiles...</p>;
  }

  return (
    <div>
      <header className="rise mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Discover</p>
        <h1 className="mt-3 font-display text-5xl font-medium leading-tight">
          Someone worth <span className="gold-text italic">knowing.</span>
        </h1>
      </header>

      {matchToast && (
        <div className="rise mb-8 flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-5 py-4 text-sm text-ink">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inset-0 rounded-full bg-gold [animation:pulse-ring_2s_ease-out_infinite]" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-gold" />
          </span>
          {matchToast}
        </div>
      )}

      <DiscoverySection
        title="Online now"
        subtitle="Active in the last few minutes"
        profiles={sections.online}
        emptyLabel="No one's online right now - check back soon."
        onLike={handleLike}
      />
      <DiscoverySection
        title="Nearby"
        subtitle="In your city"
        profiles={sections.nearby}
        emptyLabel="No one nearby yet."
        onLike={handleLike}
      />
      <DiscoverySection
        title="New here"
        subtitle="Recently joined"
        profiles={sections.fresh}
        emptyLabel="No new members yet."
        onLike={handleLike}
      />
    </div>
  );
}
