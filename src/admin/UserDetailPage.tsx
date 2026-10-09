import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { reasonLabel } from "./ReportsPage";
import { StateBadge } from "./UsersPage";
import type { AdminPhoto, AdminUserDetail, ModerationActionCode } from "../lib/types";

const ACTIONS: { value: Exclude<ModerationActionCode, "DISMISS">; label: string; hint: string }[] = [
  { value: "WARN", label: "Warn", hint: "They receive your message as a notification." },
  { value: "SUSPEND", label: "Suspend", hint: "Locked out immediately, back automatically after the period." },
  { value: "BAN", label: "Ban", hint: "Permanent. Closes every open report against them." },
];

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [photos, setPhotos] = useState<AdminPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // photo removal
  const [removing, setRemoving] = useState<string | null>(null);
  const [rmReason, setRmReason] = useState("");
  const [rmMessage, setRmMessage] = useState("");

  // sanction
  const [action, setAction] = useState<Exclude<ModerationActionCode, "DISMISS">>("WARN");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [days, setDays] = useState(7);
  const [confirming, setConfirming] = useState(false);
  const [reinstateReason, setReinstateReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (id) api.getAdminUser(id).then(setUser).catch(() => setError("Could not load this user"));
  }, [id]);
  useEffect(load, [load]);

  if (error && !user) return <p className="py-10 text-center text-danger">{error}</p>;
  if (!user) return <p className="py-10 text-center text-muted">Loading...</p>;
  const isAdmin = user.role === "ADMIN";

  const facts: [string, string | number][] = [
    ["Email", user.email],
    ["Age / gender", user.age ? `${user.age} · ${user.gender?.toLowerCase()}` : "—"],
    ["City", user.city ?? "—"],
    ["Joined", new Date(user.joinedAt).toLocaleDateString()],
    ["Last active", user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : "—"],
    ["Has own password", user.passwordSet ? "Yes" : "No (Google sign-in)"],
    ["Reports against", `${user.reportsAgainst} (${user.openReportsAgainst} open)`],
    ["Reports filed", user.reportsFiled],
    ["Blocked by / has blocked", `${user.blocksReceived} / ${user.blocksMade}`],
  ];

  async function openPhotos() {
    setPhotos(await api.getAdminUserPhotos(user!.userId).catch(() => []));
  }

  async function removePhoto(photoId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.removeUserPhoto(user!.userId, photoId, rmReason.trim(), rmMessage.trim());
      setRemoving(null);
      setRmReason("");
      setRmMessage("");
      await openPhotos();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove that photo");
    } finally {
      setBusy(false);
    }
  }

  async function sanction() {
    setBusy(true);
    setError(null);
    try {
      await api.sanctionUser(user!.userId, {
        action,
        reason: reason.trim(),
        message: message.trim(),
        days: action === "SUSPEND" ? days : undefined,
      });
      setConfirming(false);
      setReason("");
      setMessage("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply that action");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  async function reinstate() {
    setBusy(true);
    try {
      await api.reinstateUser(user!.userId, reinstateReason.trim());
      setReinstateReason("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reinstate");
    } finally {
      setBusy(false);
    }
  }

  const canSanction = reason.trim().length >= 5 && message.trim().length > 0;

  return (
    <div>
      <Link to="/admin/users" className="text-sm text-muted hover:text-ink">← Users</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{user.pseudonym}</h1>
        <StateBadge state={user.accountState} />
        {isAdmin && <span className="rounded bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-white">ADMIN</span>}
      </div>
      {user.accountState !== "ACTIVE" && user.moderationMessage && (
        <p className="mt-2 text-sm text-danger">
          {user.accountState === "SUSPENDED" && user.suspendedUntil
            ? `Suspended until ${new Date(user.suspendedUntil).toLocaleDateString()}. `
            : ""}
          They were told: “{user.moderationMessage}”
        </p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Account</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            {facts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          {user.bio && <p className="mt-3 border-t border-line/60 pt-3 text-sm italic text-muted">“{user.bio}”</p>}
        </section>

        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Reports against them</h2>
          {user.recentReports.length === 0 ? (
            <p className="mt-3 text-sm text-muted">None.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {user.recentReports.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  <span>
                    <span className={r.priority ? "font-semibold text-danger" : ""}>{reasonLabel[r.reason] ?? r.reason}</span>
                    <span className="ml-2 text-xs text-muted">{r.status === "OPEN" ? "open" : r.actionTaken ?? r.status.toLowerCase()}</span>
                  </span>
                  <Link to={`/admin/reports/${r.id}`} className="text-gold hover:underline">View</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-4 rounded-lg border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Photos ({user.photoCount})</h2>
          {photos === null && user.photoCount > 0 && (
            <button onClick={openPhotos} className="rounded border border-line px-3 py-1 text-sm transition hover:border-gold">
              Review photos
            </button>
          )}
        </div>
        {photos === null ? (
          <p className="mt-2 text-sm text-muted">
            {user.photoCount === 0 ? "No photos." : "Shown as the real image, not blurred. Opening them is recorded in the audit log."}
          </p>
        ) : photos.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No photos.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              <li key={p.photoId} className="overflow-hidden rounded-lg border border-line">
                <img src={p.url} alt="" className="aspect-square w-full object-cover" />
                <div className="p-2 text-xs">
                  <p className="text-muted">
                    {p.primary ? "Main · " : ""}{p.visibleToEveryone ? "Public" : "Blurred to others"}
                  </p>
                  {removing === p.photoId ? (
                    <div className="mt-2 space-y-1.5">
                      <input value={rmReason} onChange={(e) => setRmReason(e.target.value)} placeholder="Internal reason"
                        className="w-full rounded border border-line px-2 py-1" />
                      <input value={rmMessage} onChange={(e) => setRmMessage(e.target.value)} placeholder="Message to them"
                        className="w-full rounded border border-line px-2 py-1" />
                      <div className="flex gap-1.5">
                        <button onClick={() => setRemoving(null)} className="flex-1 rounded border border-line py-1">Cancel</button>
                        <button
                          disabled={busy || rmReason.trim().length < 5 || !rmMessage.trim()}
                          onClick={() => removePhoto(p.photoId)}
                          className="flex-1 rounded bg-danger py-1 font-medium text-white disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    !isAdmin && (
                      <button onClick={() => setRemoving(p.photoId)} className="mt-1 text-danger hover:underline">
                        Remove photo
                      </button>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {photos !== null && photos.length > 0 && (
          <p className="mt-3 text-xs text-muted">Removing hides a photo from everyone but keeps the file, in case it has to be preserved or reported.</p>
        )}
      </section>

      {!isAdmin && (
        <section className="mt-4 rounded-lg border border-line bg-white p-4">
          {user.accountState !== "ACTIVE" ? (
            <>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Reinstate</h2>
              <input value={reinstateReason} onChange={(e) => setReinstateReason(e.target.value)}
                placeholder="Reason (recorded in the audit log)"
                className="mt-3 w-full rounded border border-line px-3 py-2 text-sm" />
              <button onClick={reinstate} disabled={busy || reinstateReason.trim().length < 5}
                className="mt-2 rounded border border-line px-4 py-1.5 text-sm transition hover:border-gold disabled:opacity-40">
                Reinstate this account
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Act on this account</h2>
              <div className="mt-3 flex gap-2">
                {ACTIONS.map((a) => (
                  <button key={a.value} onClick={() => setAction(a.value)}
                    className={`rounded px-4 py-1.5 text-sm transition ${
                      action === a.value ? (a.value === "BAN" ? "bg-danger text-white" : "bg-ink text-canvas") : "border border-line hover:border-gold"
                    }`}>
                    {a.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">{ACTIONS.find((a) => a.value === action)?.hint}</p>
              {action === "SUSPEND" && (
                <label className="mt-3 block text-sm">
                  Days (1–90)
                  <input type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))}
                    className="ml-3 w-20 rounded border border-line px-2 py-1" />
                </label>
              )}
              <label className="mt-3 block text-sm">
                Message to the person <span className="text-muted">(they will read this)</span>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={2}
                  className="mt-1 w-full rounded border border-line px-3 py-2" />
              </label>
              <label className="mt-3 block text-sm">
                Reason <span className="text-muted">(internal, audit log only)</span>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={2}
                  className="mt-1 w-full rounded border border-line px-3 py-2" />
              </label>
              {!confirming ? (
                <button disabled={!canSanction} onClick={() => setConfirming(true)}
                  className="mt-4 rounded bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-40">
                  Continue
                </button>
              ) : (
                <div className="mt-4 flex items-center gap-3 rounded border border-danger/40 bg-[#fdf3f1] p-3 text-sm">
                  <span className="flex-1">
                    {action === "WARN" ? "Warn" : action === "SUSPEND" ? `Suspend for ${days} day(s)` : "Permanently ban"}{" "}
                    <strong>{user.pseudonym}</strong>? This is recorded under your name.
                  </span>
                  <button onClick={() => setConfirming(false)} className="rounded border border-line bg-white px-3 py-1.5">Back</button>
                  <button disabled={busy} onClick={sanction} className="rounded bg-danger px-4 py-1.5 font-medium text-white disabled:opacity-60">
                    {busy ? "Working..." : "Confirm"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <section className="mt-4 rounded-lg border border-line bg-white p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">What's been done to this account</h2>
        {user.history.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {user.history.map((h) => (
              <li key={h.id} className="flex flex-wrap gap-x-3">
                <span className="font-mono text-xs text-muted">{new Date(h.createdAt).toLocaleString()}</span>
                <span className="rounded bg-ink/5 px-1.5 font-mono text-xs">{h.action}</span>
                <span className="text-muted">{h.adminEmail ?? "system"}</span>
                {h.reason && <span>— {h.reason}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
