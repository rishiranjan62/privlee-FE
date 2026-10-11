/** "Refresh" for an admin report, with when it was last refreshed. The page keeps showing what it has while it loads. */
export default function RefreshButton({
  onClick,
  busy,
  updatedAt,
}: {
  onClick: () => void;
  busy: boolean;
  updatedAt: Date | null;
}) {
  return (
    <div className="flex items-center gap-3">
      {updatedAt && (
        <span className="hidden text-xs text-muted sm:inline">
          Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      )}
      <button
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded border border-line bg-white px-4 py-2 text-sm font-medium transition hover:border-gold disabled:opacity-60"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={busy ? "animate-spin" : ""}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
        {busy ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}
