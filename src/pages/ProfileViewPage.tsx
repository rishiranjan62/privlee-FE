import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import PhotoGallery from "../components/PhotoGallery";
import PrivateAlbumSection from "../components/PrivateAlbumSection";
import ProfileActionsMenu from "../components/ProfileActionsMenu";
import { useStreamEvent } from "../context/StreamContext";
import LikeAllowanceNote from "../components/LikeAllowanceNote";
import { paidLikeQuestion, useLikeAllowance } from "../lib/useLikeAllowance";
import { tintFor } from "../lib/avatar";
import { inputClass } from "../lib/ui";
import { cardClass } from "../lib/ui";
import {
  availabilityLabels,
  discretionLabels,
  drinkingLabels,
  lookingForLabels,
  relationshipLabels,
  smokingLabels,
} from "../lib/labels";
import type { Profile } from "../lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={`${cardClass} p-7`}>
      <h2 className="font-display text-2xl font-medium">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Tags({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => (
        <span
          key={t}
          className="rounded-full border border-line bg-white/70 px-4 py-1.5 text-sm"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

export default function ProfileViewPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Returns to wherever the user came from - Discover, Matches, Likes, a notification.
   * React Router marks the first entry of a session with key "default", so a profile opened
   * directly by URL has nothing to go back to and falls back to Discover rather than leaving
   * the app entirely.
   */
  function goBack() {
    if (location.key === "default") {
      navigate("/discover");
    } else {
      navigate(-1);
    }
  }
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [likeError, setLikeError] = useState<string | null>(null);
  const allowance = useLikeAllowance();
  // Writing to someone you have not matched with: what it costs, and the note being written.
  const [startCost, setStartCost] = useState<number | null>(null);
  const [photoCost, setPhotoCost] = useState<number | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [note, setNote] = useState("");
  const [messaging, setMessaging] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [askState, setAskState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [matched, setMatched] = useState(false);

  const load = useCallback(
    (showSpinner = true) => {
      if (!userId) return;
      if (showSpinner) setProfile(null);
      setError(null);
      api
        .getProfileById(userId)
        .then(setProfile)
        .catch((err) => setError(err instanceof Error ? err.message : "Could not load that profile"));
    },
    [userId],
  );

  useEffect(() => load(), [load]);

  // Photo permission changes alter which image file the server will serve us, so the profile has
  // to be asked again - the blurred copy we already hold cannot become the original on its own.
  useStreamEvent((event) => {
    if (
      event.type === "PHOTO_ACCESS_GRANTED" ||
      event.type === "PHOTO_ACCESS_REVOKED" ||
      event.type === "PRIVATE_ACCESS_GRANTED" ||
      event.type === "PRIVATE_ACCESS_REVOKED" ||
      event.type === "MATCH"
    ) {
      load(false);
    }
  });

  async function askForPhotos() {
    if (!userId) return;
    setAskState("sending");
    setAskError(null);
    try {
      await api.requestPhotoAccess(userId);
      setAskState("sent");
    } catch (err) {
      // The server's words matter here: "You need 50 credits and have 10" is something they can act on.
      setAskError(err instanceof Error ? err.message : null);
      setAskState("error");
    }
  }

  useEffect(() => {
    api.getStartPricing().then((p) => setStartCost(p.textCost)).catch(() => setStartCost(null));
    api.getPhotoRequestCost().then(setPhotoCost).catch(() => setPhotoCost(null));
  }, []);

  async function sendNote() {
    if (!userId || messaging || !note.trim()) return;
    setMessaging(true);
    setMessageError(null);
    try {
      const started = await api.messageMember(userId, note.trim());
      navigate(`/messages/${started.matchId}`);
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : "That message didn't send.");
      setMessaging(false);
    }
  }

  async function sayHello() {
    if (!userId) return;
    const question = paidLikeQuestion(allowance);
    if (question && !window.confirm(question)) return;
    setLikeError(null);
    setActing(true);
    try {
      const result = await api.like(userId);
      if (result.matched) {
        setMatched(true);
        return;
      }
      navigate("/discover");
    } catch (err) {
      setLikeError(err instanceof Error ? err.message : "That like didn't go through.");
      setActing(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-white/50 px-6 py-16 text-center">
        <p className="font-display text-2xl">{error}</p>
        <Link to="/discover" className="mt-6 inline-block text-sm font-medium text-gold hover:underline">
          Back to Discover
        </Link>
      </div>
    );
  }

  if (!profile) {
    return <p className="py-16 text-center text-muted">Loading profile...</p>;
  }

  const lifestyle = [
    profile.smoking && smokingLabels[profile.smoking],
    profile.drinking && drinkingLabels[profile.drinking],
    profile.discretionLevel && discretionLabels[profile.discretionLevel],
  ].filter((v): v is string => Boolean(v));

  const primaryPhoto = profile.photos.find((p) => p.primary) ?? profile.photos[0];
  const hasAnyExtras =
    profile.interests.length > 0 ||
    lifestyle.length > 0 ||
    profile.availability.length > 0 ||
    profile.wantsInConnection ||
    profile.dislikes;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button onClick={goBack} className="text-sm text-muted transition hover:text-ink">
          ← Back
        </button>
        <ProfileActionsMenu
          userId={profile.userId}
          pseudonym={profile.pseudonym}
          matchId={profile.matchId ?? profile.conversationId}
        />
      </div>

      <header className="rise flex flex-wrap items-center gap-6">
        <span
          className={`flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br font-display text-4xl font-medium text-white/90 ${tintFor(
            profile.pseudonym,
          )}`}
        >
          {primaryPhoto ? (
            <img
              src={primaryPhoto.url}
              alt=""
              className={`h-full w-full object-cover ${primaryPhoto.blurred ? "blur-md" : ""}`}
            />
          ) : (
            profile.pseudonym.charAt(0).toUpperCase()
          )}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-5xl font-medium leading-tight">{profile.pseudonym}</h1>
          <p className="mt-2 text-muted">
            {profile.age} · {profile.city} · {relationshipLabels[profile.relationshipStatus]}
          </p>
          <p className="mt-3 inline-block rounded-full bg-gold/15 px-4 py-1.5 text-sm font-medium text-gold">
            {lookingForLabels[profile.lookingFor] ?? profile.lookingFor}
          </p>
        </div>
      </header>

      {profile.photos.length > 0 && primaryPhoto?.blurred && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-white/60 px-6 py-5">
          <p className="text-sm text-muted">
            {askState === "sent" || profile.photoAccess === "PENDING"
              ? `${profile.pseudonym} has been asked. You'll see their photos if they say yes.`
              : `${profile.pseudonym}'s photos are blurred. You can ask to see them${photoCost ? `, for ${photoCost} credits (not returned if they say no)` : ""}.`}
          </p>
          {askState !== "sent" && profile.photoAccess !== "PENDING" && (
            <button
              onClick={askForPhotos}
              disabled={askState === "sending"}
              className="shrink-0 rounded-full border border-line bg-white px-5 py-2 text-sm font-medium text-gold transition hover:border-gold disabled:opacity-60"
            >
              {askState === "sending" ? "Asking..." : photoCost ? `Ask to see photos · ${photoCost} credits` : "Ask to see photos"}
            </button>
          )}
        </div>
      )}
      {askState === "error" && (
        <p className="text-sm text-danger">{askError ?? "Could not send that request. Try again."}</p>
      )}
      {profile.photoAccess === "APPROVED" && profile.photos.length > 0 && (
        <p className="text-sm italic text-muted">
          {profile.pseudonym} let you see their photos.
        </p>
      )}

      {/* Everything you may see: all the photos, not only the main one. */}
      {profile.photos.length > 1 && (
        <Section title="Photos">
          <PhotoGallery photos={profile.photos} label={`${profile.pseudonym}'s photos`} />
        </Section>
      )}

      {profile.privateAlbum && (
        <PrivateAlbumSection
          ownerId={profile.userId}
          pseudonym={profile.pseudonym}
          album={profile.privateAlbum}
          onChanged={() => load(false)}
        />
      )}

      {profile.bio && <Section title="About">{<p className="leading-relaxed">{profile.bio}</p>}</Section>}

      {profile.interests.length > 0 && (
        <Section title="Interests">
          <Tags items={profile.interests} />
        </Section>
      )}

      {lifestyle.length > 0 && (
        <Section title="Lifestyle">
          <Tags items={lifestyle} />
        </Section>
      )}

      {profile.availability.length > 0 && (
        <Section title="Usually free">
          <Tags items={profile.availability.map((a) => availabilityLabels[a] ?? a)} />
        </Section>
      )}

      {profile.wantsInConnection && (
        <Section title="Hoping to find">
          <p className="leading-relaxed">{profile.wantsInConnection}</p>
        </Section>
      )}

      {profile.dislikes && (
        <Section title="Deal-breakers">
          <p className="leading-relaxed">{profile.dislikes}</p>
        </Section>
      )}

      {!profile.bio && !hasAnyExtras && (
        <p className="rounded-3xl border border-dashed border-line bg-white/50 px-6 py-12 text-center text-muted">
          {profile.pseudonym} hasn't filled in their profile yet.
        </p>
      )}

      {matched ? (
        <div className="rounded-3xl border border-gold/40 bg-gold/10 px-6 py-8 text-center">
          <p className="font-display text-3xl">It's a match.</p>
          <Link
            to="/matches"
            className="mt-5 inline-block rounded-full bg-ink px-8 py-3 font-medium text-canvas transition hover:-translate-y-0.5"
          >
            Say hello in Matches
          </Link>
        </div>
      ) : (
        <>
        {!profile.matchId && <LikeAllowanceNote allowance={allowance} />}
        {likeError && (
          <p role="alert" className="mb-4 rounded-2xl border border-danger/30 bg-danger/10 px-5 py-3 text-sm text-danger">
            {likeError}
          </p>
        )}
        {composing && !profile.matchId && !profile.conversationId && (
          <div className={`${cardClass} mb-4 p-5`}>
            <label htmlFor="cold-note" className="mb-2 block text-sm text-muted">
              Write to {profile.pseudonym}. You haven't matched, so this costs {startCost} credits, and so does each
              message you send before they reply.
            </label>
            <textarea
              id="cold-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              rows={3}
              className={inputClass}
              placeholder="Say something kind..."
            />
            {messageError && (
              <p role="alert" className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
                {messageError}{" "}
                <Link to="/credits" className="underline">
                  Get credits
                </Link>
              </p>
            )}
            <div className="mt-3 flex gap-3">
              <button
                onClick={sendNote}
                disabled={messaging || !note.trim()}
                className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-50"
              >
                {messaging ? "Sending..." : `Send for ${startCost} credits`}
              </button>
              <button
                onClick={() => setComposing(false)}
                className="rounded-full border border-line bg-white/70 px-5 py-2.5 text-sm text-muted transition hover:border-gold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="sticky bottom-4 flex flex-wrap gap-3">
          {profile.matchId ? (
            <Link
              to={`/messages/${profile.matchId}`}
              className="flex-1 rounded-full bg-ink px-6 py-3.5 text-center font-medium text-canvas shadow-[0_18px_40px_-14px_rgba(29,26,22,0.6)] transition hover:-translate-y-0.5 hover:bg-gold"
            >
              Message
            </Link>
          ) : (
          <button
            onClick={sayHello}
            disabled={acting}
            className="group relative flex-1 overflow-hidden rounded-full bg-ink px-6 py-3.5 font-medium text-canvas shadow-[0_18px_40px_-14px_rgba(29,26,22,0.6)] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            <span className="relative z-10">♥  Like</span>
            <span className="absolute inset-0 -translate-x-full bg-gold transition-transform duration-500 ease-out group-hover:translate-x-0" />
          </button>
          )}
          {!profile.matchId &&
            (profile.conversationId ? (
              <Link
                to={`/messages/${profile.conversationId}`}
                className="rounded-full border border-line bg-white/70 px-7 py-3.5 text-ink backdrop-blur transition hover:border-gold"
              >
                Open conversation
              </Link>
            ) : (
              startCost !== null && (
                <button
                  onClick={() => setComposing((v) => !v)}
                  className="rounded-full border border-line bg-white/70 px-7 py-3.5 text-ink backdrop-blur transition hover:border-gold"
                >
                  Message · {startCost} credits
                </button>
              )
            ))}
          <button
            onClick={goBack}
            className="rounded-full border border-line bg-white/70 px-7 py-3.5 text-muted backdrop-blur transition hover:border-danger hover:text-danger"
          >
            Not now
          </button>
        </div>
        </>
      )}
    </div>
  );
}
