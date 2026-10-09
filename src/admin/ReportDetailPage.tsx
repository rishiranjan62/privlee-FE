import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { reasonLabel } from "./ReportsPage";
import type { EvidenceResponse, ModerationActionCode, ReportDetail, ReportPerson } from "../lib/types";

const ACTIONS: { value: ModerationActionCode; label: string; hint: string }[] = [
  { value: "DISMISS", label: "Dismiss", hint: "Nothing to act on. The person is not told anything." },
  { value: "WARN", label: "Warn", hint: "They receive your message as a notification." },
  { value: "SUSPEND", label: "Suspend", hint: "Locked out immediately, back automatically after the period." },
  { value: "BAN", label: "Ban", hint: "Permanent. Closes every other open report against them." },
];

function Facts({ title, p }: { title: string; p: ReportPerson }) {
  const rows: [string, string | number | null][] = [
    ["Email", p.email],
    ["Age / city", p.age ? `${p.age} · ${p.city ?? "—"}` : "—"],
    ["Joined", new Date(p.joinedAt).toLocaleDateString()],
    ["Photos", p.photoCount],
    ["Reports against", `${p.reportsAgainst} (${p.openReportsAgainst} open)`],
    ["Reports filed", p.reportsFiled],
    ["Blocked by", p.blocksReceived],
  ];
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>
        {p.accountState !== "ACTIVE" && (
          <span className="rounded bg-danger px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
            {p.accountState}
          </span>
        )}
      </div>
      <p className="mt-1 text-lg font-semibold">
        <Link to={`/admin/users/${p.userId}`} className="hover:text-gold hover:underline">{p.pseudonym}</Link>
      </p>
      <dl className="mt-3 space-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
      {p.bio && <p className="mt-3 border-t border-line/60 pt-3 text-sm italic text-muted">“{p.bio}”</p>}
    </section>
  );
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);
  const [action, setAction] = useState<ModerationActionCode>("DISMISS");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [days, setDays] = useState(7);
  const [confirming, setConfirming] = useState(false);
  const [reinstateReason, setReinstateReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (id) api.getReport(id).then(setReport).catch(() => navigate("/admin/reports"));
  }, [id, navigate]);
  useEffect(load, [load]);

  if (!report) return <p className="py-10 text-center text-muted">Loading...</p>;

  const open = report.status === "OPEN";
  const needsMessage = action === "WARN" || action === "SUSPEND" || action === "BAN";
  const canSubmit = reason.trim().length >= 5 && (!needsMessage || message.trim().length > 0);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.resolveReport(report!.id, {
        action,
        reason: reason.trim(),
        message: needsMessage ? message.trim() : undefined,
        days: action === "SUSPEND" ? days : undefined,
      });
      navigate("/admin/reports");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resolve this report");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  async function reinstate() {
    try {
      await api.reinstateUser(report!.reported.userId, reinstateReason.trim());
      setReinstateReason("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reinstate");
    }
  }

  return (
    <div>
      <Link to="/admin/reports" className="text-sm text-muted hover:text-ink">← Reports</Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{reasonLabel[report.reason] ?? report.reason}</h1>
        {report.priority && (
          <span className="rounded bg-danger px-2 py-0.5 text-xs font-semibold uppercase text-white">Priority</span>
        )}
        <span className="text-sm text-muted">Filed {new Date(report.createdAt).toLocaleString()}</span>
      </div>

      {report.details && (
        <blockquote className="mt-4 rounded-lg border-l-4 border-gold bg-white p-4 text-sm">
          {report.details}
        </blockquote>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Facts title="Reported" p={report.reported} />
        <Facts title="Reporter" p={report.reporter} />
      </div>

      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Conversation</h2>
          {evidence === null && (
            <button
              disabled={!report.conversationAvailable}
              onClick={() => api.getReportConversation(report.id).then(setEvidence)}
              className="rounded border border-line px-3 py-1 text-sm transition hover:border-gold disabled:opacity-40"
            >
              Open conversation
            </button>
          )}
        </div>
        {evidence === null ? (
          <p className="mt-2 text-sm text-muted">
            {report.conversationAvailable
              ? "Private messages are not shown by default. Opening them is recorded in the audit log."
              : "These two never had a conversation on record."}
          </p>
        ) : evidence.messages.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No messages.</p>
        ) : (
          <>
            <p className="mt-2 rounded bg-[#faf9f6] px-3 py-2 text-xs text-muted">
              {evidence.source === "SNAPSHOT"
                ? `Preserved copy, last captured ${new Date(evidence.capturedAt!).toLocaleString()}. It stays readable even if either person has blocked or unmatched since.`
                : "Live conversation. No copy was preserved, so it disappears if either person blocks or unmatches."}
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {evidence.messages.map((m, i) => (
                <li key={i} className={m.fromReportedUser ? "text-danger" : ""}>
                  <span className="font-medium">{m.senderPseudonym}:</span>{" "}
                  {m.type === "TEXT" ? m.content : `[${m.type.toLowerCase()}${m.gift ? ` · ${m.gift}` : ""}] ${m.content}`}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {open ? (
        <section className="mt-5 rounded-lg border border-line bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Decision</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <button
                key={a.value}
                onClick={() => setAction(a.value)}
                className={`rounded px-4 py-1.5 text-sm transition ${
                  action === a.value
                    ? a.value === "BAN" ? "bg-danger text-white" : "bg-ink text-canvas"
                    : "border border-line hover:border-gold"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{ACTIONS.find((a) => a.value === action)?.hint}</p>

          {action === "SUSPEND" && (
            <label className="mt-3 block text-sm">
              Days (1–90)
              <input
                type="number" min={1} max={90} value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="ml-3 w-20 rounded border border-line px-2 py-1"
              />
            </label>
          )}
          {needsMessage && (
            <label className="mt-3 block text-sm">
              Message to the person <span className="text-muted">(they will read this)</span>
              <textarea
                value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={2}
                className="mt-1 w-full rounded border border-line px-3 py-2"
              />
            </label>
          )}
          <label className="mt-3 block text-sm">
            Reason <span className="text-muted">(internal, audit log only — never shown to them)</span>
            <textarea
              value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={2}
              className="mt-1 w-full rounded border border-line px-3 py-2"
            />
          </label>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          {!confirming ? (
            <button
              disabled={!canSubmit}
              onClick={() => setConfirming(true)}
              className="mt-4 rounded bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <div className="mt-4 flex items-center gap-3 rounded border border-danger/40 bg-[#fdf3f1] p-3 text-sm">
              <span className="flex-1">
                {action === "DISMISS" ? "Dismiss" : action === "WARN" ? "Warn" : action === "SUSPEND" ? `Suspend for ${days} day(s)` : "Permanently ban"}{" "}
                <strong>{report.reported.pseudonym}</strong>? This is recorded under your name.
              </span>
              <button onClick={() => setConfirming(false)} className="rounded border border-line bg-white px-3 py-1.5">Back</button>
              <button disabled={busy} onClick={submit} className="rounded bg-danger px-4 py-1.5 font-medium text-white disabled:opacity-60">
                {busy ? "Working..." : "Confirm"}
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-5 rounded-lg border border-line bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Resolution</h2>
          {report.resolution && (
            <p className="mt-2 text-sm">
              <strong>{report.resolution.actionTaken}</strong> by {report.resolution.reviewedByEmail} on{" "}
              {new Date(report.resolution.resolvedAt).toLocaleString()}
              <span className="mt-1 block text-muted">{report.resolution.note}</span>
            </p>
          )}
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          {report.reported.accountState !== "ACTIVE" && (
            <div className="mt-4 border-t border-line/60 pt-4">
              <label className="block text-sm">
                Reinstate this account <span className="text-muted">(reason is recorded in the audit log)</span>
                <input
                  value={reinstateReason}
                  onChange={(e) => setReinstateReason(e.target.value)}
                  className="mt-1 w-full rounded border border-line px-3 py-2"
                />
              </label>
              <button
                onClick={reinstate}
                disabled={reinstateReason.trim().length < 5}
                className="mt-2 rounded border border-line px-4 py-1.5 text-sm transition hover:border-gold disabled:opacity-40"
              >
                Reinstate
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
