import { useState } from "react";
import { formatValue } from "../lib/format";
import type { AnalyticsSeries, Granularity } from "../lib/types";

const W = 640;
const H = 150;
const PAD_TOP = 12;
const PAD_BOTTOM = 20;
const GAP = 3;

export function bucketLabel(iso: string, granularity: Granularity): string {
  const d = new Date(iso + "T00:00:00");
  if (granularity === "month") return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  const day = d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return granularity === "week" ? `Week of ${day}` : day;
}

/** Short form for the axis, where "Week of" would not fit. */
function axisLabel(iso: string, granularity: Granularity): string {
  const d = new Date(iso + "T00:00:00");
  if (granularity === "month") return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * One measure, one chart, one axis. Flows (things that happened) are bars; stocks (how many there
 * are) are a line, because a running total is a path and not a pile of separate amounts. No legend
 * box - the title names the single series - and a table view carries the exact numbers.
 */
export default function TrendChart({
  series,
  granularity,
  lastBucketPartial,
}: {
  series: AnalyticsSeries;
  granularity: Granularity;
  lastBucketPartial: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const points = series.points;
  const isStock = series.kind === "STOCK";
  const max = Math.max(1, ...points.map((p) => p.value));
  const min = isStock ? Math.min(...points.map((p) => p.value)) : 0;
  const span = Math.max(1, max - min);
  const slot = W / points.length;
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const baseY = H - PAD_BOTTOM;
  const yFor = (v: number) => baseY - ((v - min) / span) * plotH;
  const xCenter = (i: number) => i * slot + slot / 2;
  const hovered = hover === null ? null : points[hover];

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${xCenter(i)},${yFor(p.value)}`).join(" ");
  const area = `${line} L${xCenter(points.length - 1)},${baseY} L${xCenter(0)},${baseY} Z`;
  const last = points.length - 1;

  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{series.label}</h3>
        <button
          onClick={() => setAsTable((v) => !v)}
          className="rounded border border-line px-2 py-0.5 text-xs text-muted transition hover:border-gold hover:text-ink"
        >
          {asTable ? "Chart" : "Table"}
        </button>
      </div>

      {asTable ? (
        <div className="mt-3 max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <tbody>
              {points.map((p) => (
                <tr key={p.day} className="border-t border-line/60">
                  <td className="py-1 text-muted">{bucketLabel(p.day, granularity)}</td>
                  <td className="py-1 text-right tabular-nums">{formatValue(p.value, series.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-3">
          {hovered && (
            <div
              className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-canvas shadow"
              style={{ left: `${Math.min(92, Math.max(8, ((hover! + 0.5) / points.length) * 100))}%` }}
            >
              {bucketLabel(hovered.day, granularity)} · <strong>{formatValue(hovered.value, series.unit)}</strong>
              {hover === last && lastBucketPartial && " (so far)"}
            </div>
          )}
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label={`${series.label} by ${granularity}. ${series.kind === "STOCK" ? "Ends at" : series.unit === "seconds" ? "Average" : "Total"} ${formatValue(series.total, series.unit)}.`}
            onMouseLeave={() => setHover(null)}
          >
            <line x1="0" x2={W} y1={PAD_TOP} y2={PAD_TOP} stroke="currentColor" className="text-line" strokeDasharray="2 3" />
            <text x="0" y={PAD_TOP - 3} fontSize="9" fill="currentColor" className="text-muted">{formatValue(max, series.unit)}</text>
            {isStock && min > 0 && (
              <text x="0" y={baseY - 3} fontSize="9" fill="currentColor" className="text-muted">{formatValue(min, series.unit)}</text>
            )}
            <line x1="0" x2={W} y1={baseY} y2={baseY} stroke="currentColor" className="text-line" />

            {isStock ? (
              <>
                <path d={area} fill="var(--color-gold)" opacity="0.12" />
                <path d={line} fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinejoin="round" />
                {hover !== null && (
                  // a ring in the surface colour keeps the marker legible over the line
                  <circle cx={xCenter(hover)} cy={yFor(points[hover].value)} r="4" fill="var(--color-gold)" stroke="white" strokeWidth="2" />
                )}
              </>
            ) : (
              points.map((p, i) => {
                const h = p.value === 0 ? 0 : Math.max(2, (p.value / max) * plotH);
                const barW = Math.max(2, slot - GAP);
                const x = i * slot + GAP / 2;
                const y = baseY - h;
                const partial = i === last && lastBucketPartial;
                return (
                  h > 0 && (
                    <path
                      key={p.day}
                      d={`M${x},${y + h} V${y + 3} Q${x},${y} ${x + 3},${y} H${x + barW - 3} Q${x + barW},${y} ${x + barW},${y + 3} V${y + h} Z`}
                      fill="var(--color-gold)"
                      opacity={(hover === null || hover === i ? 1 : 0.45) * (partial ? 0.55 : 1)}
                    />
                  )
                );
              })
            )}

            {/* full-height hit targets, far larger than any bar or point */}
            {points.map((p, i) => (
              <rect key={p.day} x={i * slot} y={0} width={slot} height={baseY} fill="transparent" onMouseEnter={() => setHover(i)} />
            ))}

            <text x="0" y={H - 5} fontSize="9" fill="currentColor" className="text-muted">
              {axisLabel(points[0].day, granularity)}
            </text>
            <text x={W} y={H - 5} fontSize="9" textAnchor="end" fill="currentColor" className="text-muted">
              {axisLabel(points[last].day, granularity)}
            </text>
          </svg>
        </div>
      )}
    </section>
  );
}
