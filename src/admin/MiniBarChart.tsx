import { useState } from "react";
import type { MetricsSeries } from "../lib/types";

const W = 320;
const H = 96;
const PAD_TOP = 8;
const PAD_BOTTOM = 18;
const GAP = 3; // visible gap between bars

function dayLabel(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * One series, one chart. No legend box - the title names it - and no second axis: when two
 * measures have different scales they get two charts, never one chart with two y-axes.
 */
export default function MiniBarChart({ series }: { series: MetricsSeries }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const points = series.points;
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((n, p) => n + p.value, 0);
  const slot = W / points.length;
  const barW = Math.max(2, slot - GAP);
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const hovered = hover === null ? null : points[hover];

  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{series.label}</h3>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{total}</p>
          <p className="text-xs text-muted">last {points.length} days</p>
        </div>
        <button
          onClick={() => setAsTable((v) => !v)}
          className="rounded border border-line px-2 py-0.5 text-xs text-muted transition hover:border-gold hover:text-ink"
        >
          {asTable ? "Chart" : "Table"}
        </button>
      </div>

      {asTable ? (
        <table className="mt-3 w-full text-xs">
          <tbody>
            {points.map((p) => (
              <tr key={p.day} className="border-t border-line/60">
                <td className="py-1 text-muted">{dayLabel(p.day)}</td>
                <td className="py-1 text-right tabular-nums">{p.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative mt-3">
          {hovered && (
            <div
              className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-canvas shadow"
              style={{ left: `${((hover! + 0.5) / points.length) * 100}%` }}
            >
              {dayLabel(hovered.day)} · <strong>{hovered.value}</strong>
            </div>
          )}
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label={`${series.label}, daily, last ${points.length} days. Total ${total}.`}
            onMouseLeave={() => setHover(null)}
          >
            {/* recessive gridline at the top of the range, and the baseline */}
            <line x1="0" x2={W} y1={PAD_TOP} y2={PAD_TOP} stroke="currentColor" className="text-line" strokeDasharray="2 3" />
            <text x="0" y={PAD_TOP - 1} fontSize="8" fill="currentColor" className="text-muted">{max}</text>
            <line x1="0" x2={W} y1={H - PAD_BOTTOM} y2={H - PAD_BOTTOM} stroke="currentColor" className="text-line" />

            {points.map((p, i) => {
              const h = p.value === 0 ? 0 : Math.max(2, (p.value / max) * plotH);
              const x = i * slot + GAP / 2;
              const y = H - PAD_BOTTOM - h;
              return (
                <g key={p.day} onMouseEnter={() => setHover(i)}>
                  {/* a full-height hit target, far larger than the bar itself */}
                  <rect x={i * slot} y={0} width={slot} height={H - PAD_BOTTOM} fill="transparent" />
                  {h > 0 && (
                    // rounded at the data end only; the baseline end stays square
                    <path
                      d={`M${x},${y + h} V${y + 3} Q${x},${y} ${x + 3},${y} H${x + barW - 3} Q${x + barW},${y} ${x + barW},${y + 3} V${y + h} Z`}
                      fill="var(--color-gold)"
                      opacity={hover === null || hover === i ? 1 : 0.45}
                    />
                  )}
                </g>
              );
            })}

            <text x="0" y={H - 4} fontSize="8" fill="currentColor" className="text-muted">{dayLabel(points[0].day)}</text>
            <text x={W} y={H - 4} fontSize="8" textAnchor="end" fill="currentColor" className="text-muted">
              {dayLabel(points[points.length - 1].day)}
            </text>
          </svg>
        </div>
      )}
    </section>
  );
}
