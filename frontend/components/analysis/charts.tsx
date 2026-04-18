"use client";

import { Fragment, type ReactNode } from "react";
import { getAnalysisLabel } from "@/lib/analysisLabels";

interface MetricCard {
  label: string;
  value: string;
  detail?: string;
}

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
  valueLabel?: string;
}

interface HistogramDatum {
  label: string;
  count: number;
}

export interface ScatterPoint {
  x: number;
  y: number;
  group: string;
  label: string;
  detail?: string;
}

interface RadarSeries {
  name: string;
  color: string;
  values: number[];
}

interface GroupedSeries {
  key: string;
  label: string;
  color: string;
}

interface GroupedBarDatum {
  label: string;
  values: Record<string, number>;
}

function formatMetric(value: number, decimals: number, unit: string): string {
  return `${value.toFixed(decimals)}${unit}`;
}

function resolvePaletteColor(group: string): string {
  const palette = ["#4a9e7a", "#2a6aaa", "#c0572a", "#b7791f", "#8b5cf6", "#ef4444", "#14b8a6", "#eab308"];
  let hash = 0;
  for (let index = 0; index < group.length; index += 1) {
    hash = (hash << 5) - hash + group.charCodeAt(index);
    hash |= 0;
  }

  return palette[Math.abs(hash) % palette.length];
}

function divergingHeatColor(value: number): string {
  const clamped = Math.max(-1, Math.min(1, value));
  if (clamped < 0) {
    const ratio = Math.abs(clamped);
    const red = Math.round(255 - ratio * (255 - 37));
    const green = Math.round(255 - ratio * (255 - 99));
    const blue = Math.round(255 - ratio * (255 - 235));
    return `rgb(${red}, ${green}, ${blue})`;
  }

  const ratio = clamped;
  const red = Math.round(255 - ratio * (255 - 220));
  const green = Math.round(255 - ratio * (255 - 38));
  const blue = Math.round(255 - ratio * (255 - 38));
  return `rgb(${red}, ${green}, ${blue})`;
}

function polygonPoints(values: number[], radius: number, centerX: number, centerY: number): string {
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (index * (Math.PI * 2)) / values.length;
      const x = centerX + Math.cos(angle) * radius * value;
      const y = centerY + Math.sin(angle) * radius * value;
      return `${x},${y}`;
    })
    .join(" ");
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

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="border border-white/10 bg-[#141412] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
      <div className="mt-3">{children}</div>
    </article>
  );
}

