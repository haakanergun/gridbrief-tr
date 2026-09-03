import "server-only";

import {
  createSyntheticExplorerResponse,
  type CatalogExplorerResponse,
  type ExplorerOrganization,
  type ExplorerParticipation,
  type ExplorerPlant,
  type ExplorerPoint,
  type ExplorerRegion,
  type ExplorerRequest,
  type ExplorerResponse,
  type ExplorerUevcb,
  type OrganizationExplorerResponse,
  type PlanningExplorerResponse,
  type PlantExplorerResponse,
} from "../explorer";
import {
  ensureEpiasTicket,
  fetchEpiasGetItems,
  fetchEpiasItems,
  getEpiasConfigurationStatus,
} from "./client";
import { GatewayError } from "./errors";

const PAGE = {
  number: 1,
  size: 100,
  sort: { direction: "ASC", field: "date" },
};
const DEFAULT_CACHE_SECONDS = 120;
const MIN_CACHE_SECONDS = 30;
const MAX_CACHE_SECONDS = 900;
const MAX_CACHED_RESPONSES = 24;
const EXPLORER_REQUEST_TIMEOUT_MS = 3_000;
const MAX_CONCURRENT_UPSTREAM_REQUESTS = 2;

interface CatalogBase {
  organizations: ExplorerOrganization[];
  plants: ExplorerPlant[];
  regions: ExplorerRegion[];
  warnings: string[];
}

interface CachedValue<T> {
  value: T;
  expiresAt: number;
}

const responseCache = new Map<string, CachedValue<ExplorerResponse>>();
const pendingResponses = new Map<string, Promise<ExplorerResponse>>();
const catalogCache = new Map<string, CachedValue<CatalogBase>>();
const pendingCatalogs = new Map<string, Promise<CatalogBase>>();
let activeUpstreamRequests = 0;
const upstreamWaiters: Array<() => void> = [];

async function acquireUpstreamSlot(): Promise<void> {
  if (activeUpstreamRequests < MAX_CONCURRENT_UPSTREAM_REQUESTS) {
    activeUpstreamRequests += 1;
    return;
  }

  await new Promise<void>((resolve) => upstreamWaiters.push(resolve));
}

function releaseUpstreamSlot(): void {
  const next = upstreamWaiters.shift();
  if (next) {
    next();
  } else {
    activeUpstreamRequests -= 1;
  }
}

async function runUpstream<T>(operation: () => Promise<T>): Promise<T> {
  await acquireUpstreamSlot();
  try {
    return await operation();
  } finally {
    releaseUpstreamSlot();
  }
}

function cacheLifetimeMs(): number {
  const configured = Number(process.env.EPTR_DATA_CACHE_SECONDS);
  const seconds = Number.isFinite(configured)
    ? Math.min(MAX_CACHE_SECONDS, Math.max(MIN_CACHE_SECONDS, configured))
    : DEFAULT_CACHE_SECONDS;
  return seconds * 1_000;
}

function trimCache<T>(cache: Map<string, CachedValue<T>>, now: number, maximum: number): void {
  for (const [key, cached] of cache) {
    if (cached.expiresAt <= now) cache.delete(key);
  }
  while (cache.size >= maximum) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

function timestamp(date: string, hour: number): string {
  return `${date}T${hour.toString().padStart(2, "0")}:00:00+03:00`;
}

function emptyPoints(date: string): ExplorerPoint[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    timestamp: timestamp(date, hour),
    hour: `${hour.toString().padStart(2, "0")}:00`,
    matchedBids: null,
    matchedOffers: null,
    kgup: null,
    kudup: null,
    eak: null,
    realtimeGeneration: null,
    injectionQuantity: null,
    loadPlan: null,
    realtimeConsumption: null,
  }));
}

function dateRange(date: string): { startDate: string; endDate: string } {
  return { startDate: timestamp(date, 0), endDate: timestamp(date, 23) };
}

