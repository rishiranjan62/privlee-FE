import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { ReportSummary } from "../lib/types";

export const reasonLabel: Record<string, string> = {
  FAKE_PROFILE: "Fake profile",
  SCAM: "Scam",
  HARASSMENT: "Harassment",
  UNDERAGE_SUSPICION: "Possible minor",
  BLACKMAIL_ATTEMPT: "Blackmail",
  OTHER: "Other",
};

function ago(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

export default function ReportsPage() {
  const [view, setView] = useState<"open" | "resolved">("open");
  const [rows, setRows] = useState<ReportSummary[] | null>(null);

  useEffect(() => {
    setRows(null);
    api.getReports(view).then(setRows).catch(() => setRows([]));
  }, [view]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="mt-1 text-sm text-muted">
        {view === "open"
          ? "Possible minors and blackmail come first, then oldest first."
          : "Most recently resolved first."}
      </p>

      <div className="mt-5 flex gap-2">
        {(["open", "resolved"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded px-4 py-1.5 text-sm capitalize transition ${
              view === v ? "bg-ink text-canvas" : "border border-line bg-white hover:border-gold"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {rows === null ? (
        <p className="py-10 text-center text-muted">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-line bg-white/60 px-6 py-14 text-center text-muted">
          {view === "open" ? "Queue is clear." : "Nothing resolved yet."}
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-[#faf9f6] text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Reason</th>
                <th className="px-4 py-2.5 font-medium">Reported</th>
                <th className="px-4 py-2.5 font-medium">By</th>
                <th className="px-4 py-2.5 font-medium">{view === "open" ? "Waiting" : "Outcome"}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-b border-line/60 last:border-b-0 ${r.priority ? "bg-[#fdf3f1]" : ""}`}>
                  <td className="px-4 py-2.5">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${r.priority ? "bg-danger text-white" : "bg-ink/5"}`}>
                      {reasonLabel[r.reason] ?? r.reason}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    {r.reportedPseudonym}
                    {r.otherOpenReports > 0 && (
                      <span className="ml-2 text-xs font-normal text-danger">+{r.otherOpenReports} other open</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{r.reporterPseudonym}</td>
                  <td className="px-4 py-2.5 text-muted">
                    {view === "open" ? ago(r.createdAt) : r.actionTaken ?? r.status}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link to={`/admin/reports/${r.id}`} className="font-medium text-gold hover:underline">
                      {view === "open" ? "Review" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