export function HorizontalBarChart({
  title,
  data,
  xAxisLabel,
  yAxisLabel,
  height = 320,
  defaultColor = "#c9a84c",
  valueDecimals = 0,
  valueUnit = "",
  maxBarFillPercent = 100,
}: {
  title: string;
  data: BarDatum[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  defaultColor?: string;
  valueDecimals?: number;
  valueUnit?: string;
  maxBarFillPercent?: number;
}) {
  const max = Math.max(...data.map((item) => Math.abs(item.value)), 1);
  const fillCap = Math.min(100, Math.max(35, maxBarFillPercent));

  return (
    <article className="border border-white/10 bg-[#141412] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
      {xAxisLabel || yAxisLabel ? (
        <div className="mt-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.14em] text-[#7d7969]">
          <span>{yAxisLabel ? `Y-axis: ${yAxisLabel}` : ""}</span>
          <span>{xAxisLabel ? `X-axis: ${xAxisLabel}` : ""}</span>
        </div>
      ) : null}

      <div className="mt-3 space-y-3" style={{ minHeight: `${height}px` }}>
        {data.map((item) => {
          const width = ((Math.abs(item.value) / max) * fillCap);
          const labelAnchor = Math.min(Math.max(width, 8), 96);

          return (
            <div key={item.label} className="grid grid-cols-[minmax(140px,1fr)_minmax(260px,2fr)] items-center gap-3">
              <span className="truncate text-sm text-[#d8d3c6]" title={item.label}>
                {item.label}
              </span>
              <div className="relative h-7 rounded bg-[#252521]">
                <div
                  className="absolute inset-y-0 left-0 rounded"
                  style={{
                    width: `${Math.max(width, 1)}%`,
                    background: item.color ?? defaultColor,
                  }}
                />
                <span
                  className="absolute top-1/2 -translate-y-1/2 font-mono text-xs text-[#f0ece2]"
                  style={{ left: `calc(${labelAnchor}% + 6px)` }}
                >
                  {item.valueLabel ?? formatMetric(item.value, valueDecimals, valueUnit)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function VerticalBarChart({
  title,
  data,
  xAxisLabel,
  yAxisLabel,
  height = 320,
  defaultColor = "#2a6aaa",
  valueDecimals = 0,
  valueUnit = "",
}: {
  title: string;
  data: BarDatum[];
  xAxisLabel: string;
  yAxisLabel: string;
  height?: number;
  defaultColor?: string;
  valueDecimals?: number;
  valueUnit?: string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const barAreaHeight = Math.max(height - 120, 180);

  return (
    <article className="border border-white/10 bg-[#141412] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <div className="relative min-w-170" style={{ height: `${height}px` }}>
          <p
            className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-[11px] text-[#9c9888]"
            style={{ transformOrigin: "left top" }}
          >
            {yAxisLabel}
          </p>

          <div className="absolute bottom-10 left-14 right-2 top-2 border-b border-l border-white/20">
            <div className="flex h-full items-end gap-4 px-3 pb-2">
              {data.map((item) => {
                const barHeight = (item.value / max) * barAreaHeight;
                return (
                  <div key={item.label} className="flex min-w-18 flex-1 flex-col items-center justify-end gap-2">
                    <span className="font-mono text-[11px] text-[#f0ece2]">
                      {item.valueLabel ?? formatMetric(item.value, valueDecimals, valueUnit)}
                    </span>
                    <div
                      className="w-10 rounded-t"
                      style={{
                        height: `${Math.max(barHeight, 4)}px`,
                        background: item.color ?? defaultColor,
                      }}
                    />
                    <span className="w-full truncate text-center text-[11px] text-[#9c9888]" title={item.label}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[11px] text-[#9c9888]">{xAxisLabel}</p>
        </div>
      </div>
    </article>
  );
}

export function HistogramChart({
  title,
  data,
  color,
  xAxisLabel,
  yAxisLabel,
  height = 320,
}: {
  title: string;
  data: HistogramDatum[];
  color: string;
  xAxisLabel: string;
  yAxisLabel: string;
  height?: number;
}) {
  const max = Math.max(...data.map((item) => item.count), 1);
  const barAreaHeight = Math.max(height - 120, 180);

  return (
    <article className="border border-white/10 bg-[#141412] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <div className="relative min-w-170" style={{ height: `${height}px` }}>
          <p
            className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-[11px] text-[#9c9888]"
            style={{ transformOrigin: "left top" }}
          >
            {yAxisLabel}
          </p>

          <div className="absolute bottom-10 left-14 right-2 top-2 border-b border-l border-white/20">
            <div className="flex h-full items-end gap-2 px-3 pb-2">
              {data.map((item) => {
                const barHeight = (item.count / max) * barAreaHeight;
                return (
                  <div key={item.label} className="flex min-w-14 flex-1 flex-col items-center justify-end gap-2">
                    <span className="font-mono text-[11px] text-[#f0ece2]">{item.count}</span>
                    <div className="flex h-full w-full items-end rounded-sm bg-[#252521]">
                      <div
                        className="w-full rounded-sm"
                        style={{
                          height: `${Math.max(barHeight, 4)}px`,
                          background: color,
                        }}
                      />
                    </div>
                    <span className="w-full truncate text-center text-[11px] text-[#9c9888]" title={item.label}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[11px] text-[#9c9888]">{xAxisLabel}</p>
        </div>
      </div>
    </article>
  );
}

export function CorrelationHeatmap({
  title,
  columns,
  matrix,
  highlightKey,
  height = 480,
}: {
  title: string;
  columns: string[];
  matrix: number[][];
  highlightKey?: string;
  height?: number;
}) {
  const cellSize = 86;
  const rowHeaderWidth = 220;

  return (
    <article className="border border-white/10 bg-[#141412] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_74px]">
        <div className="overflow-auto" style={{ minHeight: `${height}px` }}>
          <div
            className="min-w-max"
            style={{
              display: "grid",
              gridTemplateColumns: `${rowHeaderWidth}px repeat(${columns.length}, ${cellSize}px)`,
            }}
          >
            <div className="sticky left-0 top-0 z-20 border border-white/10 bg-[#191915] px-3 py-2 text-[11px] text-[#9c9888]">
              Feature
            </div>

            {columns.map((column) => {
              const isHighlighted = highlightKey === column;
              return (
                <div
                  key={`head-${column}`}
                  className="border bg-[#191915] px-2 py-2 text-center text-[10px] text-[#9c9888]"
                  style={{
                    borderColor: isHighlighted ? "rgba(248, 196, 89, 0.9)" : "rgba(255,255,255,0.1)",
                    borderWidth: isHighlighted ? "2px" : "1px",
                  }}
                  title={getAnalysisLabel(column)}
                >
                  {getAnalysisLabel(column)}
                </div>
              );
            })}

            {columns.map((rowLabel, rowIdx) => {
              const rowValues = matrix[rowIdx] ?? [];
              const rowHighlighted = highlightKey === rowLabel;

              return (
                <Fragment key={`rowblock-${rowLabel}`}>
                  <div
                    className="sticky left-0 z-10 border bg-[#191915] px-3 py-2 text-[11px] text-[#d8d3c6]"
                    style={{
                      borderColor: rowHighlighted ? "rgba(248, 196, 89, 0.9)" : "rgba(255,255,255,0.1)",
                      borderWidth: rowHighlighted ? "2px" : "1px",
                    }}
                    title={getAnalysisLabel(rowLabel)}
                  >
                    {getAnalysisLabel(rowLabel)}
                  </div>

                  {rowValues.map((value, colIdx) => {
                    const colLabel = columns[colIdx];
                    const highlighted = highlightKey === rowLabel || highlightKey === colLabel;

                    return (
                      <div
                        key={`${rowLabel}-${colLabel}`}
                        className="flex items-center justify-center border text-[11px] font-mono text-[#11110f]"
                        style={{
                          backgroundColor: divergingHeatColor(value),
                          borderColor: highlighted ? "rgba(248, 196, 89, 0.9)" : "rgba(255,255,255,0.1)",
                          borderWidth: highlighted ? "2px" : "1px",
                          minHeight: `${cellSize}px`,
                        }}
                        title={`${getAnalysisLabel(rowLabel)} x ${getAnalysisLabel(colLabel)}: r=${value.toFixed(3)}`}
                      >
                        {value.toFixed(2)}
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 self-stretch">
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#9c9888]">r = +1</span>
          <div
            className="w-4 flex-1 rounded border border-white/20"
            style={{ background: "linear-gradient(to bottom, #dc2626 0%, #ffffff 50%, #2563eb 100%)" }}
          />
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#9c9888]">r = -1</span>
        </div>
      </div>
    </article>
  );
}

export function DivergingBarChart({
  title,
  data,
  xAxisLabel,
  yAxisLabel,
  height = 360,
  positiveColor = "#2563eb",
  negativeColor = "#dc2626",
  valueDecimals = 3,
  valueUnit = "",
}: {
  title: string;
  data: BarDatum[];
  xAxisLabel: string;
  yAxisLabel: string;
  height?: number;
  positiveColor?: string;
  negativeColor?: string;
  valueDecimals?: number;
  valueUnit?: string;
}) {
  const max = Math.max(...data.map((item) => Math.abs(item.value)), 1);

  return (
    <article className="border border-white/10 bg-[#141412] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.14em] text-[#7d7969]">
        <span>{`Y-axis: ${yAxisLabel}`}</span>
        <span>{`X-axis: ${xAxisLabel}`}</span>
      </div>

      <div className="mt-3 space-y-3" style={{ minHeight: `${Math.max(height, data.length * 40)}px` }}>
        {data.map((item) => {
          const maxHalfWidth = 43;
          const width = (Math.abs(item.value) / max) * maxHalfWidth;
          const positive = item.value >= 0;
          const tipPosition = positive ? 50 + width : 50 - width;
          const tipGap = 1.8;

          let labelPosition = positive ? tipPosition + tipGap : tipPosition - tipGap;
          let labelTransform = positive ? "translate(0, -50%)" : "translate(-100%, -50%)";

          // Flip the anchor near chart edges so value labels remain visible.
          if (positive && labelPosition > 94) {
            labelPosition = Math.max(2, tipPosition - tipGap);
            labelTransform = "translate(-100%, -50%)";
          }

          if (!positive && labelPosition < 6) {
            labelPosition = Math.min(98, tipPosition + tipGap);
            labelTransform = "translate(0, -50%)";
          }

          return (
            <div key={item.label} className="grid grid-cols-[minmax(150px,1fr)_minmax(320px,3fr)] items-center gap-3">
              <span className="truncate text-sm text-[#d8d3c6]" title={item.label}>
                {item.label}
              </span>

              <div className="relative h-7 rounded bg-[#252521]">
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/35" />
                <div
                  className="absolute inset-y-0 rounded"
                  style={{
                    left: positive ? "50%" : `calc(50% - ${width}%)`,
                    width: `${width}%`,
                    background: positive ? item.color ?? positiveColor : negativeColor,
                  }}
                />

                <span
                  className={`absolute top-1/2 whitespace-nowrap font-mono text-xs leading-none ${
                    positive ? "text-[#93c5fd]" : "text-[#fca5a5]"
                  }`}
                  style={{
                    left: `${labelPosition}%`,
                    transform: labelTransform,
                  }}
                >
                  {item.valueLabel ?? formatMetric(item.value, valueDecimals, valueUnit)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function ScatterPlot({
  title,
  points,
  xAxisLabel,
  yAxisLabel,
  xUnit = "",
  yUnit = "",
  height = 400,
  showReferenceLine = false,
  groupColors,
}: {
  title: string;
  points: ScatterPoint[];
  xAxisLabel: string;
  yAxisLabel: string;
  xUnit?: string;
  yUnit?: string;
  height?: number;
  showReferenceLine?: boolean;
  groupColors?: Record<string, string>;
}) {
  if (points.length === 0) {
    return (
      <article className="border border-white/10 bg-[#141412] p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
        <p className="mt-3 text-sm text-[#9c9888]">No complete rows available for scatter plotting.</p>
      </article>
    );
  }

  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const xPad = Math.max((maxX - minX) * 0.05, 1);
  const yPad = Math.max((maxY - minY) * 0.05, 1);

  const xDomainMin = minX - xPad;
  const xDomainMax = maxX + xPad;
  const yDomainMin = minY - yPad;
  const yDomainMax = maxY + yPad;

  const chartWidth = 860;
  const chartHeight = 520;
  const left = 80;
  const right = 26;
  const top = 20;
  const bottom = 70;
  const plotWidth = chartWidth - left - right;
  const plotHeight = chartHeight - top - bottom;

  const scaleX = (value: number) => left + ((value - xDomainMin) / (xDomainMax - xDomainMin)) * plotWidth;
  const scaleY = (value: number) => top + (1 - (value - yDomainMin) / (yDomainMax - yDomainMin)) * plotHeight;

  const groups = [...new Set(points.map((point) => point.group))];
  const colorForGroup = (group: string) => groupColors?.[group] ?? resolvePaletteColor(group);

  const referenceMin = Math.max(xDomainMin, yDomainMin);
  const referenceMax = Math.min(xDomainMax, yDomainMax);

  return (
    <article className="border border-white/10 bg-[#141412] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="mt-3 w-full rounded border border-white/10 bg-[#11110f]"
        style={{ minHeight: `${height}px` }}
      >
        {[0, 1, 2, 3, 4].map((step) => {
          const ratio = step / 4;
          const xValue = xDomainMin + ratio * (xDomainMax - xDomainMin);
          const yValue = yDomainMin + ratio * (yDomainMax - yDomainMin);
          const x = scaleX(xValue);
          const y = scaleY(yValue);

          return (
            <g key={`grid-${step}`}>
              <line x1={x} y1={top} x2={x} y2={top + plotHeight} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <line x1={left} y1={y} x2={left + plotWidth} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <text x={x} y={top + plotHeight + 20} fill="#9c9888" fontSize="11" textAnchor="middle">
                {xValue.toFixed(1)}
              </text>
              <text x={left - 10} y={y + 4} fill="#9c9888" fontSize="11" textAnchor="end">
                {yValue.toFixed(1)}
              </text>
            </g>
          );
        })}

        <line x1={left} y1={top} x2={left} y2={top + plotHeight} stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
        <line
          x1={left}
          y1={top + plotHeight}
          x2={left + plotWidth}
          y2={top + plotHeight}
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1.2"
        />

        {showReferenceLine && referenceMax > referenceMin ? (
          <line
            x1={scaleX(referenceMin)}
            y1={scaleY(referenceMin)}
            x2={scaleX(referenceMax)}
            y2={scaleY(referenceMax)}
            stroke="#9ca3af"
            strokeDasharray="6 4"
            strokeWidth="1.4"
          />
        ) : null}

        {points.map((point) => (
          <circle
            key={`${point.label}-${point.group}`}
            cx={scaleX(point.x)}
            cy={scaleY(point.y)}
            r="4"
            fill={colorForGroup(point.group)}
            opacity="0.85"
          >
            <title>{`${point.label}\n${xAxisLabel}: ${point.x.toFixed(2)}${xUnit}\n${yAxisLabel}: ${point.y.toFixed(2)}${yUnit}\n${
              point.group
            }${point.detail ? `\n${point.detail}` : ""}`}</title>
          </circle>
        ))}

        <text x={left + plotWidth / 2} y={chartHeight - 16} fill="#9c9888" fontSize="12" textAnchor="middle">
          {xAxisLabel}
        </text>
        <text
          x="18"
          y={top + plotHeight / 2}
          fill="#9c9888"
          fontSize="12"
          textAnchor="middle"
          transform={`rotate(-90 18 ${top + plotHeight / 2})`}
        >
          {yAxisLabel}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#d8d3c6]">
        {groups.map((group) => (
          <div key={group} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorForGroup(group) }} />
            <span>{group}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

export function RadarComparison({
  title,
  axes,
  series,
  compact = false,
  className,
  subtitle,
  height = 480,
}: {
  title: string;
  axes: string[];
  series: RadarSeries[];
  compact?: boolean;
  className?: string;
  subtitle?: string;
  height?: number;
}) {
  const rings = [0.25, 0.5, 0.75, 1];
  const centerX = compact ? 170 : 280;
  const centerY = compact ? 150 : 250;
  const radius = compact ? 100 : 175;
  const axisRadius = compact ? 120 : 205;
  const viewBox = compact ? "0 0 420 320" : "0 0 860 520";
  const labelSize = compact ? 10 : 11;

  return (
    <article className={`border border-white/10 bg-[#141412] p-4 ${className ?? ""}`}>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm text-[#9c9888]">{subtitle}</p> : null}

      <div className={`mt-3 grid gap-4 ${compact ? "" : "lg:grid-cols-[1fr_240px]"}`} style={{ minHeight: `${height}px` }}>
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
            const angle = -Math.PI / 2 + (index * (Math.PI * 2)) / axes.length;
            const x = centerX + Math.cos(angle) * axisRadius;
            const y = centerY + Math.sin(angle) * axisRadius;

            return (
              <g key={axis}>
                <line x1={centerX} y1={centerY} x2={x} y2={y} stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
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
              fillOpacity="0.18"
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

export function GroupedBarChart({
  title,
  data,
  series,
  xAxisLabel,
  yAxisLabel,
  height = 320,
}: {
  title: string;
  data: GroupedBarDatum[];
  series: GroupedSeries[];
  xAxisLabel: string;
  yAxisLabel: string;
  height?: number;
}) {
  const max = Math.max(...data.flatMap((item) => series.map((entry) => item.values[entry.key] ?? 0)), 1);
  const barAreaHeight = Math.max(height - 120, 180);

  return (
    <article className="border border-white/10 bg-[#141412] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">{title}</h2>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#d8d3c6]">
        {series.map((entry) => (
          <div key={entry.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span>{entry.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="relative min-w-190" style={{ height: `${height}px` }}>
          <p
            className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-[11px] text-[#9c9888]"
            style={{ transformOrigin: "left top" }}
          >
            {yAxisLabel}
          </p>

          <div className="absolute bottom-10 left-14 right-2 top-2 border-b border-l border-white/20">
            <div className="flex h-full items-end gap-4 px-3 pb-2">
              {data.map((item) => (
                <div key={item.label} className="flex min-w-32 flex-1 flex-col items-center justify-end gap-2">
                  <div className="flex h-full items-end gap-2">
                    {series.map((entry) => {
                      const value = item.values[entry.key] ?? 0;
                      const barHeight = (value / max) * barAreaHeight;

                      return (
                        <div key={`${item.label}-${entry.key}`} className="flex flex-col items-center justify-end gap-1">
                          <span className="font-mono text-[10px] text-[#f0ece2]">{value}</span>
                          <div
                            className="w-7 rounded-t"
                            style={{
                              height: `${Math.max(barHeight, 4)}px`,
                              backgroundColor: entry.color,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-center text-[11px] text-[#9c9888]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[11px] text-[#9c9888]">{xAxisLabel}</p>
        </div>
      </div>
    </article>
  );
}