function stringValue(item: Record<string, unknown>, field: string): string | null {
  const value = item[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(item: Record<string, unknown>, field: string): number | null {
  const value = item[field];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(item: Record<string, unknown>, field: string): boolean | null {
  const value = item[field];
  return typeof value === "boolean" ? value : null;
}

function integerValue(item: Record<string, unknown>, field: string): number | null {
  const value = numberValue(item, field);
  return value !== null && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function extractHour(item: Record<string, unknown>): number | null {
  for (const field of ["hour", "time", "date"]) {
    const value = item[field];
    if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23) {
      return value;
    }
    if (typeof value !== "string") continue;
    const isoMatch = /T(\d{2}):/.exec(value);
    const simpleMatch = /^(\d{1,2})(?::|$)/.exec(value);
    const matched = isoMatch?.[1] ?? simpleMatch?.[1];
    if (matched === undefined) continue;
    const hour = Number(matched);
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23) return hour;
  }
  return null;
}

function extractRecordDate(item: Record<string, unknown>): string | null {
  for (const field of ["date", "time"]) {
    const value = item[field];
    if (typeof value !== "string") continue;
    const match = /^(\d{4}-\d{2}-\d{2})(?:T|\s|$)/.exec(value.trim());
    if (match?.[1]) return match[1];
  }
  return null;
}

function mapOrganization(item: Record<string, unknown>): ExplorerOrganization | null {
  const id = integerValue(item, "organizationId");
  const name = stringValue(item, "organizationName");
  if (id === null || name === null) return null;
  return {
    id,
    name,
    shortName: stringValue(item, "organizationShortName"),
    eic: stringValue(item, "organizationEtsoCode"),
    status: stringValue(item, "organizationStatus"),
  };
}

function mapPlant(item: Record<string, unknown>): ExplorerPlant | null {
  const id = integerValue(item, "id");
  const name = stringValue(item, "name");
  if (id === null || name === null) return null;
  return {
    id,
    name,
    shortName: stringValue(item, "shortName"),
    eic: stringValue(item, "eic"),
  };
}

function mapUevcb(
  item: Record<string, unknown>,
  fallbackOrganizationId: number | null,
): ExplorerUevcb | null {
  const id = integerValue(item, "id");
  const name = stringValue(item, "name");
  if (id === null || name === null) return null;
  return {
    id,
    organizationId: integerValue(item, "orgId") ?? fallbackOrganizationId,
    name,
    eic: stringValue(item, "eic"),
  };
}

function mapParticipation(item: Record<string, unknown>): ExplorerParticipation {
  return {
    id: integerValue(item, "id"),
    organizationName: stringValue(item, "orgName"),
    participantCode: stringValue(item, "orgCode"),
    eic: stringValue(item, "eicCode"),
    legalStatus: stringValue(item, "legalStatus"),
    dayAhead: booleanValue(item, "damEntry"),
    intraday: booleanValue(item, "intraDayEntry"),
    futures: booleanValue(item, "vepEntry"),
    yekG: booleanValue(item, "yekgEntry"),
    naturalGas: booleanValue(item, "naturalGasMarketEntry"),
  };
}

function errorSummary(error: unknown): string {
  return error instanceof GatewayError ? error.message : "Bilinmeyen üst servis hatası.";
}

function rethrowAuthentication(error: unknown): void {
  if (error instanceof GatewayError && error.code === "UPSTREAM_AUTH_FAILED") throw error;
}

async function optionalItems(
  label: string,
  path: string,
  body: Record<string, unknown>,
  warnings: string[],
): Promise<{ items: Record<string, unknown>[]; succeeded: boolean }> {
  try {
    const items = await runUpstream(() => fetchEpiasItems(path, body, true, EXPLORER_REQUEST_TIMEOUT_MS));
    if (items.length === 0) warnings.push(`${label} seçilen kapsam için kayıt döndürmedi.`);
    return { items, succeeded: true };
  } catch (error) {
    rethrowAuthentication(error);
    warnings.push(`${label} alınamadı: ${errorSummary(error)}`);
    return { items: [], succeeded: false };
  }
}

async function optionalGetItems(
  label: string,
  path: string,
  warnings: string[],
): Promise<{ items: Record<string, unknown>[]; succeeded: boolean }> {
  try {
    const items = await runUpstream(() => fetchEpiasGetItems(path, true, EXPLORER_REQUEST_TIMEOUT_MS));
    if (items.length === 0) warnings.push(`${label} seçilen kapsam için kayıt döndürmedi.`);
    return { items, succeeded: true };
  } catch (error) {
    rethrowAuthentication(error);
    warnings.push(`${label} alınamadı: ${errorSummary(error)}`);
    return { items: [], succeeded: false };
  }
}

async function fetchCatalogBase(date: string): Promise<CatalogBase> {
  const warnings: string[] = [];
  const range = dateRange(date);
  const [organizationsResult, plantsResult, regionsResult] = await Promise.all([
    optionalItems(
      "Organizasyon listesi",
      "/v1/generation/data/organization-list",
      range,
      warnings,
    ),
    optionalItems(
      "Santral listesi",
      "/v1/generation/data/powerplant-list-for-date-range",
      range,
      warnings,
    ),
    optionalGetItems("Bölge listesi", "/v1/generation/data/region-list", warnings),
  ]);
  const successfulEndpoints = [organizationsResult, plantsResult, regionsResult]
    .filter((result) => result.succeeded).length;
  const regionItems = regionsResult.items;

  if (successfulEndpoints === 0) {
    throw new GatewayError(
      "UPSTREAM_UNAVAILABLE",
      "EPİAŞ katalog servislerinin hiçbiri kullanılabilir bir yanıt döndürmedi.",
      502,
    );
  }

  const organizations = organizationsResult.items
    .map(mapOrganization)
    .filter((item): item is ExplorerOrganization => item !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const plants = plantsResult.items
    .map(mapPlant)
    .filter((item): item is ExplorerPlant => item !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const regions = regionItems
    .map((item): ExplorerRegion | null => {
      const code = stringValue(item, "regionShortName");
      return code ? { id: code, name: code === "TR1" ? "Türkiye" : code } : null;
    })
    .filter((item): item is ExplorerRegion => item !== null);

  if (regions.length === 0) regions.push({ id: "TR1", name: "Türkiye" });
  return { organizations, plants, regions, warnings };
}

async function getCatalogBase(date: string): Promise<CatalogBase> {
  const now = Date.now();
  const cached = catalogCache.get(date);
  if (cached && cached.expiresAt > now) {
    catalogCache.delete(date);
    catalogCache.set(date, cached);
    return cached.value;
  }
  const pending = pendingCatalogs.get(date);
  if (pending) return pending;

  const request = fetchCatalogBase(date)
    .then((value) => {
      trimCache(catalogCache, Date.now(), 8);
      catalogCache.set(date, { value, expiresAt: Date.now() + cacheLifetimeMs() });
      return value;
    })
    .finally(() => pendingCatalogs.delete(date));
  pendingCatalogs.set(date, request);
  return request;
}

type PointMetric = Exclude<keyof ExplorerPoint, "timestamp" | "hour">;

function applyMetric(
  points: ExplorerPoint[],
  items: Record<string, unknown>[],
  metric: PointMetric,
  valueFields: string[],
  marketDate: string,
): { duplicates: number; usable: number; outOfScope: number } {
  let duplicates = 0;
  let usable = 0;
  let outOfScope = 0;
  for (const item of items) {
    const recordDate = extractRecordDate(item);
    if (recordDate !== null && recordDate !== marketDate) {
      outOfScope += 1;
      continue;
    }
    const hour = extractHour(item);
    if (hour === null) continue;
    const value = valueFields.reduce<number | null>(
      (selected, field) => selected ?? numberValue(item, field),
      null,
    );
    if (value === null) continue;
    if (points[hour][metric] !== null) duplicates += 1;
    points[hour][metric] = value;
    usable += 1;
  }
  return { duplicates, usable, outOfScope };
}

function duplicateWarning(label: string, duplicates: number, warnings: string[]): void {
  if (duplicates > 0) {
    warnings.push(
      `${label} servisinde aynı saate ait ${duplicates} ek kayıt vardı; kaynak sırasındaki son geçerli değer kullanıldı.`,
    );
  }
}

function outOfScopeWarning(label: string, count: number, marketDate: string, warnings: string[]): void {
  if (count > 0) {
    warnings.push(`${label} yanıtındaki seçili ${marketDate} günü dışındaki ${count} kayıt yok sayıldı.`);
  }
}

function emptyMetricWarning(
  label: string,
  result: { usable: number },
  endpointSucceeded: boolean,
  warnings: string[],
): void {
  if (endpointSucceeded && result.usable === 0) {
    warnings.push(`${label} yanıtında saatlik sayısal değer bulunamadı.`);
  }
}

function currentIstanbulDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function publicationWarnings(date: string): string[] {
  const warnings = [
    "EPİAŞ yayın gecikmeleri nedeniyle en yeni saatlerde değerler boş olabilir; boş değerler sıfıra çevrilmez.",
  ];
  if (date >= currentIstanbulDate()) {
    warnings.push(
      "Gerçek zamanlı üretim servisi mevcut gün için veri yayımlamayabilir; tamamlanmış önceki günü seçin.",
    );
  }
  return warnings;
}

function source(note: string) {
  return {
    provider: "EPİAŞ Şeffaflık Platformu 2.0",
    fetchedAt: new Date().toISOString(),
    timezone: "Europe/Istanbul" as const,
    note,
  };
}

async function fetchCatalogResponse(
  request: Extract<ExplorerRequest, { view: "catalog" }>,
): Promise<CatalogExplorerResponse> {
  const catalog = await getCatalogBase(request.date);
  return {
    mode: "live",
    view: "catalog",
    source: source(
      "Canlı EPİAŞ tarihli organizasyon ve santral referans listeleri. Liste kapsamı seçilen piyasa gününe göre değişebilir.",
    ),
    scope: { view: "catalog", date: request.date },
    organizations: catalog.organizations,
    plants: catalog.plants,
    regions: catalog.regions,
    warnings: catalog.warnings,
  };
}

async function fetchOrganizationResponse(
  request: Extract<ExplorerRequest, { view: "organization" }>,
): Promise<OrganizationExplorerResponse> {
  const catalog = await getCatalogBase(request.date);
  const organization = catalog.organizations.find((item) => item.id === request.organizationId);
  if (!organization) {
    if (catalog.organizations.length === 0) {
      throw new GatewayError(
        "UPSTREAM_UNAVAILABLE",
        "EPİAŞ organization catalog is unavailable for the selected date.",
        502,
      );
    }
    throw new GatewayError(
      "INVALID_REQUEST",
      "organizationId was not found in the EPİAŞ organization list for the selected date.",
      400,
    );
  }

  const warnings = [...catalog.warnings, ...publicationWarnings(request.date)];
  const range = dateRange(request.date);
  const productionBody = {
    ...range,
    region: "TR1",
    organizationId: request.organizationId,
    page: PAGE,
  };
  const [
    uevcbResult,
    participantResult,
    matchingResult,
    kgupResult,
    kudupResult,
    eakResult,
  ] = await Promise.all([
    optionalItems(
      "UEVÇB listesi",
      "/v1/generation/data/uevcb-list",
      { startDate: range.startDate, organizationId: request.organizationId },
      warnings,
    ),
    optionalItems(
      "Piyasa katılımcı bilgisi",
      "/v1/markets/general-data/data/market-participants",
      { organizationId: request.organizationId },
      warnings,
    ),
    optionalItems(
      "GÖP eşleşme miktarı",
      "/v1/markets/dam/data/clearing-quantity",
      { ...range, organizationId: request.organizationId, page: PAGE },
      warnings,
    ),
    optionalItems("KGÜP", "/v1/generation/data/dpp", productionBody, warnings),
    optionalItems("KUDÜP", "/v1/generation/data/sbfgp", productionBody, warnings),
    optionalItems("EAK", "/v1/generation/data/aic", productionBody, warnings),
  ]);

  const succeeded = [
    uevcbResult,
    participantResult,
    matchingResult,
    kgupResult,
    kudupResult,
    eakResult,
  ].filter((result) => result.succeeded).length;
  if (succeeded === 0) {
    throw new GatewayError(
      "UPSTREAM_UNAVAILABLE",
      "No EPİAŞ organization endpoint returned a usable response.",
      502,
    );
  }

  const points = emptyPoints(request.date);
  const matchedBids = applyMetric(points, matchingResult.items, "matchedBids", ["matchedBids"], request.date);
  const matchedOffers = applyMetric(points, matchingResult.items, "matchedOffers", ["matchedOffers"], request.date);
  const kgup = applyMetric(points, kgupResult.items, "kgup", ["toplam"], request.date);
  const kudup = applyMetric(points, kudupResult.items, "kudup", ["toplam"], request.date);
  const eak = applyMetric(points, eakResult.items, "eak", ["toplam"], request.date);
  duplicateWarning("GÖP alış", matchedBids.duplicates, warnings);
  duplicateWarning("GÖP satış", matchedOffers.duplicates, warnings);
  duplicateWarning("KGÜP", kgup.duplicates, warnings);
  duplicateWarning("KUDÜP", kudup.duplicates, warnings);
  duplicateWarning("EAK", eak.duplicates, warnings);
  outOfScopeWarning("GÖP eşleşme miktarı", Math.max(matchedBids.outOfScope, matchedOffers.outOfScope), request.date, warnings);
  outOfScopeWarning("KGÜP", kgup.outOfScope, request.date, warnings);
  outOfScopeWarning("KUDÜP", kudup.outOfScope, request.date, warnings);
  outOfScopeWarning("EAK", eak.outOfScope, request.date, warnings);
  emptyMetricWarning("GÖP eşleşen alış", matchedBids, matchingResult.succeeded, warnings);
  emptyMetricWarning("GÖP eşleşen satış", matchedOffers, matchingResult.succeeded, warnings);
  emptyMetricWarning("KGÜP", kgup, kgupResult.succeeded, warnings);
  emptyMetricWarning("KUDÜP", kudup, kudupResult.succeeded, warnings);
  emptyMetricWarning("EAK", eak, eakResult.succeeded, warnings);

  const uevcbs = uevcbResult.items
    .map((item) => mapUevcb(item, request.organizationId))
    .filter((item): item is ExplorerUevcb => item !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return {
    mode: "live",
    view: "organization",
    source: source(
      "Canlı EPİAŞ organizasyon kapsamı. GÖP eşleşmeleri ile KGÜP, KUDÜP ve EAK organizasyona göre filtrelenmiştir; boş değerler sıfır değildir.",
    ),
    scope: { view: "organization", date: request.date, organizationId: request.organizationId },
    organization,
    uevcbs,
    participation: participantResult.items[0] ? mapParticipation(participantResult.items[0]) : null,
    points,
    warnings,
  };
}

async function fetchPlantResponse(
  request: Extract<ExplorerRequest, { view: "plant" }>,
): Promise<PlantExplorerResponse> {
  const catalog = await getCatalogBase(request.date);
  const plant = catalog.plants.find((item) => item.id === request.powerPlantId);
  if (!plant) {
    if (catalog.plants.length === 0) {
      throw new GatewayError(
        "UPSTREAM_UNAVAILABLE",
        "EPİAŞ power plant catalog is unavailable for the selected date.",
        502,
      );
    }
    throw new GatewayError(
      "INVALID_REQUEST",
      "powerPlantId was not found in the EPİAŞ power plant list for the selected date.",
      400,
    );
  }

  const warnings = [...catalog.warnings, ...publicationWarnings(request.date)];
  const range = dateRange(request.date);
  const [generationResult, injectionResult] = await Promise.all([
    optionalItems(
      "Santral gerçek zamanlı üretimi",
      "/v1/generation/data/realtime-generation",
      { ...range, powerPlantId: request.powerPlantId, page: PAGE },
      warnings,
    ),
    optionalItems(
      "Santral veriş miktarı",
      "/v1/generation/data/injection-quantity",
      // The published DTO currently spells this `powerplantId`, but the live
      // service rejects that casing and accepts `powerPlantId`.
      { ...range, powerPlantId: request.powerPlantId, page: PAGE },
      warnings,
    ),
  ]);
  if (!generationResult.succeeded && !injectionResult.succeeded) {
    throw new GatewayError(
      "UPSTREAM_UNAVAILABLE",
      "No EPİAŞ power plant endpoint returned a usable response.",
      502,
    );
  }

  const points = emptyPoints(request.date);
  const generation = applyMetric(points, generationResult.items, "realtimeGeneration", ["total"], request.date);
  const injection = applyMetric(points, injectionResult.items, "injectionQuantity", ["total"], request.date);
  duplicateWarning("Gerçek zamanlı üretim", generation.duplicates, warnings);
  duplicateWarning("Veriş miktarı", injection.duplicates, warnings);
  outOfScopeWarning("Gerçek zamanlı üretim", generation.outOfScope, request.date, warnings);
  outOfScopeWarning("Veriş miktarı", injection.outOfScope, request.date, warnings);
  emptyMetricWarning("Gerçek zamanlı üretim", generation, generationResult.succeeded, warnings);
  emptyMetricWarning("Veriş miktarı", injection, injectionResult.succeeded, warnings);

  return {
    mode: "live",
    view: "plant",
    source: source(
      "Canlı EPİAŞ santral kapsamı. Gerçek zamanlı üretim ve veriş miktarı seçilen santral kimliğiyle filtrelenmiştir; boş değerler sıfır değildir.",
    ),
    scope: { view: "plant", date: request.date, powerPlantId: request.powerPlantId },
    plant,
    points,
    warnings,
  };
}

async function fetchPlanningResponse(
  request: Extract<ExplorerRequest, { view: "planning" }>,
): Promise<PlanningExplorerResponse> {
  const catalog = request.organizationId === undefined ? null : await getCatalogBase(request.date);
  const organization = request.organizationId === undefined
    ? null
    : catalog?.organizations.find((item) => item.id === request.organizationId) ?? null;
  if (request.organizationId !== undefined && !organization) {
    if (catalog?.organizations.length === 0) {
      throw new GatewayError(
        "UPSTREAM_UNAVAILABLE",
        "EPİAŞ organization catalog is unavailable for the selected date.",
        502,
      );
    }
    throw new GatewayError(
      "INVALID_REQUEST",
      "organizationId was not found in the EPİAŞ organization list for the selected date.",
      400,
    );
  }

  const warnings = [...(catalog?.warnings ?? []), ...publicationWarnings(request.date)];
  const range = dateRange(request.date);
  let uevcb: ExplorerUevcb | null = null;
  if (request.uevcbId !== undefined && request.organizationId !== undefined) {
    const uevcbResult = await optionalItems(
      "UEVÇB listesi",
      "/v1/generation/data/uevcb-list",
      { startDate: range.startDate, organizationId: request.organizationId },
      warnings,
    );
    uevcb = uevcbResult.items
      .map((item) => mapUevcb(item, request.organizationId ?? null))
      .find((item) => item?.id === request.uevcbId) ?? null;
    if (uevcbResult.succeeded && !uevcb) {
      throw new GatewayError(
        "INVALID_REQUEST",
        "uevcbId was not found for the selected organization and date.",
        400,
      );
    }
  }

  const productionBody = {
    ...range,
    region: request.region ?? "TR1",
    ...(request.organizationId === undefined ? {} : { organizationId: request.organizationId }),
    ...(request.uevcbId === undefined ? {} : { uevcbId: request.uevcbId }),
    page: PAGE,
  };
  const systemBody = { ...range, page: PAGE };
  const [
    kgupResult,
    kudupResult,
    eakResult,
    generationResult,
    loadPlanResult,
    consumptionResult,
  ] = await Promise.all([
    optionalItems("KGÜP", "/v1/generation/data/dpp", productionBody, warnings),
    optionalItems("KUDÜP", "/v1/generation/data/sbfgp", productionBody, warnings),
    optionalItems("EAK", "/v1/generation/data/aic", productionBody, warnings),
    optionalItems(
      "Sistem gerçek zamanlı üretimi",
      "/v1/generation/data/realtime-generation",
      systemBody,
      warnings,
    ),
    optionalItems(
      "Yük tahmin planı",
      "/v1/consumption/data/load-estimation-plan",
      systemBody,
      warnings,
    ),
    optionalItems(
      "Gerçek zamanlı tüketim",
      "/v1/consumption/data/realtime-consumption",
      systemBody,
      warnings,
    ),
  ]);
  const results = [
    kgupResult,
    kudupResult,
    eakResult,
    generationResult,
    loadPlanResult,
    consumptionResult,
  ];
  if (results.every((result) => !result.succeeded)) {
    throw new GatewayError(
      "UPSTREAM_UNAVAILABLE",
      "No EPİAŞ planning endpoint returned a usable response.",
      502,
    );
  }

  const points = emptyPoints(request.date);
  const metrics = [
    ["KGÜP", kgupResult, "kgup", ["toplam"]],
    ["KUDÜP", kudupResult, "kudup", ["toplam"]],
    ["EAK", eakResult, "eak", ["toplam"]],
    ["Gerçek zamanlı üretim", generationResult, "realtimeGeneration", ["total"]],
    ["Yük tahmin planı", loadPlanResult, "loadPlan", ["lep"]],
    ["Gerçek zamanlı tüketim", consumptionResult, "realtimeConsumption", ["consumption"]],
  ] as const;
  for (const [label, endpoint, metric, fields] of metrics) {
    const result = applyMetric(points, endpoint.items, metric, [...fields], request.date);
    duplicateWarning(label, result.duplicates, warnings);
    outOfScopeWarning(label, result.outOfScope, request.date, warnings);
    emptyMetricWarning(label, result, endpoint.succeeded, warnings);
  }

  return {
    mode: "live",
    view: "planning",
    source: source(
      "Canlı EPİAŞ planlama görünümü. Organizasyon/UEVÇB filtreleri yalnız KGÜP, KUDÜP ve EAK üretim planlarına uygulanır. Gerçek zamanlı üretim, yük tahmin planı ve gerçek zamanlı tüketim Türkiye sistemi kapsamındadır; boş değerler sıfır değildir.",
    ),
    scope: {
      view: "planning",
      date: request.date,
      ...(request.organizationId === undefined ? {} : { organizationId: request.organizationId }),
      ...(request.uevcbId === undefined ? {} : { uevcbId: request.uevcbId }),
      region: request.region ?? "TR1",
    },
    organization,
    uevcb,
    points,
    warnings,
  };
}

async function fetchLiveResponse(request: ExplorerRequest): Promise<ExplorerResponse> {
  await ensureEpiasTicket();
  switch (request.view) {
    case "catalog":
      return fetchCatalogResponse(request);
    case "organization":
      return fetchOrganizationResponse(request);
    case "plant":
      return fetchPlantResponse(request);
    case "planning":
      return fetchPlanningResponse(request);
  }
}

export async function getExplorerResponse(request: ExplorerRequest): Promise<ExplorerResponse> {
  const configuration = getEpiasConfigurationStatus();
  if (configuration === "disabled") return createSyntheticExplorerResponse(request);
  if (configuration === "misconfigured") {
    throw new GatewayError(
      "GATEWAY_MISCONFIGURED",
      "Live EPİAŞ access is enabled but its server configuration is incomplete.",
      503,
    );
  }

  const key = JSON.stringify(request);
  const now = Date.now();
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > now) {
    responseCache.delete(key);
    responseCache.set(key, cached);
    return cached.value;
  }
  const pending = pendingResponses.get(key);
  if (pending) return pending;

  const pendingRequest = fetchLiveResponse(request)
    .then((value) => {
      trimCache(responseCache, Date.now(), MAX_CACHED_RESPONSES);
      const ttl = value.warnings.length > 0
        ? Math.min(cacheLifetimeMs(), MIN_CACHE_SECONDS * 1_000)
        : cacheLifetimeMs();
      responseCache.set(key, { value, expiresAt: Date.now() + ttl });
      return value;
    })
    .finally(() => pendingResponses.delete(key));
  pendingResponses.set(key, pendingRequest);
  return pendingRequest;
}
