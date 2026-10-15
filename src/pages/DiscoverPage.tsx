import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useStreamEvent } from "../context/StreamContext";
import type { Gender, Profile } from "../lib/types";
import DiscoverySection from "../components/DiscoverySection";
import LikeAllowanceNote from "../components/LikeAllowanceNote";
import { paidLikeQuestion, useLikeAllowance } from "../lib/useLikeAllowance";

interface Sections {
  online: Profile[];
  nearby: Profile[];
  fresh: Profile[];
}

/** While Discover is open and in view, the sections are re-fetched this often, so "Online now" does not go stale. */
const REFRESH_INTERVAL_MS = 120_000;

/** Plural, for the filter: "Women (12)". */
const GENDER_GROUPS: { value: Gender; label: string }[] = [
  { value: "FEMALE", label: "Women" },
  { value: "MALE", label: "Men" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "OTHER", label: "Other" },
];

export default function DiscoverPage() {
  const [sections, setSections] = useState<Sections | null>(null);
  const [matchToast, setMatchToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [likeError, setLikeError] = useState<string | null>(null);
  const allowance = useLikeAllowance();
  const [genderFilter, setGenderFilter] = useState<Gender | "ALL">("ALL");
  // Only someone who asked to see more than one gender needs them told apart; with one chosen there is nothing to sort.
  const [wantsSeveral, setWantsSeveral] = useState(false);
  useEffect(() => {
    api
      .getMyProfile()
      .then((me) => setWantsSeveral((me.interestedIn?.length ?? 0) > 1))
      .catch(() => {});
  }, []);

  // When what you are shown mixes genders (you asked for men and women, say), say so and let it be sorted.
  const groups = useMemo(() => {
    if (!sections || !wantsSeveral) return [];
    const everyone = new Map<string, Profile>();
    [...sections.online, ...sections.nearby, ...sections.fresh].forEach((p) => everyone.set(p.userId, p));
    const counts = GENDER_GROUPS.map((g) => ({
      ...g,
      count: [...everyone.values()].filter((p) => p.gender === g.value).length,
    })).filter((g) => g.count > 0);
    return counts.length > 1 ? counts : [];
  }, [sections, wantsSeveral]);
  const mixed = groups.length > 1;
  const active = mixed ? genderFilter : "ALL";
  const shown = useMemo(() => {
    if (!sections || active === "ALL") return sections;
    const keep = (list: Profile[]) => list.filter((p) => p.gender === active);
    return { online: keep(sections.online), nearby: keep(sections.nearby), fresh: keep(sections.fresh) };
  }, [sections, active]);

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

  // Who is online changes while this page sits open: fetch again on coming back to the tab, and every couple of minutes
  // while it is in view. A failed refresh keeps what is on screen instead of replacing it with an error.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      Promise.all([api.getOnline(), api.getNearby(), api.getNewMembers()])
        .then(([online, nearby, fresh]) => setSections({ online, nearby, fresh }))
        .catch(() => {});
    };
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  /** The like went through: the tile stays, and now says so (or offers the conversation, if it made a match). */
  function markLiked(userId: string, matchId: string | null) {
    const update = (list: Profile[]) =>
      list.map((p) => (p.userId === userId ? { ...p, likedByMe: true, matchId: matchId ?? p.matchId } : p));
    setSections((prev) => prev && { online: update(prev.online), nearby: update(prev.nearby), fresh: update(prev.fresh) });
  }

  async function handleLike(userId: string) {
    // A like that costs credits is never sent without asking first.
    const question = paidLikeQuestion(allowance);
    if (question && !window.confirm(question)) return;
    setLikeError(null);
    let matchId: string | null = null;
    try {
      const result = await api.like(userId);
      matchId = result.matchId ?? null;
      if (result.matched) {
        setMatchToast("It's a match! Say hello in your Matches tab.");
        setTimeout(() => setMatchToast(null), 4000);
      }
    } catch (err) {
      // Left on screen, since it was not liked: out of free likes and short of credits, for example.
      setLikeError(err instanceof Error ? err.message : "That like didn't go through.");
      return;
    }
    markLiked(userId, matchId);
  }

  if (error) {
    return (
      <p className="rounded-3xl border border-dashed border-line bg-white/50 px-6 py-12 text-center text-muted">
        {error}
      </p>
    );
  }

  if (!sections || !shown) {
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

      <LikeAllowanceNote allowance={allowance} />

      {likeError && (
        <p role="alert" className="mb-8 rounded-2xl border border-danger/30 bg-danger/10 px-5 py-3 text-sm text-danger">
          {likeError}
        </p>
      )}

      {matchToast && (
        <div className="rise mb-8 flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-5 py-4 text-sm text-ink">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inset-0 rounded-full bg-gold [animation:pulse-ring_2s_ease-out_infinite]" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-gold" />
          </span>
          {matchToast}
        </div>
      )}

      {mixed && (
        <div role="group" aria-label="Show" className="mb-10 flex flex-wrap gap-2">
          {[{ value: "ALL" as const, label: "Everyone", count: null }, ...groups].map((g) => (
            <button
              key={g.value}
              onClick={() => setGenderFilter(g.value)}
              aria-pressed={active === g.value}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                active === g.value
                  ? "border-ink bg-ink text-canvas"
                  : "border-line bg-white/60 text-muted hover:text-ink"
              }`}
            >
              {g.label}
              {g.count !== null && <span className="ml-1.5 opacity-70">{g.count}</span>}
            </button>
          ))}
        </div>
      )}

      <DiscoverySection
        title="Online now"
        subtitle="Active in the last few minutes"
        profiles={shown.online}
        showGender={mixed}
        emptyLabel="No one's online right now - check back soon."
        onLike={handleLike}
      />
      <DiscoverySection
        title="Nearby"
        subtitle="In your city"
        profiles={shown.nearby}
        showGender={mixed}
        emptyLabel="No one nearby yet."
        onLike={handleLike}
      />
      <DiscoverySection
        title="New here"
        subtitle="Recently joined"
        profiles={shown.fresh}
        showGender={mixed}
        emptyLabel="No new members yet."
        onLike={handleLike}
      />
    </div>
  );
}
