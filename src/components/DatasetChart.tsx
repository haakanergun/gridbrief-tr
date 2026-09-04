import { useId, type CSSProperties } from "react";

export interface DatasetChartPoint {
  label: string;
  value: number;
}

interface DatasetChartProps {
  points: DatasetChartPoint[];
  seriesLabel: string;
  unit?: string | null;
}

const styles: Record<string, CSSProperties> = {
  figure: {
    margin: 0,
    padding: "18px 0 4px",
    borderTop: "1px solid var(--line-soft)",
  },
  heading: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  title: {
    color: "var(--text-soft)",
    fontSize: 10,
    fontWeight: 750,
  },
  range: {
    color: "var(--muted)",
    fontSize: 8,
    fontVariantNumeric: "tabular-nums",
  },
  plot: {
    display: "block",
    width: "100%",
    height: "auto",
    overflow: "visible",
  },
  caption: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 7,
    color: "var(--muted)",
    fontSize: 8,
  },
};

const WIDTH = 640;
const HEIGHT = 190;
const PAD_X = 10;
const PAD_Y = 14;

function numberLabel(value: number, unit?: string | null): string {
  const formatted = new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
  }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function DatasetChart({ points, seriesLabel, unit }: DatasetChartProps) {
  const titleId = useId();
  const descriptionId = useId();
  if (points.length < 2) return null;

  const values = points.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = maximum - minimum || 1;
  const innerWidth = WIDTH - PAD_X * 2;
  const innerHeight = HEIGHT - PAD_Y * 2;
  const coordinates = points.map((point, index) => ({
    x: PAD_X + (index / (points.length - 1)) * innerWidth,
    y: PAD_Y + ((maximum - point.value) / span) * innerHeight,
  }));
  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const area = `${path} L ${coordinates.at(-1)?.x.toFixed(2)} ${HEIGHT - PAD_Y} L ${PAD_X} ${HEIGHT - PAD_Y} Z`;
  const description = `${seriesLabel}: en düşük ${numberLabel(minimum, unit)}, en yüksek ${numberLabel(maximum, unit)}.`;

  return (
    <figure style={styles.figure} aria-label={`${seriesLabel} zaman serisi`}>
      <div style={styles.heading}>
        <strong style={styles.title}>{seriesLabel}</strong>
        <span style={styles.range}>{numberLabel(minimum, unit)} — {numberLabel(maximum, unit)}</span>
      </div>
      <svg
        style={styles.plot}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>{seriesLabel}</title>
        <desc id={descriptionId}>{description}</desc>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = PAD_Y + ratio * innerHeight;
          return (
            <line
              key={ratio}
              x1={PAD_X}
              x2={WIDTH - PAD_X}
              y1={y}
              y2={y}
              stroke="#dfe7e4"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        <path d={area} fill="rgba(0, 127, 109, 0.08)" />
        <path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {coordinates.length <= 48 && coordinates.map((point, index) => (
          <circle
            key={`${points[index]?.label}-${index}`}
            cx={point.x}
            cy={point.y}
            r="2.5"
            fill="#ffffff"
            stroke="var(--accent)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <figcaption style={styles.caption}>
        <span>{points[0]?.label}</span>
        <span>{points.at(-1)?.label}</span>
      </figcaption>
    </figure>
  );
}
