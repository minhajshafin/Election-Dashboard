"use client";

import { Fragment, useState, type ReactNode } from "react";
import { getAnalysisLabel } from "@/lib/analysisLabels";
import { DEFAULT_DIVISION_COLORS } from "@/lib/colors";

export { DEFAULT_DIVISION_COLORS };

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

export function MetricCards({ cards }: { cards: MetricCard[] }) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {cards.map((card, idx) => (
        <article
          key={card.label}
          className="border border-[var(--border)] bg-[var(--bg-surface)] p-4 rounded-none transition-all hover:border-[var(--border-active)]"
          style={{ animationDelay: `${idx * 60}ms` }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] truncate">
              {card.label}
            </p>
            <span className="h-1.5 w-1.5 bg-[var(--border)] shrink-0" />
          </div>
          <p className="mt-2 font-serif text-2xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
            {card.value}
          </p>
          {card.detail ? (
            <p className="mt-1 font-mono text-[11px] text-[var(--text-secondary)] truncate" title={card.detail}>
              {card.detail}
            </p>
          ) : null}
        </article>
      ))}
    </section>
  );
}

export function Panel({ title, children, subtitle }: { title: string; children: ReactNode; subtitle?: string }) {
  return (
    <article className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 rounded-none">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-[var(--text-secondary)] font-sans">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

export function HorizontalBarChart({
  title,
  data,
  xAxisLabel,
  yAxisLabel,
  height = 340,
  defaultColor = "#059669",
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
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const max = Math.max(...data.map((item) => Math.abs(item.value)), 1);
  const fillCap = Math.min(100, Math.max(35, maxBarFillPercent));

  return (
    <article className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 rounded-none flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            {data.length} Categories
          </span>
        </div>

        {xAxisLabel || yAxisLabel ? (
          <div className="mt-3 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <span>{yAxisLabel ? `Axis Y: ${yAxisLabel}` : ""}</span>
            <span>{xAxisLabel ? `Axis X: ${xAxisLabel}` : ""}</span>
          </div>
        ) : null}

        <div className="mt-4 space-y-2.5 overflow-y-auto" style={{ minHeight: `${height}px` }}>
          {data.map((item, index) => {
            const width = (Math.abs(item.value) / max) * fillCap;
            const isHovered = hoveredIdx === index;

            return (
              <div
                key={item.label}
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`grid grid-cols-[minmax(130px,1.2fr)_minmax(180px,2fr)] items-center gap-3 px-2 py-1.5 transition-colors ${
                  isHovered ? "bg-[var(--bg-subtle)]" : "hover:bg-[var(--bg-subtle)]/50"
                }`}
              >
                <span
                  className="truncate font-sans text-xs font-medium text-[var(--text-primary)]"
                  title={item.label}
                >
                  {item.label}
                </span>

                <div className="relative h-6 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-none overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 animate-bar-x transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(width, 1.5)}%`,
                      backgroundColor: item.color ?? defaultColor,
                      animationDelay: `${index * 35}ms`,
                      opacity: isHovered ? 1 : 0.9,
                    }}
                  />
                  <span className="absolute inset-y-0 right-2 flex items-center font-mono text-[11px] font-bold text-[var(--text-primary)] tabular-nums">
                    {item.valueLabel ?? formatMetric(item.value, valueDecimals, valueUnit)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
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
  defaultColor = "#1d4ed8",
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const max = Math.max(...data.map((item) => item.value), 1);
  const barAreaHeight = Math.max(height - 110, 160);

  return (
    <article className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 rounded-none flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
          {xAxisLabel}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto no-scrollbar">
        <div className="relative min-w-[340px]" style={{ height: `${height}px` }}>
          <p
            className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]"
            style={{ transformOrigin: "left top" }}
          >
            {yAxisLabel}
          </p>

          <div className="absolute bottom-9 left-10 right-2 top-2 border-b border-l border-[var(--border)]">
            <div className="flex h-full items-end justify-between gap-2 px-2 pb-0">
              {data.map((item, index) => {
                const barHeight = (item.value / max) * barAreaHeight;
                const isHovered = hoveredIndex === index;

                return (
                  <div
                    key={item.label}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="flex flex-1 flex-col items-center justify-end h-full group cursor-pointer"
                  >
                    <span
                      className={`font-mono text-[10px] font-bold text-[var(--text-primary)] mb-1 transition-opacity tabular-nums ${
                        isHovered ? "opacity-100" : "opacity-80"
                      }`}
                    >
                      {item.valueLabel ?? formatMetric(item.value, valueDecimals, valueUnit)}
                    </span>
                    <div
                      className="w-full max-w-[40px] animate-bar-y transition-all duration-500 rounded-none"
                      style={{
                        height: `${Math.max(barHeight, 3)}px`,
                        backgroundColor: item.color ?? defaultColor,
                        animationDelay: `${index * 40}ms`,
                        filter: isHovered ? "brightness(1.15)" : "none",
                      }}
                    />
                    <span
                      className="w-full mt-2 truncate text-center font-mono text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                      title={item.label}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="absolute bottom-0 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            {xAxisLabel}
          </p>
        </div>
      </div>
    </article>
  );
}

export function HistogramChart({
  title,
  data,
  xAxisLabel,
  yAxisLabel,
  height = 320,
  color = "#059669",
}: {
  title: string;
  data: HistogramDatum[];
  xAxisLabel: string;
  yAxisLabel: string;
  height?: number;
  color?: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const max = Math.max(...data.map((item) => item.count), 1);
  const barAreaHeight = Math.max(height - 110, 160);

  return (
    <article className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 rounded-none flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
          Histogram ({data.length} Bins)
        </span>
      </div>

      <div className="mt-4 overflow-x-auto no-scrollbar">
        <div className="relative min-w-[340px]" style={{ height: `${height}px` }}>
          <p
            className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]"
            style={{ transformOrigin: "left top" }}
          >
            {yAxisLabel}
          </p>

          <div className="absolute bottom-9 left-10 right-2 top-2 border-b border-l border-[var(--border)]">
            <div className="flex h-full items-end gap-1.5 px-1 pb-0">
              {data.map((item, index) => {
                const barHeight = (item.count / max) * barAreaHeight;
                const isHovered = hoveredIndex === index;

                return (
                  <div
                    key={item.label}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="flex flex-1 flex-col items-center justify-end h-full group cursor-pointer"
                  >
                    <span
                      className={`font-mono text-[10px] font-bold text-[var(--text-primary)] mb-1 tabular-nums transition-opacity ${
                        isHovered ? "opacity-100" : "opacity-75"
                      }`}
                    >
                      {item.count}
                    </span>
                    <div
                      className="w-full animate-bar-y transition-all duration-500 rounded-none border-t border-x border-[var(--border)]"
                      style={{
                        height: `${Math.max(barHeight, 2)}px`,
                        backgroundColor: color,
                        animationDelay: `${index * 30}ms`,
                        filter: isHovered ? "brightness(1.2)" : "none",
                      }}
                    />
                    <span
                      className="w-full mt-2 truncate text-center font-mono text-[9px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                      title={item.label}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="absolute bottom-0 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            {xAxisLabel}
          </p>
        </div>
      </div>
    </article>
  );
}

export function CorrelationHeatmap({
  title,
  columns,
  matrix,
  highlightKey = "turnout_pct",
  height = 480,
}: {
  title: string;
  columns: string[];
  matrix: number[][];
  highlightKey?: string;
  height?: number;
}) {
  const [activeCell, setActiveCell] = useState<{
    row: number;
    col: number;
    value: number;
    left: string;
    right: string;
  } | null>(null);

  function getCellColor(value: number): string {
    const clamped = Math.max(-1, Math.min(1, value));
    if (clamped > 0) {
      // Emerald / positive
      const alpha = Math.min(Math.max(Math.abs(clamped) * 0.85, 0.08), 0.95);
      return `rgba(5, 150, 105, ${alpha.toFixed(2)})`;
    }
    if (clamped < 0) {
      // Crimson / negative
      const alpha = Math.min(Math.max(Math.abs(clamped) * 0.85, 0.08), 0.95);
      return `rgba(220, 38, 38, ${alpha.toFixed(2)})`;
    }
    return "transparent";
  }

  function getCorrelationVerdict(val: number): string {
    const abs = Math.abs(val);
    const sign = val > 0 ? "Positive" : "Negative";
    if (abs >= 0.7) return `Strong ${sign}`;
    if (abs >= 0.4) return `Moderate ${sign}`;
    if (abs >= 0.2) return `Weak ${sign}`;
    return "Neutral / Negligible";
  }

  return (
    <article className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 rounded-none" style={{ minHeight: height }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-subtle)] pb-3 gap-2">
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)] font-sans">
            Pairwise Pearson coefficient (r) measuring linear association between electoral and demographic attributes.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 bg-[#dc2626]/85 inline-block" />
            <span>r = -1.0</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 bg-[var(--bg-subtle)] border border-[var(--border)] inline-block" />
            <span>0.0</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 bg-[#059669]/85 inline-block" />
            <span>r = +1.0</span>
          </div>
        </div>
      </div>

      {/* Active Inspector Callout Banner */}
      <div className="mt-3 min-h-[38px] px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-between text-xs">
        {activeCell ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 font-mono">
              <span className="font-semibold text-[var(--text-primary)]">{getAnalysisLabel(activeCell.left)}</span>
              <span className="text-[var(--text-muted)]">×</span>
              <span className="font-semibold text-[var(--text-primary)]">{getAnalysisLabel(activeCell.right)}</span>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                {getCorrelationVerdict(activeCell.value)}
              </span>
              <span
                className={`font-bold tabular-nums px-2 py-0.5 text-xs ${
                  activeCell.value > 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : activeCell.value < 0
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : "text-[var(--text-primary)]"
                }`}
              >
                r = {activeCell.value > 0 ? `+${activeCell.value.toFixed(3)}` : activeCell.value.toFixed(3)}
              </span>
            </div>
          </div>
        ) : (
          <p className="font-mono text-[11px] text-[var(--text-muted)]">
            Hover over any cell in the matrix to inspect exact coefficients and qualitative strength.
          </p>
        )}
      </div>

      {/* Matrix Table */}
      <div className="mt-3 overflow-x-auto no-scrollbar" style={{ minHeight: height }}>
        <div className="min-w-[680px]">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `140px repeat(${columns.length}, minmax(44px, 1fr))`,
            }}
          >
            {/* Header row */}
            <div className="p-2 font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider border-b border-r border-[var(--border)]">
              Feature Matrix
            </div>
            {columns.map((col) => {
              const isTargetCol = col === highlightKey;
              return (
                <div
                  key={`col-${col}`}
                  className={`p-1.5 text-center font-mono text-[9px] uppercase tracking-wider border-b border-r border-[var(--border)] truncate ${
                    isTargetCol
                      ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold"
                      : "text-[var(--text-secondary)]"
                  }`}
                  title={getAnalysisLabel(col)}
                >
                  {getAnalysisLabel(col).slice(0, 8)}
                </div>
              );
            })}

            {/* Matrix Data Rows */}
            {columns.map((rowFeature, rowIndex) => {
              const isTargetRow = rowFeature === highlightKey;
              return (
                <Fragment key={`row-${rowFeature}`}>
                  <div
                    className={`p-2 font-mono text-[10px] border-b border-r border-[var(--border)] truncate ${
                      isTargetRow
                        ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold"
                        : "text-[var(--text-secondary)]"
                    }`}
                    title={getAnalysisLabel(rowFeature)}
                  >
                    {getAnalysisLabel(rowFeature)}
                  </div>
                  {matrix[rowIndex].map((val, colIndex) => {
                    const isHovered = activeCell?.row === rowIndex && activeCell?.col === colIndex;
                    const isSelf = rowIndex === colIndex;
                    const bg = isSelf ? "var(--bg-subtle)" : getCellColor(val);

                    return (
                      <div
                        key={`cell-${rowIndex}-${colIndex}`}
                        onMouseEnter={() =>
                          setActiveCell({
                            row: rowIndex,
                            col: colIndex,
                            value: val,
                            left: rowFeature,
                            right: columns[colIndex],
                          })
                        }
                        onMouseLeave={() => setActiveCell(null)}
                        className={`h-9 flex items-center justify-center font-mono text-[10px] font-bold border-b border-r border-[var(--border-subtle)] transition-transform cursor-pointer select-none ${
                          isHovered ? "scale-105 z-10 shadow-sm border-[var(--border-active)]" : ""
                        }`}
                        style={{
                          backgroundColor: bg,
                          color: Math.abs(val) > 0.6 ? "#ffffff" : "var(--text-primary)",
                        }}
                      >
                        {val.toFixed(2)}
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
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
  valueDecimals = 4,
  valueUnit = "",
  positiveColor = "#059669",
  negativeColor = "#dc2626",
}: {
  title: string;
  data: BarDatum[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  valueDecimals?: number;
  valueUnit?: string;
  positiveColor?: string;
  negativeColor?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const max = Math.max(...data.map((item) => Math.abs(item.value)), 0.001);

  return (
    <article className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 rounded-none flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 inline-block bg-emerald-500" /> Positive Impact
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 inline-block bg-red-500" /> Negative Impact
            </span>
          </div>
        </div>

        {xAxisLabel || yAxisLabel ? (
          <div className="mt-3 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <span>{yAxisLabel ? `Feature: ${yAxisLabel}` : ""}</span>
            <span>{xAxisLabel ? `Impact: ${xAxisLabel}` : ""}</span>
          </div>
        ) : null}

        <div className="mt-4 space-y-2.5 overflow-y-auto" style={{ minHeight: `${height}px` }}>
          {data.map((item, index) => {
            const isPositive = item.value >= 0;
            const widthPct = (Math.abs(item.value) / max) * 48; // max 48% on each side of zero
            const isHovered = hoveredIdx === index;

            return (
              <div
                key={item.label}
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`grid grid-cols-[140px_1fr_70px] items-center gap-2 px-2 py-1.5 transition-colors ${
                  isHovered ? "bg-[var(--bg-subtle)]" : "hover:bg-[var(--bg-subtle)]/50"
                }`}
              >
                <span
                  className="truncate font-sans text-xs font-medium text-[var(--text-primary)]"
                  title={item.label}
                >
                  {item.label}
                </span>

                {/* Split canvas with center zero axis */}
                <div className="relative h-6 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center">
                  {/* Center vertical dashed line */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-px border-r border-dashed border-[var(--border-active)] z-10" />

                  {isPositive ? (
                    <div
                      className="absolute left-1/2 top-0 bottom-0 animate-bar-x transition-all duration-700"
                      style={{
                        width: `${Math.max(widthPct, 1)}%`,
                        backgroundColor: positiveColor,
                        transformOrigin: "left",
                        opacity: isHovered ? 1 : 0.85,
                      }}
                    />
                  ) : (
                    <div
                      className="absolute right-1/2 top-0 bottom-0 transition-all duration-700"
                      style={{
                        width: `${Math.max(widthPct, 1)}%`,
                        backgroundColor: negativeColor,
                        transformOrigin: "right",
                        opacity: isHovered ? 1 : 0.85,
                      }}
                    />
                  )}
                </div>

                <span
                  className={`text-right font-mono text-[11px] font-bold tabular-nums ${
                    isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {isPositive ? `+${item.value.toFixed(valueDecimals)}${valueUnit}` : `${item.value.toFixed(valueDecimals)}${valueUnit}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export function ScatterPlot({
  title,
  data,
  points,
  xAxisLabel,
  yAxisLabel,
  height = 380,
  showRegressionLine,
  showReferenceLine,
  groupColors,
}: {
  title: string;
  data?: ScatterPoint[];
  points?: ScatterPoint[];
  xAxisLabel: string;
  yAxisLabel: string;
  height?: number;
  showRegressionLine?: boolean;
  showReferenceLine?: boolean;
  groupColors?: Record<string, string>;
  xUnit?: string;
  yUnit?: string;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<ScatterPoint | null>(null);

  const rawList = data ?? points ?? [];
  const cleanData = rawList.filter((p) => p !== null && !isNaN(p.x) && !isNaN(p.y));
  const showLine = showRegressionLine ?? showReferenceLine ?? true;
  const xValues = cleanData.map((p) => p.x);
  const yValues = cleanData.map((p) => p.y);

  const minX = Math.min(...xValues, 30);
  const maxX = Math.max(...xValues, 90);
  const minY = Math.min(...yValues, 30);
  const maxY = Math.max(...yValues, 90);

  const padding = 45;
  const svgWidth = 560;
  const svgHeight = height - 70;

  function scaleX(val: number) {
    return padding + ((val - minX) / (maxX - minX)) * (svgWidth - padding * 2);
  }

  function scaleY(val: number) {
    return svgHeight - padding - ((val - minY) / (maxY - minY)) * (svgHeight - padding * 2);
  }

  const effectiveColors = groupColors ?? DEFAULT_DIVISION_COLORS;

  return (
    <article className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 rounded-none flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            {cleanData.length} Constituencies
          </span>
        </div>

        {/* Hover Inspector Card */}
        <div className="mt-3 min-h-[34px] px-3 py-1.5 bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-between text-xs">
          {hoveredPoint ? (
            <div className="flex items-center justify-between w-full font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0"
                  style={{ backgroundColor: effectiveColors[hoveredPoint.group] ?? "#9ca3af" }}
                />
                <span className="font-bold text-[var(--text-primary)]">{hoveredPoint.label}</span>
                <span className="text-[var(--text-muted)]">({hoveredPoint.group})</span>
                {hoveredPoint.detail ? (
                  <span className="text-[var(--text-secondary)]">· {hoveredPoint.detail}</span>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <span>
                  Actual: <b className="text-[var(--text-primary)]">{hoveredPoint.x.toFixed(1)}%</b>
                </span>
                <span>
                  Predicted: <b className="text-[var(--text-primary)]">{hoveredPoint.y.toFixed(1)}%</b>
                </span>
                <span
                  className={
                    hoveredPoint.y - hoveredPoint.x >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  Δ {(hoveredPoint.y - hoveredPoint.x).toFixed(1)}%
                </span>
              </div>
            </div>
          ) : (
            <p className="font-mono text-[10px] text-[var(--text-muted)]">
              Hover over any constituency point to inspect actual vs. predicted values and residual error.
            </p>
          )}
        </div>

        {/* SVG Canvas */}
        <div className="mt-3 relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            {/* Grid lines */}
            <line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={svgHeight - padding}
              stroke="var(--border)"
              strokeWidth="1"
            />
            <line
              x1={padding}
              y1={svgHeight - padding}
              x2={svgWidth - padding}
              y2={svgHeight - padding}
              stroke="var(--border)"
              strokeWidth="1"
            />

            {/* Dotted 45-degree diagonal reference line (x = y) */}
            {showLine ? (
              <line
                x1={scaleX(minX)}
                y1={scaleY(minX)}
                x2={scaleX(maxX)}
                y2={scaleY(maxX)}
                stroke="var(--border-active)"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity="0.45"
              />
            ) : null}

            {/* Scatter Points */}
            {cleanData.map((pt, idx) => {
              const cx = scaleX(pt.x);
              const cy = scaleY(pt.y);
              const isHovered = hoveredPoint?.label === pt.label;
              const color = effectiveColors[pt.group] ?? "#3b82f6";

              return (
                <circle
                  key={pt.label}
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : 3.5}
                  fill={color}
                  stroke="var(--bg-surface)"
                  strokeWidth={isHovered ? 2 : 0.8}
                  className="animate-point-pop cursor-pointer transition-transform"
                  style={{
                    animationDelay: `${(idx % 25) * 20}ms`,
                    opacity: hoveredPoint && !isHovered ? 0.35 : 0.9,
                  }}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              );
            })}

            {/* Axis Tick Labels */}
            <text
              x={padding}
              y={svgHeight - padding + 18}
              fontFamily="var(--font-mono)"
              fontSize="9"
              fill="var(--text-muted)"
            >
              {minX.toFixed(0)}%
            </text>
            <text
              x={svgWidth - padding}
              y={svgHeight - padding + 18}
              textAnchor="end"
              fontFamily="var(--font-mono)"
              fontSize="9"
              fill="var(--text-muted)"
            >
              {maxX.toFixed(0)}%
            </text>
            <text
              x={padding - 8}
              y={svgHeight - padding}
              textAnchor="end"
              fontFamily="var(--font-mono)"
              fontSize="9"
              fill="var(--text-muted)"
            >
              {minY.toFixed(0)}%
            </text>
            <text
              x={padding - 8}
              y={padding + 8}
              textAnchor="end"
              fontFamily="var(--font-mono)"
              fontSize="9"
              fill="var(--text-muted)"
            >
              {maxY.toFixed(0)}%
            </text>

            {/* Axis Titles */}
            <text
              x={svgWidth / 2}
              y={svgHeight - 6}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="9"
              fontWeight="600"
              fill="var(--text-muted)"
              className="uppercase tracking-wider"
            >
              {xAxisLabel}
            </text>
            <text
              x={14}
              y={svgHeight / 2}
              transform={`rotate(-90 14 ${svgHeight / 2})`}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="9"
              fontWeight="600"
              fill="var(--text-muted)"
              className="uppercase tracking-wider"
            >
              {yAxisLabel}
            </text>
          </svg>
        </div>

        {/* Axis Titles & Division / Group Color Legend */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2.5">
          <div className="flex flex-wrap items-center gap-3">
            {Object.entries(effectiveColors).map(([div, col]) => (
              <span key={div} className="flex items-center gap-1 font-mono text-[9px] uppercase text-[var(--text-muted)]">
                <span className="h-2 w-2 shrink-0 inline-block" style={{ backgroundColor: col }} />
                {div}
              </span>
            ))}
          </div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
            Dashed: 45° Ideal Fit
          </span>
        </div>
      </div>
    </article>
  );
}

export function RadarComparison({
  title,
  axes,
  series,
  height = 380,
}: {
  title: string;
  axes: string[];
  series: RadarSeries[];
  height?: number;
}) {
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);

  const centerX = 200;
  const centerY = 190;
  const radius = 120;
  const axisCount = axes.length;

  function getCoordinates(index: number, value: number) {
    const angle = -Math.PI / 2 + (index * (Math.PI * 2)) / axisCount;
    const x = centerX + Math.cos(angle) * radius * value;
    const y = centerY + Math.sin(angle) * radius * value;
    return { x, y };
  }

  function polygonPoints(values: number[]): string {
    return values.map((val, idx) => {
      const { x, y } = getCoordinates(idx, val);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }

  // Web rings at 0.25, 0.5, 0.75, 1.0
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <article className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 rounded-none" style={{ minHeight: height }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-subtle)] pb-3 gap-2">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[10px]">
          {series.map((s) => {
            const isSelected = selectedSeries === s.name;
            return (
              <button
                type="button"
                key={s.name}
                onClick={() => setSelectedSeries(isSelected ? null : s.name)}
                className={`flex items-center gap-1.5 px-2 py-0.5 border cursor-pointer transition-all ${
                  isSelected
                    ? "border-[var(--text-primary)] bg-[var(--bg-subtle)] font-bold text-[var(--text-primary)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="h-2 w-2 shrink-0 inline-block" style={{ backgroundColor: s.color }} />
                <span>{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center justify-center">
        <svg viewBox="0 0 400 380" className="w-full max-w-[440px] h-auto overflow-visible select-none">
          {/* Concentric rings */}
          {rings.map((ring) => (
            <polygon
              key={`ring-${ring}`}
              points={polygonPoints(new Array(axisCount).fill(ring))}
              fill="none"
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray={ring < 1.0 ? "2 2" : "none"}
            />
          ))}

          {/* Radial axis lines and labels */}
          {axes.map((axis, idx) => {
            const outer = getCoordinates(idx, 1.0);
            const labelCoord = getCoordinates(idx, 1.2);
            return (
              <Fragment key={`axis-${axis}`}>
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="var(--border)"
                  strokeWidth="1"
                />
                <text
                  x={labelCoord.x}
                  y={labelCoord.y + 4}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize="9"
                  fontWeight="600"
                  fill="var(--text-muted)"
                  className="uppercase tracking-wider"
                >
                  {axis}
                </text>
              </Fragment>
            );
          })}

          {/* Radar Series Polygons */}
          {series.map((s) => {
            const isDimmed = selectedSeries && selectedSeries !== s.name;
            const isSelected = selectedSeries === s.name;

            return (
              <g
                key={`series-${s.name}`}
                className="transition-opacity duration-300"
                style={{ opacity: isDimmed ? 0.15 : 1 }}
              >
                <polygon
                  points={polygonPoints(s.values)}
                  fill={s.color}
                  fillOpacity={isSelected ? 0.35 : 0.18}
                  stroke={s.color}
                  strokeWidth={isSelected ? 2.5 : 1.6}
                  className="transition-all duration-300"
                />
                {s.values.map((val, vIdx) => {
                  const { x, y } = getCoordinates(vIdx, val);
                  return (
                    <circle
                      key={`pt-${vIdx}`}
                      cx={x}
                      cy={y}
                      r={isSelected ? 4 : 2.5}
                      fill={s.color}
                      stroke="var(--bg-surface)"
                      strokeWidth="1"
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
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
  height = 340,
}: {
  title: string;
  data: GroupedBarDatum[];
  series: GroupedSeries[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
}) {
  const allValues = data.flatMap((d) => Object.values(d.values));
  const max = Math.max(...allValues, 1);

  return (
    <article className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 rounded-none flex flex-col justify-between" style={{ minHeight: height }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-subtle)] pb-3 gap-2">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          {yAxisLabel ? (
            <span className="text-[var(--text-muted)] uppercase tracking-wider mr-1">
              {yAxisLabel}
            </span>
          ) : null}
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <span className="h-2 w-2 shrink-0 inline-block" style={{ backgroundColor: s.color }} />
              <span>{s.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto no-scrollbar">
        <div className="min-w-[420px] space-y-4">
          {data.map((row) => (
            <div key={row.label} className="border-b border-[var(--border-subtle)] pb-3 last:border-0">
              <div className="font-sans text-xs font-semibold text-[var(--text-primary)] mb-2">
                {row.label}
              </div>
              <div className="space-y-1.5">
                {series.map((s) => {
                  const val = row.values[s.key] ?? 0;
                  const width = (val / max) * 100;
                  return (
                    <div key={s.key} className="grid grid-cols-[80px_1fr_45px] items-center gap-2">
                      <span className="font-mono text-[10px] text-[var(--text-muted)] truncate">{s.label}</span>
                      <div className="relative h-4 bg-[var(--bg-subtle)] overflow-hidden">
                        <div
                          className="h-full animate-bar-x transition-all duration-500"
                          style={{
                            width: `${Math.max(width, 1.5)}%`,
                            backgroundColor: s.color,
                          }}
                        />
                      </div>
                      <span className="font-mono text-[10px] font-bold text-[var(--text-primary)] tabular-nums text-right">
                        {val}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {xAxisLabel ? (
          <div className="mt-2 text-right font-mono text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
            {xAxisLabel}
          </div>
        ) : null}
      </div>
    </article>
  );
}
