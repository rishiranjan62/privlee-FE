import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
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
  // The list this person was opened from (a card filter or a search), so "back" returns to it
  // rather than to the unfiltered list.
  const from = (useLocation().state as { from?: string } | null)?.from;
  const backTo = from?.startsWith("/admin/users") ? from : "/admin/users";
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [photos, setPhotos] = useState<AdminPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // photo removal
  const [removing, setRemoving] = useState<string | null>(null);
  const [rmReason, setRmReason] = useState("");
  const [rmMessage, setRmMessage] = useState("");

  // sanction
  const [minorReason, setMinorReason] = useState("");
  const [confirmingMinor, setConfirmingMinor] = useState(false);
  const [action, setAction] = useState<Exclude<ModerationActionCode, "DISMISS">>("WARN");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [days, setDays] = useState(7);
  const [confirming, setConfirming] = useState(false);
  const [reinstateReason, setReinstateReason] = useState("");
  const [busy, setBusy] = useState(false);

  // credits
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditNote, setCreditNote] = useState<string | null>(null);

  const load = useCallback(() => {
    if (id)
      api
        .getAdminUser(id)
        .then((u) => {
          setUser(u);
          // The only action that means anything for someone who has already left.
          if (u.accountState === "DELETED") setAction("BAN");
        })
        .catch(() => setError("Could not load this user"));
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

  async function giveCredits() {
    setBusy(true);
    setError(null);
    setCreditNote(null);
    try {
      const amount = Number(creditAmount);
      const balance = await api.grantCredits(user!.userId, amount, creditReason.trim());
      setCreditNote(`Gave ${amount.toLocaleString()} credits. Balance is now ${balance.toLocaleString()}.`);
      setCreditAmount("");
      setCreditReason("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not give credits");
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

  async function removeMinor() {
    setBusy(true);
    setError(null);
    try {
      await api.removeMinor(user!.userId, minorReason.trim());
      setConfirmingMinor(false);
      setMinorReason("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove this account");
    } finally {
      setBusy(false);
    }
  }

  const amountValid = /^\d+$/.test(creditAmount) && Number(creditAmount) >= 1 && Number(creditAmount) <= 10_000_000;
  const canGiveCredits = amountValid && creditReason.trim().length >= 5;
  const canHaveCredits = !isAdmin && user.accountState !== "DELETED";
  const canSanction = reason.trim().length >= 5 && message.trim().length > 0;

  return (
    <div>
      <Link to={backTo} className="text-sm text-muted hover:text-ink">← Users</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{user.pseudonym}</h1>
        <StateBadge state={user.accountState} />
        {isAdmin && <span className="rounded bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-white">ADMIN</span>}
      </div>
      {user.accountState === "DELETED" && (
        <p className="mt-2 text-sm text-muted">
          This member deleted their account{user.deletedAt ? ` on ${new Date(user.deletedAt).toLocaleDateString()}` : ""}.
          Their profile, photos and conversations are gone; their email and any reports remain. If they sign up
          again with this email they will be recognised, not treated as new.
        </p>
      )}
      {user.accountState !== "ACTIVE" && user.accountState !== "DELETED" && user.moderationMessage && (
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

      {canHaveCredits && (
        <section className="mt-4 rounded-lg border border-line bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Credits</h2>
          <p className="mt-2 text-sm">
            Balance: <span className="font-semibold tabular-nums">{user.creditBalance.toLocaleString()}</span>
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-muted">
              Credits to give
              <input
                inputMode="numeric"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="e.g. 500"
                className="w-36 rounded border border-line bg-white px-2.5 py-2 text-sm normal-case outline-none focus:border-gold"
              />
            </label>
            <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-xs font-medium uppercase tracking-wider text-muted">
              Reason (kept in the audit log, not shown to them)
              <input
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                maxLength={500}
                placeholder="e.g. Goodwill after a failed payment"
                className="rounded border border-line bg-white px-2.5 py-2 text-sm normal-case outline-none focus:border-gold"
              />
            </label>
            <button
              onClick={giveCredits}
              disabled={busy || !canGiveCredits}
              className="rounded bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-50"
            >
              Give credits
            </button>
          </div>
          {creditNote && <p className="mt-2 text-sm text-muted">{creditNote}</p>}
          <p className="mt-2 text-xs text-muted">Up to 10,000,000 at a time. They see it in their credit history as “Credits from Privlee”.</p>
        </section>
      )}

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

      {/* Only while there is still something to erase: their profile (and so their age) is still there. */}
      {!isAdmin && user.age !== null && (
        <section className="mt-4 rounded-lg border border-danger/40 bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-danger">Suspected minor</h2>
          <p className="mt-2 text-sm text-muted">
            If you believe this member is under 18, remove them. Their profile, photos, matches and conversations
            are <strong>erased immediately</strong> and the account is banned. Only the email is kept, so it cannot
            be used to rejoin. This cannot be undone.
          </p>
          <input
            value={minorReason}
            onChange={(e) => {
              setMinorReason(e.target.value);
              setConfirmingMinor(false);
            }}
            placeholder="Why you believe this (recorded in the audit log)"
            className="mt-3 w-full rounded border border-line px-3 py-2 text-sm"
          />
          {!confirmingMinor ? (
            <button
              onClick={() => setConfirmingMinor(true)}
              disabled={busy || minorReason.trim().length < 5}
              className="mt-2 rounded border border-danger px-4 py-1.5 text-sm text-danger transition hover:bg-danger hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-danger"
            >
              Remove as under 18...
            </button>
          ) : (
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={removeMinor}
                disabled={busy}
                className="rounded bg-danger px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Removing..." : "Yes, erase and ban"}
              </button>
              <button onClick={() => setConfirmingMinor(false)} className="text-sm text-muted hover:text-ink">
                Cancel
              </button>
            </div>
          )}
        </section>
      )}

      {!isAdmin && (
        <section className="mt-4 rounded-lg border border-line bg-white p-4">
          {user.accountState !== "ACTIVE" && user.accountState !== "DELETED" ? (
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
                {/* Warning or suspending someone who is not here means nothing; banning stops the address returning. */}
                {(user.accountState === "DELETED" ? ACTIONS.filter((a) => a.value === "BAN") : ACTIONS).map((a) => (
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
