import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AuditEntry } from "../lib/types";

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    api.getAuditLog().then(setEntries).catch(() => setEntries([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <p className="mt-1 text-sm text-muted">
        Every admin action, newest first. Entries cannot be edited or deleted.
      </p>

      {entries === null ? (
        <p className="py-10 text-center text-muted">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-line bg-white/60 px-6 py-12 text-center text-muted">
          Nothing recorded yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-[#faf9f6] text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Admin</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Target</th>
                <th className="px-4 py-2.5 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-line/60 last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">{e.adminEmail ?? <span className="text-muted">system</span>}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-xs">{e.action}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">
                    {e.targetType ? `${e.targetType} ${e.targetId?.slice(0, 8) ?? ""}` : "—"}
                  </td>
                  <td className="px-4 py-2.5">{e.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
