import { fetchEpiasItems, getEpiasConfigurationStatus } from "./client";
import { GatewayError } from "./errors";
import { buildSignals } from "./signals";
import { syntheticSnapshot } from "./synthetic";
import type { MarketPoint, MarketRequest, MarketSnapshot, SystemDirection } from "./types";

type MetricName = "ptf" | "smf" | "idm" | "load" | "generation" | "systemDirection";

interface EndpointDefinition {
  metric: MetricName;
  label: string;
  path: string;
  valueFields: string[];
  numeric: boolean;
}

const ENDPOINTS: EndpointDefinition[] = [
  {
    metric: "ptf",
    label: "PTF",
    path: "/v1/markets/dam/data/mcp",
    valueFields: ["price"],
    numeric: true,
  },
  {
    metric: "smf",
    label: "SMF",
    path: "/v1/markets/bpm/data/system-marginal-price",
    valueFields: ["systemMarginalPrice"],
    numeric: true,
  },
  {
    metric: "idm",
    label: "GİP ağırlıklı ortalama fiyat",
    path: "/v1/markets/idm/data/weighted-average-price",
    valueFields: ["wap"],
    numeric: true,
  },
  {
    metric: "load",
    label: "gerçek zamanlı tüketim",
    path: "/v1/consumption/data/realtime-consumption",
    valueFields: ["consumption"],
    numeric: true,
  },
  {
    metric: "generation",
    label: "gerçek zamanlı üretim",
    path: "/v1/generation/data/realtime-generation",
    valueFields: ["total"],
    numeric: true,
  },
  {
    metric: "systemDirection",
    label: "sistem yönü",
    path: "/v1/markets/bpm/data/system-direction",
    valueFields: ["systemDirection"],
    numeric: false,
  },
];

function hourTimestamp(date: string, hour: number): string {
  return `${date}T${hour.toString().padStart(2, "0")}:00:00+03:00`;
}

function epiasDate(date: string, hour: number): string {
  return hourTimestamp(date, hour);
}

function extractHour(item: Record<string, unknown>): number | null {
  for (const field of ["hour", "time", "date"]) {
    const value = item[field];
    if (typeof value !== "string") continue;

    const isoMatch = /T(\d{2}):/.exec(value);
    const simpleMatch = /^(\d{1,2})(?::|$)/.exec(value);
    const matched = isoMatch?.[1] ?? simpleMatch?.[1];
    if (matched !== undefined) {
      const hour = Number(matched);
      if (Number.isInteger(hour) && hour >= 0 && hour <= 23) return hour;
    }
  }
  return null;
}

