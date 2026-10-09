import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { AdminUserSummary } from "../lib/types";

export function StateBadge({ state }: { state: string }) {
  if (state === "ACTIVE") return <span className="text-xs text-muted">Active</span>;
  return (
    <span className="rounded bg-danger px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">{state}</span>
  );
}

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminUserSummary[] | null>(null);
  const [searched, setSearched] = useState("");

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setRows(null);
    setSearched(q.trim());
    setRows(await api.searchUsers(q.trim()).catch(() => []));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Users</h1>
      <p className="mt-1 text-sm text-muted">Search by pseudonym, email, or paste a user id.</p>

      <form onSubmit={search} className="mt-5 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          autoFocus
          className="w-full max-w-md rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-gold"
        />
        <button className="rounded bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-gold">Search</button>
      </form>

      {rows !== null && rows.length === 0 && (
        <p className="mt-6 rounded-lg border border-dashed border-line bg-white/60 px-6 py-12 text-center text-muted">
          No one matches “{searched}”.
        </p>
      )}
      {rows !== null && rows.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-[#faf9f6] text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Pseudonym</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                <th className="px-4 py-2.5 font-medium">Open reports</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.userId} className="border-b border-line/60 last:border-b-0">
                  <td className="px-4 py-2.5 font-medium">
                    {u.pseudonym}
                    {u.role === "ADMIN" && (
                      <span className="ml-2 rounded bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-white">ADMIN</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{u.email}</td>
                  <td className="px-4 py-2.5"><StateBadge state={u.accountState} /></td>
                  <td className="px-4 py-2.5 text-muted">{new Date(u.joinedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">{u.openReports > 0 ? <span className="text-danger">{u.openReports}</span> : "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link to={`/admin/users/${u.userId}`} className="font-medium text-gold hover:underline">Open</Link>
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
