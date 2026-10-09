import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import type { AdminUserSummary } from "../lib/types";

export function StateBadge({ state }: { state: string }) {
  if (state === "ACTIVE") return <span className="text-xs text-muted">Active</span>;
  // Leaving is the person's own choice, not a sanction, so it is not drawn like one.
  if (state === "DELETED") {
    return (
      <span className="rounded border border-line bg-[#faf9f6] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">
        Deleted
      </span>
    );
  }
  return (
    <span className="rounded bg-danger px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">{state}</span>
  );
}

const filterTitles: Record<string, string> = {
  all: "All members",
  "active-today": "Active today",
  "new-week": "Joined this week",
  suspended: "Suspended",
  banned: "Banned",
  unverified: "Awaiting verification",
  deleted: "Deleted accounts",
};

export default function UsersPage() {
  const [params, setParams] = useSearchParams();
  // No filter and no search still shows people: everyone, newest first. A blank page after
  // clicking "Users" (or "back to Users") looked broken.
  const filter = params.get("filter") ?? "all";
  // The search term lives in the URL too, so coming back from a profile restores the same list.
  const term = params.get("q");
  const [q, setQ] = useState(term ?? "");
  const location = useLocation();
  const returnTo = location.pathname + location.search;
  const [rows, setRows] = useState<AdminUserSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    setRows(null);
    setFailed(false);
    (term ? api.searchUsers(term) : api.listUsers(filter))
      .then((r) => current && setRows(r))
      .catch(() => {
        if (!current) return;
        setRows([]);
        setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [filter, term]);

  function search(e: FormEvent) {
    e.preventDefault();
    const next = q.trim();
    setParams(next ? { q: next } : {});
  }

  function showEveryone() {
    setQ("");
    setParams({});
  }

  const title = term ? "Users" : (filterTitles[filter] ?? "Users");
  const searched = term ?? "";

  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted">
        {rows ? `${rows.length} shown` : "Loading..."} · Search by pseudonym, email, or paste a user id.
        {(term || filter !== "all") && (
          <>
            {" "}
            <button type="button" onClick={showEveryone} className="text-gold hover:underline">
              Show everyone
            </button>
          </>
        )}
      </p>

      <form onSubmit={search} className="mt-5 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          className="w-full max-w-md rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-gold"
        />
        <button className="rounded bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-gold">Search</button>
      </form>

      {rows !== null && rows.length === 0 && (
        <p className="mt-6 rounded-lg border border-dashed border-line bg-white/60 px-6 py-12 text-center text-muted">
          {failed ? (
            "Could not load this list. Is the server up to date?"
          ) : term ? (
            <>No one matches “{searched}”.</>
          ) : (
            "No one here right now."
          )}
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
                    <Link to={`/admin/users/${u.userId}`} state={{ from: returnTo }} className="font-medium text-gold hover:underline">Open</Link>
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