function extractValue(
  item: Record<string, unknown>,
  fields: string[],
  numeric: boolean,
): number | string | null {
  for (const field of fields) {
    const value = item[field];
    if (numeric && typeof value === "number" && Number.isFinite(value)) return value;
    if (!numeric && typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeSystemDirection(value: number | string | null): SystemDirection | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLocaleLowerCase("tr-TR");
  if (
    normalized === "short" ||
    normalized.includes("açık") ||
    normalized.includes("deficit") ||
    normalized.includes("negatif")
  ) {
    return "SHORT";
  }
  if (
    normalized === "long" ||
    normalized.includes("fazla") ||
    normalized.includes("surplus") ||
    normalized.includes("pozitif")
  ) {
    return "LONG";
  }
  if (normalized.includes("denge") || normalized === "balanced") return "BALANCED";
  return null;
}

function emptyPoints(date: string): MarketPoint[] {
  const points: MarketPoint[] = [];
  for (let hour = 0; hour <= 23; hour += 1) {
    points.push({
      timestamp: hourTimestamp(date, hour),
      hour: `${hour.toString().padStart(2, "0")}:00`,
      ptf: null,
      smf: null,
      idm: null,
      load: null,
      generation: null,
      systemDirection: null,
    });
  }
  return points;
}

function errorSummary(error: unknown): string {
  if (error instanceof GatewayError) return error.message;
  return "Unknown upstream failure.";
}

interface LiveDaySnapshot {
  points: MarketPoint[];
  warnings: string[];
  fetchedAt: string;
}

interface CachedLiveDay {
  value: LiveDaySnapshot;
  expiresAt: number;
}

const liveDayCache = new Map<string, CachedLiveDay>();
const pendingLiveDays = new Map<string, Promise<LiveDaySnapshot>>();
const DEFAULT_CACHE_SECONDS = 120;
const MIN_CACHE_SECONDS = 30;
const MAX_CACHE_SECONDS = 900;
const MAX_CACHED_DAYS = 16;

function cacheLifetimeMs(): number {
  const configured = Number(process.env.EPTR_DATA_CACHE_SECONDS);
  const seconds = Number.isFinite(configured)
    ? Math.min(MAX_CACHE_SECONDS, Math.max(MIN_CACHE_SECONDS, configured))
    : DEFAULT_CACHE_SECONDS;
  return seconds * 1_000;
}

function trimLiveDayCache(now: number): void {
  for (const [date, cached] of liveDayCache) {
    if (cached.expiresAt <= now) liveDayCache.delete(date);
  }

  while (liveDayCache.size >= MAX_CACHED_DAYS) {
    const oldestDate = liveDayCache.keys().next().value as string | undefined;
    if (!oldestDate) break;
    liveDayCache.delete(oldestDate);
  }
}

async function fetchLiveDay(date: string): Promise<LiveDaySnapshot> {

  const query = {
    startDate: epiasDate(date, 0),
    endDate: epiasDate(date, 23),
    page: {
      number: 1,
      size: 100,
      sort: { direction: "ASC", field: "date" },
    },
  };

  const settled = await Promise.allSettled(
    ENDPOINTS.map(async (endpoint) => ({
      endpoint,
      items: await fetchEpiasItems(endpoint.path, query),
    })),
  );

  const points = emptyPoints(date);
  const byHour = new Map(points.map((point) => [Number(point.hour.slice(0, 2)), point]));
  const warnings: string[] = [];
  let successfulEndpoints = 0;

  settled.forEach((result, index) => {
    const definition = ENDPOINTS[index];
    if (result.status === "rejected") {
      warnings.push(`${definition.label} alınamadı: ${errorSummary(result.reason)}`);
      return;
    }

    successfulEndpoints += 1;
    for (const item of result.value.items) {
      const hour = extractHour(item);
      if (hour === null) continue;
      const point = byHour.get(hour);
      if (!point) continue;
      const value = extractValue(item, definition.valueFields, definition.numeric);
      if (value !== null) {
        if (definition.metric === "systemDirection") {
          point.systemDirection = normalizeSystemDirection(value);
        } else {
          // Every numeric metric's runtime type is checked by extractValue before assignment.
          (point as unknown as Record<string, unknown>)[definition.metric] = value;
        }
      }
    }
  });

  if (successfulEndpoints === 0) {
    const timeoutOnly = settled.every(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof GatewayError &&
        result.reason.code === "UPSTREAM_TIMEOUT",
    );
    throw new GatewayError(
      timeoutOnly ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
      timeoutOnly
        ? "All EPİAŞ market data requests timed out."
        : "No EPİAŞ market data endpoint returned a usable response.",
      timeoutOnly ? 504 : 502,
    );
  }

  const hasAnyMarketValue = points.some(
    (point) =>
      point.ptf !== null ||
      point.smf !== null ||
      point.idm !== null ||
      point.load !== null ||
      point.generation !== null ||
      point.systemDirection !== null,
  );
  if (!hasAnyMarketValue) {
    throw new GatewayError(
      "UPSTREAM_INVALID_RESPONSE",
      "EPİAŞ returned no usable values for the requested date.",
      502,
    );
  }

  const emptyMetrics = ENDPOINTS.filter((definition) =>
    points.every((point) => point[definition.metric] === null),
  );
  for (const definition of emptyMetrics) {
    if (!warnings.some((warning) => warning.startsWith(definition.label))) {
      warnings.push(`${definition.label} seçilen aralık için veri döndürmedi.`);
    }
  }

  return { points, warnings, fetchedAt: new Date().toISOString() };
}

async function getLiveDay(date: string): Promise<LiveDaySnapshot> {
  const now = Date.now();
  const cached = liveDayCache.get(date);
  if (cached && cached.expiresAt > now) {
    liveDayCache.delete(date);
    liveDayCache.set(date, cached);
    return cached.value;
  }

  const pending = pendingLiveDays.get(date);
  if (pending) return pending;

  const request = fetchLiveDay(date)
    .then((value) => {
      trimLiveDayCache(Date.now());
      liveDayCache.set(date, { value, expiresAt: Date.now() + cacheLifetimeMs() });
      return value;
    })
    .finally(() => {
      pendingLiveDays.delete(date);
    });

  pendingLiveDays.set(date, request);
  return request;
}

export async function getMarketSnapshot(request: MarketRequest): Promise<MarketSnapshot> {
  const configuration = getEpiasConfigurationStatus();
  if (configuration === "disabled") return syntheticSnapshot(request);
  if (configuration === "misconfigured") {
    throw new GatewayError(
      "GATEWAY_MISCONFIGURED",
      "Live EPİAŞ access is enabled but its server configuration is incomplete.",
      503,
    );
  }

  const liveDay = await getLiveDay(request.date);
  const selectedPoints = liveDay.points.filter((point) => {
    const hour = Number(point.hour.slice(0, 2));
    return hour >= request.startHour && hour <= request.endHour;
  });

  return {
    mode: "live",
    source: {
      provider: "EPİAŞ Şeffaflık Platformu 2.0",
      fetchedAt: liveDay.fetchedAt,
      timezone: "Europe/Istanbul",
      note: "Live EPİAŞ services. Units: prices TRY/MWh; consumption and generation MWh. SMF and system direction can be about four hours delayed, consumption about two hours delayed, and generation may be published only through the preceding day. GridBrief scenarios are derived analysis, not EPİAŞ forecasts.",
    },
    scope: {
      date: request.date,
      startHour: request.startHour,
      endHour: request.endHour,
    },
    points: liveDay.points,
    signals: buildSignals(selectedPoints),
    warnings: liveDay.warnings,
  };
}
