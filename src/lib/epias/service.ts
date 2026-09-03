import { fetchEpiasItems, hasEpiasCredentials } from "./client";
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

function emptyPoints(request: MarketRequest): MarketPoint[] {
  const points: MarketPoint[] = [];
  for (let hour = 0; hour <= 23; hour += 1) {
    points.push({
      timestamp: hourTimestamp(request.date, hour),
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

export async function getMarketSnapshot(request: MarketRequest): Promise<MarketSnapshot> {
  if (!hasEpiasCredentials()) return syntheticSnapshot(request);

  const query = {
    startDate: epiasDate(request.date, 0),
    endDate: epiasDate(request.date, 23),
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

  const points = emptyPoints(request);
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

  return {
    mode: "live",
    source: {
      provider: "EPİAŞ Şeffaflık Platformu 2.0",
      fetchedAt: new Date().toISOString(),
      timezone: "Europe/Istanbul",
      note: "Canlı EPİAŞ servisleri. Birimler: fiyat TL/MWh; tüketim ve üretim MWh. SMF ve sistem yönü yaklaşık 4 saat, tüketim yaklaşık 2 saat gecikmeli olabilir; üretim verisi en geç önceki gün için yayımlanabilir.",
    },
    scope: {
      date: request.date,
      startHour: request.startHour,
      endHour: request.endHour,
    },
    points,
    signals: buildSignals(points.filter((point) => {
      const hour = Number(point.hour.slice(0, 2));
      return hour >= request.startHour && hour <= request.endHour;
    })),
    warnings,
  };
}
