export type MarketMode = "live" | "synthetic";
export type PositionSide = "short" | "long";
export type Severity = "high" | "medium" | "watch";

export interface AnalysisScope {
  date: string;
  startHour: number;
  endHour: number;
  positionMwh: number;
  side: PositionSide;
}

export interface MarketPoint {
  timestamp: string;
  hour: string;
  ptf: number | null;
  smf: number | null;
  idm: number | null;
  load: number | null;
  generation: number | null;
  systemDirection: "SHORT" | "LONG" | "BALANCED" | null;
}

export interface MarketSignal {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  metric: string;
  sourceTimestamp: string;
  coverage: "high" | "medium" | "low";
}

export interface MarketSnapshot {
  mode: MarketMode;
  source: {
    provider: string;
    fetchedAt: string;
    timezone?: string;
    note: string;
  };
  scope: Pick<AnalysisScope, "date" | "startHour" | "endHour">;
  points: MarketPoint[];
  signals: MarketSignal[];
  warnings?: string[];
}

export interface StressResult {
  side: PositionSide;
  positionMwh: number;
  referencePrice: number | null;
  adversePrice: number | null;
  estimatedExposureTry: number | null;
  contextPeakHour: string;
  calculation: string;
  disclaimer: string;
}

export const DEFAULT_SCOPE: AnalysisScope = {
  date: "2026-09-04",
  startHour: 17,
  endHour: 22,
  positionMwh: 50,
  side: "short",
};

export function calculateStress(
  snapshot: MarketSnapshot,
  positionMwh: number,
  side: PositionSide,
): StressResult {
  const scoped = snapshot.points.filter((_, index) => {
    const hour = Number(snapshot.points[index]?.hour.slice(0, 2));
    return hour >= snapshot.scope.startHour && hour <= snapshot.scope.endHour;
  });
  const points = scoped.length ? scoped : snapshot.points;
  const referencePrice = average(
    points.flatMap((point) => (isNumber(point.ptf) ? [point.ptf] : [])),
  );
  const idmPoints = points.filter(
    (point): point is MarketPoint & { idm: number } => isNumber(point.idm),
  );
  const adversePoint = idmPoints.reduce<MarketPoint & { idm: number } | undefined>(
    (current, point) => {
      if (!current) return point;
      if (side === "short") return point.idm > current.idm ? point : current;
      return point.idm < current.idm ? point : current;
    },
    undefined,
  );
  const adversePrice = adversePoint?.idm ?? null;
  const spread =
    referencePrice === null || adversePrice === null
      ? null
      : side === "short"
        ? adversePrice - referencePrice
        : referencePrice - adversePrice;
  const estimatedExposureTry =
    spread === null ? null : Math.max(0, spread) * Math.max(0, positionMwh);

  return {
    side,
    positionMwh,
    referencePrice: referencePrice === null ? null : round(referencePrice),
    adversePrice: adversePrice === null ? null : round(adversePrice),
    estimatedExposureTry:
      estimatedExposureTry === null ? null : Math.round(estimatedExposureTry),
    contextPeakHour: adversePoint?.hour ?? "—",
    calculation:
      spread === null
        ? "Unavailable: both PTF and IDM observations are required."
        : `${positionMwh} MWh × ${round(Math.max(0, spread))} TRY/MWh adverse spread`,
    disclaimer: "Illustrative sensitivity, not a forecast, order recommendation, or settlement calculation.",
  };
}

export function draftBrief(snapshot: MarketSnapshot, stress: StressResult): string[] {
  const direction = stress.side === "short" ? "short" : "long";
  const topSignals = snapshot.signals.slice(0, 3).map((signal) => signal.title.toLowerCase());
  return [
    `Monitor the ${snapshot.scope.startHour}:00–${snapshot.scope.endHour}:00 delivery window; the current scenario is ${stress.positionMwh} MWh ${direction}.`,
    stress.estimatedExposureTry === null
      ? "Illustrative exposure is unavailable because the selected window is missing PTF or IDM observations."
      : `Illustrative adverse exposure is ${formatTry(stress.estimatedExposureTry)}; the selected-window IDM context peak is at ${stress.contextPeakHour}.`,
    topSignals.length
      ? `Primary evidence to re-check: ${topSignals.join("; ")}.`
      : "No ranked evidence is available yet; refresh the market snapshot before deciding.",
    "Human review required: confirm position, data publication times, and portfolio-specific constraints before acting.",
  ];
}

export function formatTry(value: number | null | undefined): string {
  if (!isNumber(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (!isNumber(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
