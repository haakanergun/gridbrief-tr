"use client";

import { useMemo, useState } from "react";
import type { MarketPoint } from "@/lib/market";

interface MarketChartProps {
  points: MarketPoint[];
  startHour: number;
  endHour: number;
  loading?: boolean;
}

const WIDTH = 960;
const HEIGHT = 300;
const TOP = 28;
const BOTTOM = 46;
const LEFT = 52;
const RIGHT = 22;

export function MarketChart({ points, startHour, endHour, loading = false }: MarketChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chart = useMemo(() => buildChart(points), [points]);
  const active = activeIndex === null ? null : points[activeIndex];
  const activeCursorValue = active
    ? [active.ptf, active.idm, active.smf].find(isNumber) ?? null
    : null;
  const riskStart = chart.xForIndex(Math.max(0, startHour));
  const riskEnd = chart.xForIndex(Math.min(points.length - 1, endHour));

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!points.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const index = Math.round(((viewX - LEFT) / (WIDTH - LEFT - RIGHT)) * (points.length - 1));
    setActiveIndex(Math.max(0, Math.min(points.length - 1, index)));
  }

  if (!points.length) {
    return <div className="chart-empty">Waiting for a market snapshot…</div>;
  }

  return (
    <div className={`chart-shell ${loading ? "is-loading" : ""}`}>
      <div className="chart-legend" aria-label="Chart legend">
        <span><i className="legend-line legend-ptf" />PTF</span>
        <span><i className="legend-line legend-idm" />IDM WAP</span>
        <span><i className="legend-line legend-smf" />SMF</span>
        <span className="chart-unit">TRY / MWh</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="market-chart"
        role="img"
        aria-label="Hourly PTF, intraday weighted average, and SMF prices"
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActiveIndex(null)}
      >
        <defs>
          <pattern id="micro-grid" width="37" height="37" patternUnits="userSpaceOnUse">
            <path d="M 37 0 L 0 0 0 37" fill="none" stroke="rgba(255,255,255,.035)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#micro-grid)" />
        <rect
          x={riskStart}
          y={TOP}
          width={Math.max(8, riskEnd - riskStart)}
          height={HEIGHT - TOP - BOTTOM}
          className="risk-window"
        />
        <text x={riskStart + 9} y={TOP + 17} className="risk-label">DELIVERY WINDOW</text>
        {chart.ticks.map((tick) => (
          <g key={tick.value}>
            <line x1={LEFT} x2={WIDTH - RIGHT} y1={tick.y} y2={tick.y} className="grid-line" />
            <text x={LEFT - 10} y={tick.y + 4} textAnchor="end" className="axis-label">
              {Math.round(tick.value).toLocaleString("en-US")}
            </text>
          </g>
        ))}
        <path d={chart.smfPath} className="series series-smf" />
        <path d={chart.idmPath} className="series series-idm" />
        <path d={chart.ptfPath} className="series series-ptf" />
        {points.map((point, index) => {
          if (index % 3 !== 0 && index !== points.length - 1) return null;
          return (
            <text key={point.timestamp} x={chart.xForIndex(index)} y={HEIGHT - 16} textAnchor="middle" className="axis-label axis-hour">
              {point.hour}
            </text>
          );
        })}
        {active && activeIndex !== null && activeCursorValue !== null && (
          <g className="chart-cursor">
            <line
              x1={chart.xForIndex(activeIndex)}
              x2={chart.xForIndex(activeIndex)}
              y1={TOP}
              y2={HEIGHT - BOTTOM}
            />
            <circle cx={chart.xForIndex(activeIndex)} cy={chart.yForValue(activeCursorValue)} r="5" />
          </g>
        )}
      </svg>
      {active && activeIndex !== null && (
        <div className="chart-tooltip" style={{ left: `${(chart.xForIndex(activeIndex) / WIDTH) * 100}%` }}>
          <b>{active.hour}</b>
          <span>PTF {formatChartValue(active.ptf)}</span>
          <span>IDM {formatChartValue(active.idm)}</span>
          <span>SMF {formatChartValue(active.smf)}</span>
        </div>
      )}
      <div className="chart-loading-line" />
    </div>
  );
}

function buildChart(points: MarketPoint[]) {
  const values = points
    .flatMap((point) => [point.ptf, point.smf, point.idm])
    .filter(isNumber);
  const minRaw = values.length ? Math.min(...values) : 0;
  const maxRaw = values.length ? Math.max(...values) : 1;
  const padding = Math.max(100, (maxRaw - minRaw) * 0.16);
  const min = Math.floor((minRaw - padding) / 100) * 100;
  const max = Math.ceil((maxRaw + padding) / 100) * 100;
  const span = Math.max(1, max - min);
  const xForIndex = (index: number) => LEFT + (index / Math.max(1, points.length - 1)) * (WIDTH - LEFT - RIGHT);
  const yForValue = (value: number) => TOP + ((max - value) / span) * (HEIGHT - TOP - BOTTOM);
  const line = (key: "ptf" | "smf" | "idm") => {
    let openSegment = false;
    return points.flatMap((point, index) => {
      const value = point[key];
      if (!isNumber(value)) {
        openSegment = false;
        return [];
      }
      const command = openSegment ? "L" : "M";
      openSegment = true;
      return `${command}${xForIndex(index).toFixed(1)},${yForValue(value).toFixed(1)}`;
    }).join(" ");
  };
  const ticks = Array.from({ length: 5 }, (_, index) => {
    const value = min + (span * index) / 4;
    return { value, y: yForValue(value) };
  }).reverse();

  return {
    ptfPath: line("ptf"),
    smfPath: line("smf"),
    idmPath: line("idm"),
    xForIndex,
    yForValue,
    ticks,
  };
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatChartValue(value: number | null): string {
  return isNumber(value) ? Math.round(value).toLocaleString("en-US") : "—";
}
