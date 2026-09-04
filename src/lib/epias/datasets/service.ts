import "server-only";

import { fetchEpiasServiceItems } from "../client";
import type { CatalogNode, ElectricityCatalogRoot } from "../../transparency/types";
import type {
  CatalogDatasetCapability,
  DatasetCell,
  DatasetColumn,
  DatasetColumnType,
  DatasetQueryResponse,
  UnsupportedCatalogDataset,
} from "../../transparency/dataset-types";
import { resolveCatalogDataset } from "./registry";
import type { ValidatedDatasetQuery } from "./validation";

const CACHE_TTL_MS = 90_000;
const REFERENCE_CACHE_TTL_MS = 15 * 60_000;
const MAX_CACHE_ENTRIES = 64;
const MAX_COLUMNS = 100;
const MAX_STRING_BYTES = 8_192;
const MAX_NESTED_ITEMS = 100;

interface CacheEntry {
  expiresAt: number;
  value: DatasetQueryResponse;
}

export interface DatasetCapabilitiesResponse {
  capabilities: Array<CatalogDatasetCapability & { descriptor: DatasetQueryResponse["dataset"] }>;
  mappedCount: number;
  catalogDatasetCount: number;
  registryEndpointCount: number;
  registryEndpointCounts: { electricityService: number; reportingService: number };
  unsupported: UnsupportedCatalogDataset[];
  source: "EPİAŞ Şeffaflık Platformu 2.0";
  generatedAt: string;
}

const responseCache = new Map<string, CacheEntry>();
const pendingResponses = new Map<string, Promise<DatasetQueryResponse>>();

export async function queryDataset(query: ValidatedDatasetQuery): Promise<DatasetQueryResponse> {
  const cacheKey = JSON.stringify({ id: query.definition.id, body: query.requestBody });
  const now = Date.now();
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.value;
  responseCache.delete(cacheKey);

  const pending = pendingResponses.get(cacheKey);
  if (pending) return pending;

  const operation = fetchAndShape(query)
    .then((value) => {
      trimCache(Date.now());
      responseCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + (query.definition.method === "GET" ? REFERENCE_CACHE_TTL_MS : CACHE_TTL_MS),
      });
      return value;
    })
    .finally(() => pendingResponses.delete(cacheKey));
  pendingResponses.set(cacheKey, operation);
  return operation;
}

export function getDatasetCapabilities(root: ElectricityCatalogRoot): DatasetCapabilitiesResponse {
  const leaves: Array<{ menuId: number; label: string; trail: string[] }> = [];
  const visit = (node: CatalogNode, trail: string[]): void => {
    const nextTrail = [...trail, node.label];
    if (node.children.length === 0) leaves.push({ menuId: node.id, label: node.label, trail });
    node.children.forEach((child) => visit(child, nextTrail));
  };
  root.children.forEach((node) => visit(node, [root.label]));

  const capabilities = leaves.flatMap((leaf) => {
    const resolved = resolveCatalogDataset(leaf.menuId, leaf.label, leaf.trail);
    if (!resolved) return [];
    const definition = queryDefinition(resolved.datasetId);
    if (!definition) return [];
    return [{ ...resolved, descriptor: descriptor(definition) }];
  });
  const unsupported = leaves.flatMap((leaf): UnsupportedCatalogDataset[] => {
    if (leaf.menuId === 59) {
      return [{
        ...leaf,
        status: "date-rule-unverified",
        reason: "Kurulu Güç ekranı iki resmi endpoint arasında tarih eşiği kullanıyor; resmi eşik doğrulanmadan tek seri olarak sorgulanmaz.",
      }];
    }
    if (leaf.menuId === 254) {
      return [{
        ...leaf,
        status: "external-document",
        reason: "Elektrik piyasası bültenleri resmi bir JSON servisi değil, EPİAŞ'ın PDF yayımlama sayfasıdır.",
        externalUrl: "https://www.epias.com.tr/spot-elektrik-piyasasi/elektrik-piyasasi-bultenler/",
      }];
    }
    if (!resolveCatalogDataset(leaf.menuId, leaf.label, leaf.trail)) {
      return [{
        ...leaf,
        status: "unmapped",
        reason: "Bu menü ekranı doğrulanmış canlı veri adaptörleri arasında değildir.",
      }];
    }
    return [];
  });

  return {
    capabilities,
    mappedCount: capabilities.length,
    catalogDatasetCount: leaves.length,
    registryEndpointCount: registryCount(),
    registryEndpointCounts: registryCountsByService(),
    unsupported,
    source: "EPİAŞ Şeffaflık Platformu 2.0",
    generatedAt: new Date().toISOString(),
  };
}

