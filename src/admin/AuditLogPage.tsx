import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AuditEntry, AuditFacets, AuditQuery } from "../lib/types";

const PAGE_SIZE = 50;

interface Filters {
  action: string;
  admin: string;
  targetType: string;
  q: string;
  /** yyyy-mm-dd in the admin's own timezone. */
  from: string;
  to: string;
}

const EMPTY: Filters = { action: "", admin: "", targetType: "", q: "", from: "", to: "" };

/** Day boundaries are the admin's local midnight; `to` is exclusive, so the end date is included. */
function toQuery(f: Filters): AuditQuery {
  const startOf = (d: string) => new Date(`${d}T00:00:00`);
  const nextDay = (d: string) => {
    const date = startOf(d);
    date.setDate(date.getDate() + 1);
    return date;
  };
  return {
    action: f.action,
    admin: f.admin,
    targetType: f.targetType,
    q: f.q.trim(),
    from: f.from ? startOf(f.from).toISOString() : undefined,
    to: f.to ? nextDay(f.to).toISOString() : undefined,
  };
}

const field =
  "rounded border border-line bg-white px-2.5 py-2 text-sm outline-none focus:border-gold";

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-muted">
      {label}
      {children}
    </label>
  );
}

export default function AuditLogPage() {
  const [facets, setFacets] = useState<AuditFacets | null>(null);
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [facetsFailed, setFacetsFailed] = useState(false);

  useEffect(() => {
    api
      .getAuditFacets()
      .then(setFacets)
      .catch(() => setFacetsFailed(true));
  }, []);

  // A new filter always starts again from the newest page.
  useEffect(() => {
    let current = true;
    setEntries(null);
    setFailed(false);
    api
      .getAuditLog(toQuery(applied), 0, PAGE_SIZE)
      .then((rows) => {
        if (!current) return;
        setEntries(rows);
        setHasMore(rows.length === PAGE_SIZE);
      })
      .catch(() => {
        if (!current) return;
        setEntries([]);
        setHasMore(false);
        setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [applied]);

  const loadMore = useCallback(async () => {
    if (!entries) return;
    setLoadingMore(true);
    try {
      const rows = await api.getAuditLog(toQuery(applied), Math.floor(entries.length / PAGE_SIZE), PAGE_SIZE);
      setEntries([...entries, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
    } catch {
      setFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [entries, applied]);

  const set = (key: keyof Filters) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);
  const active = JSON.stringify(applied) !== JSON.stringify(EMPTY);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    setApplied(draft);
  }

  function clear() {
    setDraft(EMPTY);
    setApplied(EMPTY);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <p className="mt-1 text-sm text-muted">
        Every admin action, newest first. Entries cannot be edited or deleted.
      </p>

      <form onSubmit={apply} className="mt-5 rounded-lg border border-line bg-white p-4">
        {facetsFailed && (
          <p className="mb-3 text-sm text-danger">
            Could not load the filter options (action, admin, target). The server needs a restart to pick up the
            latest version.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Labelled label="Action">
            <select value={draft.action} onChange={(e) => set("action")(e.target.value)} className={field}>
              <option value="">All actions</option>
              {facets?.actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Labelled>
          <Labelled label="Admin">
            <select value={draft.admin} onChange={(e) => set("admin")(e.target.value)} className={field}>
              <option value="">Everyone</option>
              <option value="system">System (automatic)</option>
              {facets?.admins.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Labelled>
          <Labelled label="Target">
            <select value={draft.targetType} onChange={(e) => set("targetType")(e.target.value)} className={field}>
              <option value="">Anything</option>
              {facets?.targetTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Labelled>
          <Labelled label="Search">
            <input
              value={draft.q}
              onChange={(e) => set("q")(e.target.value)}
              placeholder="Reason, details, or an id"
              className={field}
            />
          </Labelled>
          <Labelled label="From">
            <input
              type="date"
              value={draft.from}
              max={draft.to || undefined}
              onChange={(e) => set("from")(e.target.value)}
              className={field}
            />
          </Labelled>
          <Labelled label="To">
            <input
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              onChange={(e) => set("to")(e.target.value)}
              className={field}
            />
          </Labelled>
          <div className="flex items-end gap-2 sm:col-span-2">
            <button
              disabled={!dirty}
              className="rounded bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-40 disabled:hover:bg-ink"
            >
              Apply filters
            </button>
            {(active || dirty) && (
              <button type="button" onClick={clear} className="px-2 py-2 text-sm text-gold hover:underline">
                Clear all
              </button>
            )}
          </div>
        </div>
      </form>

      {entries === null ? (
        <p className="py-10 text-center text-muted">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-line bg-white/60 px-6 py-12 text-center text-muted">
          {failed
            ? "Could not load the audit log. Is the server up to date?"
            : active
              ? "No entries match these filters."
              : "Nothing recorded yet."}
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted">
            {entries.length} shown{hasMore ? " (more available)" : ""}
            {active ? " · filtered" : ""}
          </p>
          <div className="mt-2 overflow-x-auto rounded-lg border border-line bg-white">
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
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded border border-line bg-white px-5 py-2 text-sm font-medium transition hover:border-gold disabled:opacity-60"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
