import type { ReactNode } from "react";

interface MetricCard {
  label: string;
  value: string;
  detail?: string;
}

interface BarDatum {
  label: string;
  value: number;
  color?: string;
  valueLabel?: string;
}

interface HistogramDatum {
  label: string;
  count: number;
}

interface ScatterPoint {
  x: number;
  y: number;
  group: string;
  label: string;
}

interface RadarSeries {
  name: string;
  color: string;
  values: number[];
}

export function MetricCards({ cards }: { cards: MetricCard[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <article key={card.label} className="border border-white/10 bg-[#141412] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5a5848]">{card.label}</p>
          <p className="mt-2 text-lg text-[#f0ece2]">{card.value}</p>
          {card.detail ? <p className="mt-1 text-xs text-[#9c9888]">{card.detail}</p> : null}
        </article>
      ))}
    </section>
  );
}

export function HorizontalBarChart({ title, data }: { title: string; data: BarDatum[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <article className="border border-white/10 bg-[#141412] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
      <div className="mt-3 space-y-2">
        {data.map((item) => {
          const width = (item.value / max) * 100;

          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm text-[#d8d3c6]">
                <span className="truncate">{item.label}</span>
                <span className="font-mono text-xs text-[#f0ece2]">{item.valueLabel ?? item.value.toFixed(2)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-[#252521]">
                <div
                  className="h-full rounded"
                  style={{ width: `${Math.max(width, 1)}%`, background: item.color ?? "#c9a84c" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function HistogramChart({
  title,
  data,
  color,
}: {
  title: string;
  data: HistogramDatum[];
  color: string;
}) {
  const max = Math.max(...data.map((item) => item.count), 1);

  return (
    <article className="border border-white/10 bg-[#141412] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
      <div className="mt-4 grid h-56 grid-cols-6 items-end gap-2 sm:grid-cols-8 md:grid-cols-10">
        {data.map((item) => {
          const height = (item.count / max) * 100;
          return (
            <div key={item.label} className="flex min-w-0 flex-col items-center gap-1">
              <div className="flex h-40 w-full items-end rounded-sm bg-[#252521]">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${Math.max(height, 2)}%`,
                    background: color,
                  }}
                />
              </div>
              <p className="truncate text-[10px] text-[#9c9888]" title={item.label}>
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function heatColor(value: number): string {
  const clamped = Math.max(-1, Math.min(1, value));
  if (clamped >= 0) {
    const alpha = 0.14 + clamped * 0.65;
    return `rgba(74, 158, 122, ${alpha})`;
  }
  const alpha = 0.14 + Math.abs(clamped) * 0.65;
  return `rgba(192, 87, 42, ${alpha})`;
}

export function CorrelationHeatmap({
  title,
  columns,
  matrix,
}: {
  title: string;
  columns: string[];
  matrix: number[][];
}) {
  return (
    <article className="border border-white/10 bg-[#141412] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
      <div className="mt-3 overflow-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border border-white/10 bg-[#191915] px-2 py-1 text-left text-[#9c9888]">
                Feature
              </th>
              {columns.map((column) => (
                <th key={column} className="border border-white/10 bg-[#191915] px-2 py-1 text-[#9c9888]" title={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((rowLabel, rowIdx) => (
              <tr key={rowLabel}>
                <td className="sticky left-0 border border-white/10 bg-[#191915] px-2 py-1 text-[#d8d3c6]" title={rowLabel}>
                  {rowLabel}
                </td>
                {matrix[rowIdx].map((value, colIdx) => (
                  <td
                    key={`${rowLabel}-${columns[colIdx]}`}
                    className="border border-white/10 px-2 py-1 text-center font-mono text-[11px]"
                    style={{ backgroundColor: heatColor(value) }}
                    title={`${rowLabel} <-> ${columns[colIdx]}: ${value.toFixed(3)}`}
                  >
                    {value.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function DivergingBarChart({ title, data }: { title: string; data: BarDatum[] }) {
  const max = Math.max(...data.map((item) => Math.abs(item.value)), 1);

  return (
    <article className="border border-white/10 bg-[#141412] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
      <div className="mt-4 space-y-3">
        {data.map((item) => {
          const width = (Math.abs(item.value) / max) * 50;
          const positive = item.value >= 0;

          return (
            <div key={item.label} className="grid grid-cols-[minmax(120px,1fr)_120px_120px] items-center gap-2 text-sm">
              <span className="truncate text-[#d8d3c6]">{item.label}</span>
              <div className="relative h-2 bg-[#252521]">
                <div className="absolute right-0 top-0 h-full w-px bg-white/25" />
                <div
                  className="absolute top-0 h-full"
                  style={{
                    left: positive ? "50%" : `calc(50% - ${width}%)`,
                    width: `${width}%`,
                    background: positive ? item.color ?? "#4a9e7a" : "#c0572a",
                  }}
                />
              </div>
              <span className={`font-mono ${positive ? "text-[#4a9e7a]" : "text-[#c0572a]"}`}>{item.value.toFixed(4)}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function colorForGroup(group: string): string {
  const palette = ["#4a9e7a", "#2a6aaa", "#c0572a", "#b7791f", "#8b5cf6", "#ef4444", "#14b8a6", "#eab308"];
  let hash = 0;
  for (let index = 0; index < group.length; index += 1) {
    hash = (hash << 5) - hash + group.charCodeAt(index);
    hash |= 0;
  }

  return palette[Math.abs(hash) % palette.length];
}

export function ScatterPlot({ title, points }: { title: string; points: ScatterPoint[] }) {
  if (points.length === 0) {
    return (
      <article className="border border-white/10 bg-[#141412] p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
        <p className="mt-3 text-sm text-[#9c9888]">No complete feature rows available for scatter plotting.</p>
      </article>
    );
  }

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));

  const xSpan = Math.max(maxX - minX, 1);
  const ySpan = Math.max(maxY - minY, 1);

  return (
    <article className="border border-white/10 bg-[#141412] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
      <svg viewBox="0 0 640 360" className="mt-3 w-full overflow-visible rounded border border-white/10 bg-[#11110f]">
        <line x1="50" y1="20" x2="50" y2="320" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        <line x1="50" y1="320" x2="620" y2="320" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

        {points.map((point) => {
          const px = 50 + ((point.x - minX) / xSpan) * 570;
          const py = 320 - ((point.y - minY) / ySpan) * 300;
          const color = colorForGroup(point.group);

          return (
            <circle key={`${point.label}-${point.group}`} cx={px} cy={py} r="3.8" fill={color} opacity="0.8">
              <title>{`${point.label}\nActual: ${point.x.toFixed(2)} | Predicted: ${point.y.toFixed(2)} | ${point.group}`}</title>
            </circle>
          );
        })}

        <text x="335" y="350" fill="#9c9888" fontSize="12" textAnchor="middle">
          Actual turnout
        </text>
        <text x="12" y="170" fill="#9c9888" fontSize="12" textAnchor="middle" transform="rotate(-90 12 170)">
          Predicted turnout
        </text>
      </svg>
    </article>
  );
}

function polygonPoints(values: number[], radius: number, centerX: number, centerY: number): string {
  return values
    .map((value, index) => {
      const angle = (-Math.PI / 2) + (index * (Math.PI * 2)) / values.length;
      const x = centerX + Math.cos(angle) * radius * value;
      const y = centerY + Math.sin(angle) * radius * value;
      return `${x},${y}`;
    })
    .join(" ");
}

export function RadarComparison({
  title,
  axes,
  series,
  compact = false,
  className,
}: {
  title: string;
  axes: string[];
  series: RadarSeries[];
  compact?: boolean;
  className?: string;
}) {
  const rings = [0.25, 0.5, 0.75, 1];
  const centerX = compact ? 140 : 180;
  const centerY = compact ? 130 : 160;
  const radius = compact ? 84 : 110;
  const axisRadius = compact ? 94 : 120;
  const viewBox = compact ? "0 0 320 260" : "0 0 420 320";
  const labelSize = compact ? 10 : 11;

  return (
    <article className={`border border-white/10 bg-[#141412] p-4 ${className ?? ""}`}>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
      <div className={`mt-3 grid gap-4 ${compact ? "" : "lg:grid-cols-[1fr_200px]"}`}>
        <svg viewBox={viewBox} className="w-full">
          {rings.map((ring) => (
            <polygon
              key={ring}
              points={polygonPoints(new Array(axes.length).fill(ring), radius, centerX, centerY)}
              fill="none"
              stroke="rgba(255,255,255,0.16)"
              strokeWidth="1"
            />
          ))}

          {axes.map((axis, index) => {
            const angle = (-Math.PI / 2) + (index * (Math.PI * 2)) / axes.length;
            const x = centerX + Math.cos(angle) * axisRadius;
            const y = centerY + Math.sin(angle) * axisRadius;

            return (
              <g key={axis}>
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={x}
                  y2={y}
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="1"
                />
                <text x={x} y={y} fill="#9c9888" fontSize={labelSize} textAnchor="middle" dominantBaseline="middle">
                  {axis}
                </text>
              </g>
            );
          })}

          {series.map((item) => (
            <polygon
              key={item.name}
              points={polygonPoints(item.values, radius, centerX, centerY)}
              fill={item.color}
              fillOpacity="0.2"
              stroke={item.color}
              strokeWidth="2"
            />
          ))}
        </svg>

        <div className={`space-y-2 ${compact ? "border-t border-white/10 pt-3" : ""}`}>
          {series.map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-sm text-[#d8d3c6]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="border border-white/10 bg-[#141412] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
      <div className="mt-3">{children}</div>
    </article>
  );
}
