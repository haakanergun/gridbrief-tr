"use client";

import { useMemo, useState } from "react";
import type { ExplorerPoint } from "@/lib/explorer";

export type ExplorerMetricKey =
  | "matchedBids"
  | "matchedOffers"
  | "kgup"
  | "kudup"
  | "eak"
  | "realtimeGeneration"
  | "injectionQuantity"
  | "loadPlan"
  | "realtimeConsumption";

export interface PlanningSeries {
  key: ExplorerMetricKey;
  label: string;
  tone: "primary" | "secondary" | "muted" | "alert";
  dashed?: boolean;
}

interface PlanningChartProps {
  points: ExplorerPoint[];
  series: PlanningSeries[];
  unit?: string;
  label: string;
  loading?: boolean;
}

const WIDTH = 980;
const HEIGHT = 330;
const TOP = 34;
const RIGHT = 26;
const BOTTOM = 48;
const LEFT = 66;

export function PlanningChart({
  points,
  series,
  unit = "MWh",
  label,
  loading = false,
}: PlanningChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chart = useMemo(() => buildChart(points, series), [points, series]);
  const hasVisibleValues = useMemo(
    () => points.some((point) => series.some((item) => isNumber(point[item.key]))),
    [points, series],
  );
  const active = activeIndex === null ? null : points[activeIndex];

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!points.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const rawIndex = ((viewX - LEFT) / (WIDTH - LEFT - RIGHT)) * (points.length - 1);
    setActiveIndex(Math.max(0, Math.min(points.length - 1, Math.round(rawIndex))));
  }

  if (!points.length || !hasVisibleValues) {
    return <div className="planning-chart-empty">Bu kapsam için yayımlanmış saatlik kayıt bulunamadı.</div>;
  }

  return (
    <div className={`planning-chart-shell ${loading ? "is-loading" : ""}`}>
      <div className="planning-chart-legend" aria-label="Grafik lejandı">
        <div>
          {series.map((item) => (
            <span key={item.key}>
              <i className={`planning-legend-line tone-${item.tone} ${item.dashed ? "is-dashed" : ""}`} />
              {item.label}
            </span>
          ))}
        </div>
        <b>{unit}</b>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="planning-chart"
        role="img"
        aria-label={label}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActiveIndex(null)}
      >
        <defs>
          <linearGradient id="planning-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(43, 210, 176, .2)" />
            <stop offset="100%" stopColor="rgba(43, 210, 176, 0)" />
          </linearGradient>
        </defs>
        {chart.ticks.map((tick) => (
          <g key={tick.value}>
            <line x1={LEFT} x2={WIDTH - RIGHT} y1={tick.y} y2={tick.y} className="planning-grid-line" />
            <text x={LEFT - 12} y={tick.y + 4} textAnchor="end" className="planning-axis-label">
              {formatCompact(tick.value)}
            </text>
          </g>
        ))}
        {chart.primaryArea && <path d={chart.primaryArea} className="planning-series-area" />}
        {series.map((item) => (
          <path
            key={item.key}
            d={chart.paths[item.key] ?? ""}
            className={`planning-series tone-${item.tone} ${item.dashed ? "is-dashed" : ""}`}
          />
        ))}
        {points.map((point, index) => {
          if (index % 3 !== 0 && index !== points.length - 1) return null;
          return (
            <text
              key={`${point.timestamp}-${index}`}
              x={chart.xForIndex(index)}
              y={HEIGHT - 17}
              textAnchor="middle"
              className="planning-axis-label planning-axis-hour"
            >
              {point.hour}
            </text>
          );
        })}
        {activeIndex !== null && (
          <line
            x1={chart.xForIndex(activeIndex)}
            x2={chart.xForIndex(activeIndex)}
            y1={TOP}
            y2={HEIGHT - BOTTOM}
            className="planning-cursor"
          />
        )}
      </svg>
      {active && activeIndex !== null && (
        <div
          className="planning-tooltip"
          style={{ left: `${Math.min(88, Math.max(12, (chart.xForIndex(activeIndex) / WIDTH) * 100))}%` }}
        >
          <b>{active.hour}</b>
          {series.map((item) => (
            <span key={item.key}>
              <i className={`tooltip-dot tone-${item.tone}`} />
              {item.label}
              <strong>{formatMetric(active[item.key])} {unit}</strong>
            </span>
          ))}
        </div>
      )}
      <div className="planning-loading-line" />
    </div>
  );
}

function buildChart(points: ExplorerPoint[], series: PlanningSeries[]) {
  const values = points.flatMap((point) =>
    series.flatMap((item) => isNumber(point[item.key]) ? [point[item.key] as number] : []),
  );
  const minRaw = values.length ? Math.min(...values) : 0;
  const maxRaw = values.length ? Math.max(...values) : 1;
  const padding = Math.max(1, (maxRaw - minRaw) * 0.12);
  const min = Math.min(0, minRaw - padding);
  const max = maxRaw + padding;
  const span = Math.max(1, max - min);
  const xForIndex = (index: number) => LEFT + (index / Math.max(1, points.length - 1)) * (WIDTH - LEFT - RIGHT);
  const yForValue = (value: number) => TOP + ((max - value) / span) * (HEIGHT - TOP - BOTTOM);
  const pathFor = (key: ExplorerMetricKey) => {
    let open = false;
    return points.flatMap((point, index) => {
      const value = point[key];
      if (!isNumber(value)) {
        open = false;
        return [];
      }
      const command = open ? "L" : "M";
      open = true;
      return `${command}${xForIndex(index).toFixed(1)},${yForValue(value).toFixed(1)}`;
    }).join(" ");
  };
  const paths = Object.fromEntries(series.map((item) => [item.key, pathFor(item.key)])) as Partial<Record<ExplorerMetricKey, string>>;
  const primary = series[0];
  const primaryPath = primary ? paths[primary.key] ?? "" : "";
  const primaryArea = primaryPath && !primaryPath.includes(" M", 1)
    ? `${primaryPath} L${xForIndex(points.length - 1).toFixed(1)},${(HEIGHT - BOTTOM).toFixed(1)} L${xForIndex(0).toFixed(1)},${(HEIGHT - BOTTOM).toFixed(1)} Z`
    : "";
  const ticks = Array.from({ length: 5 }, (_, index) => {
    const value = min + (span * index) / 4;
    return { value, y: yForValue(value) };
  }).reverse();

  return { paths, primaryArea, ticks, xForIndex };
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatMetric(value: unknown): string {
  return isNumber(value) ? new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(value) : "—";
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