async function fetchAndShape(query: ValidatedDatasetQuery): Promise<DatasetQueryResponse> {
  const upstreamRows = await fetchEpiasServiceItems(
    query.definition.service,
    query.definition.method,
    query.definition.path,
    query.requestBody,
  );
  const warnings: string[] = [];
  const cappedRows = upstreamRows.slice(0, query.scope.page.size);
  if (upstreamRows.length > cappedRows.length) {
    warnings.push(`Response was capped at ${query.scope.page.size} rows by the gateway.`);
  }

  const keys = collectColumnKeys(cappedRows, warnings);
  const rows = cappedRows.map((row) => sanitizeRow(row, keys, warnings));
  const columns = inferColumns(rows, keys);
  const nullableCells = countNullableCells(rows, keys);
  const partial = warnings.length > 0 || nullableCells > 0;
  const retrievedAt = new Date().toISOString();

  return {
    dataset: descriptor(query.definition),
    scope: query.scope,
    columns,
    rows,
    quality: {
      status: rows.length === 0 ? "empty" : partial ? "partial" : "complete",
      rowCount: rows.length,
      columnCount: columns.length,
      nullableCells,
      observedAt: retrievedAt,
    },
    source: {
      provider: "EPİAŞ Şeffaflık Platformu 2.0",
      service: query.definition.service,
      endpoint: query.definition.path,
      upstreamVersion: query.definition.service === "electricity-service" ? "v1.15.15" : "v1.3.26",
      retrievedAt,
    },
    warnings: [...new Set(warnings)],
    pagination: query.definition.supportsPagination
      ? {
          number: query.scope.page.number,
          size: query.scope.page.size,
          returnedRows: rows.length,
          // The shared EPİAŞ client intentionally exposes only `items`; without
          // upstream total/page metadata, an exact next-page assertion is unsafe.
          hasMore: rows.length < query.scope.page.size ? false : null,
        }
      : null,
  };
}

function collectColumnKeys(rows: Record<string, unknown>[], warnings: string[]): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (unsafeKey(key)) continue;
      keys.add(key);
      if (keys.size >= MAX_COLUMNS) {
        warnings.push(`Columns were capped at ${MAX_COLUMNS} fields by the gateway.`);
        return [...keys];
      }
    }
  }
  return [...keys];
}

function sanitizeRow(
  row: Record<string, unknown>,
  keys: string[],
  warnings: string[],
): Record<string, DatasetCell> {
  const output: Record<string, DatasetCell> = Object.create(null) as Record<string, DatasetCell>;
  for (const key of keys) output[key] = sanitizeCell(row[key], warnings, 0);
  return output;
}

function sanitizeCell(value: unknown, warnings: string[], depth: number): DatasetCell {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    if (Buffer.byteLength(value, "utf8") <= MAX_STRING_BYTES) return value;
    warnings.push("Oversized text fields were truncated by the gateway.");
    return Buffer.from(value, "utf8").subarray(0, MAX_STRING_BYTES).toString("utf8");
  }
  if (depth >= 3) {
    warnings.push("Deeply nested fields were replaced by a safe summary.");
    return "[nested value]";
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_NESTED_ITEMS) warnings.push("Nested arrays were truncated by the gateway.");
    return value.slice(0, MAX_NESTED_ITEMS).map((item) => {
      const sanitized = sanitizeCell(item, warnings, depth + 1);
      return isScalar(sanitized) ? sanitized : JSON.stringify(sanitized);
    });
  }
  if (typeof value === "object" && value !== null) {
    const nested: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const [key, item] of Object.entries(value).slice(0, MAX_NESTED_ITEMS)) {
      if (!unsafeKey(key)) nested[key] = sanitizeCell(item, warnings, depth + 1);
    }
    return nested;
  }
  return null;
}

function inferColumns(rows: Array<Record<string, DatasetCell>>, keys: string[]): DatasetColumn[] {
  return keys.map((key) => {
    const present = rows.map((row) => row[key]).filter((value) => value !== null && value !== undefined);
    return {
      key,
      label: humanize(key),
      type: inferColumnType(key, present),
      nullable: present.length < rows.length,
    };
  });
}

function inferColumnType(key: string, values: DatasetCell[]): DatasetColumnType {
  if (values.length === 0) return "text";
  if (values.every((value) => typeof value === "number")) return "number";
  if (values.every((value) => typeof value === "boolean")) return "boolean";
  if (
    /(?:date|time|tarih|saat)$/i.test(key)
    && values.every((value) => typeof value === "string" && Number.isFinite(Date.parse(value)))
  ) return "datetime";
  if (values.some((value) => Array.isArray(value) || (typeof value === "object" && value !== null))) {
    return "object";
  }
  return "text";
}

function countNullableCells(rows: Array<Record<string, DatasetCell>>, keys: string[]): number {
  let count = 0;
  for (const row of rows) for (const key of keys) if (row[key] === null || row[key] === undefined) count += 1;
  return count;
}

function descriptor(definition: ValidatedDatasetQuery["definition"]): DatasetQueryResponse["dataset"] {
  return {
    id: definition.id,
    title: definition.title,
    category: definition.category,
    service: definition.service,
    method: definition.method,
    supportsPagination: definition.supportsPagination,
    dateFields: definition.dateFields,
    availableFilters: definition.availableFilters,
  };
}

function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replaceAll("_", " ").trim();
  return spaced ? spaced[0].toLocaleUpperCase("tr-TR") + spaced.slice(1) : key;
}

function unsafeKey(key: string): boolean {
  return key === "__proto__" || key === "constructor" || key === "prototype";
}

function isScalar(value: DatasetCell): value is string | number | boolean | null {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function trimCache(now: number): void {
  for (const [key, entry] of responseCache) if (entry.expiresAt <= now) responseCache.delete(key);
  while (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = responseCache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    responseCache.delete(oldest);
  }
}

// Kept behind local helpers so service consumers cannot mutate registry entries.
function queryDefinition(id: string) {
  // Dynamic import would add no security here; registry lookup remains exact.
  return datasetRegistryLookup(id);
}

import { getDatasetDefinition as datasetRegistryLookup, listDatasetDefinitions } from "./registry";

function registryCount(): number {
  return listDatasetDefinitions().length;
}

function registryCountsByService(): { electricityService: number; reportingService: number } {
  const definitions = listDatasetDefinitions();
  return {
    electricityService: definitions.filter((item) => item.service === "electricity-service").length,
    reportingService: definitions.filter((item) => item.service === "reporting-service").length,
  };
}
