import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { genderLabels } from "../lib/labels";
import type { AdminUserSummary, UserFacets } from "../lib/types";

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

/** The numbers on the analytics page that open this list, by what the list holds. */
const eventTitles: Record<string, string> = {
  members: "Total members",
  joined: "New members",
  active: "Active members",
  deleted: "Accounts deleted",
  returned: "Members who came back",
  likers: "Members who sent likes",
  messagers: "Members who sent messages",
  uploaders: "Members who uploaded photos",
  matched: "Members who matched",
};

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "deleted", label: "Deleted" },
  { value: "any", label: "Active and deleted" },
];

const field = "rounded border border-line bg-white px-2.5 py-2 text-sm outline-none focus:border-gold";

/** Mirrors the server: what the list shows when nobody picked a status. */
function defaultStatus(filter: string | null, term: string | null, event: string | null): string {
  if (term || event) return "any";
  if (filter === "deleted") return "deleted";
  if (filter === "banned") return "any";
  return "active";
}

export default function UsersPage() {
  const [params, setParams] = useSearchParams();
  // No filter and no search still shows people: everyone, newest first. A blank page after
  // clicking "Users" (or "back to Users") looked broken.
  const filter = params.get("filter") ?? (params.get("event") ? null : "all");
  // Everything the list is narrowed by lives in the URL, so coming back from a profile restores the same list.
  const term = params.get("q");
  const event = params.get("event");
  const from = params.get("from");
  const until = params.get("until");
  const gender = params.get("gender") ?? "";
  const city = params.get("city") ?? "";
  const status = params.get("status") ?? defaultStatus(filter, term, event);
  const [q, setQ] = useState(term ?? "");
  const location = useLocation();
  const returnTo = location.pathname + location.search;
  const [rows, setRows] = useState<AdminUserSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [facets, setFacets] = useState<UserFacets | null>(null);

  useEffect(() => {
    api.getUserFacets().then(setFacets).catch(() => setFacets({ cities: [] }));
  }, []);

  useEffect(() => {
    let current = true;
    setRows(null);
    setFailed(false);
    api
      .listUsers({
        q: term ?? undefined,
        filter: filter ?? undefined,
        status: status as "active" | "deleted" | "any",
        gender,
        city,
        event: event ?? undefined,
        from: from ?? undefined,
        until: until ?? undefined,
      })
      .then((r) => current && setRows(r))
      .catch(() => {
        if (!current) return;
        setRows([]);
        setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [filter, term, status, gender, city, event, from, until]);

  /** Changes one URL parameter and keeps the rest. */
  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  function search(e: FormEvent) {
    e.preventDefault();
    set("q", q.trim());
  }

  function showEveryone() {
    setQ("");
    setParams({});
  }

  const title = event ? (eventTitles[event] ?? "Users") : term ? "Users" : (filterTitles[filter ?? "all"] ?? "Users");
  const searched = term ?? "";
  const narrowed = Boolean(term || event || gender || city || (filter && filter !== "all") || params.get("status"));
  // A deleted account has no profile left, so a gender or city can only ever match people who are still here.
  const profileFilter = Boolean(gender || city);

  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted">
        {rows ? `${rows.length} shown` : "Loading..."}
        {event && from && until && ` · ${from} to ${new Date(new Date(until).getTime() - 86400000).toISOString().slice(0, 10)}`}
        {" · "}Search by pseudonym, email, or paste a user id.
        {narrowed && (
          <>
            {" "}
            <button type="button" onClick={showEveryone} className="text-gold hover:underline">
              Clear filters
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

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-muted">
          Status
          <select value={status} onChange={(e) => set("status", e.target.value)} className={field}>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-muted">
          Gender
          <select value={gender} onChange={(e) => set("gender", e.target.value)} className={field}>
            <option value="">All genders</option>
            {Object.entries(genderLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-muted">
          City
          <select value={city} onChange={(e) => set("city", e.target.value)} className={field}>
            <option value="">All cities</option>
            {(facets?.cities ?? []).map((c) => (
              <option key={c.key} value={c.key}>
                {c.label} ({c.members})
              </option>
            ))}
          </select>
        </label>
      </div>
      {profileFilter && status !== "active" && (
        <p className="mt-2 text-xs text-muted">
          People who deleted their account have no gender or city on record any more, so they do not appear when one is chosen.
        </p>
      )}

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
                <th className="px-4 py-2.5 font-medium">Gender</th>
                <th className="px-4 py-2.5 font-medium">City</th>
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
                  <td className="px-4 py-2.5 text-muted">{u.gender ? (genderLabels[u.gender] ?? u.gender) : "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{u.city ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <StateBadge state={u.accountState} />
                    {u.deletedAt && (
                      <span className="ml-2 text-xs text-muted">{new Date(u.deletedAt).toLocaleDateString()}</span>
                    )}
                  </td>
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
