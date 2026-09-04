import "server-only";

import { fetchEpiasGetItems } from "../epias/client";
import {
  getDatasetDefinition,
  listCatalogDatasetMappings,
  resolveCatalogDataset,
  type DatasetDefinition,
} from "../epias/datasets/registry";
import { GatewayError } from "../epias/errors";
import type {
  CatalogNode,
  ElectricityCatalogRoot,
  ElectricityCatalogResponse,
  ElectricityCatalogStats,
} from "./types";
import { VERIFIED_CATALOG_ENGLISH_LABELS } from "./verified-catalog-labels";

const ELECTRICITY_MENU_PATH = "/v1/menu/get-menu-tree";
const CATALOG_SOURCE = "EPİAŞ Şeffaflık Platformu 2.0";
const MAX_MENU_DEPTH = 10;
const MAX_MENU_NODES = 1_000;
const MAX_LABEL_LENGTH = 300;
const LIVE_CACHE_MS = 10 * 60_000;
const RETRY_AFTER_FAILURE_MS = 60_000;
const VERIFIED_SNAPSHOT_AT = "2026-09-03T00:00:00.000Z";
const VERIFIED_UNMAPPED_MENU_IDS = [59, 254] as const;

let cachedLiveCatalog: { value: ElectricityCatalogResponse; expiresAt: number } | null = null;
let pendingCatalog: Promise<ElectricityCatalogResponse> | null = null;
let retryLiveAfter = 0;
let retryFailureKind: CatalogFailureKind = "unavailable";

type CatalogFailureKind = "authentication" | "unavailable";

interface ParsedMenuNode {
  id: number;
  label: string;
  labelEn?: string;
  children: ParsedMenuNode[];
}

interface ParseState {
  nodeCount: number;
  ids: Set<number>;
}

export async function getElectricityCatalog(): Promise<ElectricityCatalogResponse> {
  const now = Date.now();
  if (cachedLiveCatalog && cachedLiveCatalog.expiresAt > now) return cachedLiveCatalog.value;
  if (pendingCatalog) return pendingCatalog;
  if (now < retryLiveAfter) return catalogFallback(cachedLiveCatalog?.value, retryFailureKind);

  pendingCatalog = refreshElectricityCatalog()
    .catch((error: unknown) => {
      retryFailureKind = failureKind(error);
      retryLiveAfter = Date.now() + RETRY_AFTER_FAILURE_MS;
      return catalogFallback(cachedLiveCatalog?.value, retryFailureKind);
    })
    .finally(() => {
      pendingCatalog = null;
    });
  return pendingCatalog;
}

async function refreshElectricityCatalog(): Promise<ElectricityCatalogResponse> {
  const menuItems = await fetchEpiasGetItems(ELECTRICITY_MENU_PATH);
  const root = normalizeElectricityRoot(menuItems);
  const coverage = catalogCoverage(root);
  const degraded = coverage.mappedCount !== coverage.expectedMappedCount
    || coverage.verifiedLeafCount !== coverage.expectedVerifiedLeafCount;
  const warnings = degraded ? [coverageWarning(coverage)] : [];
  const value: ElectricityCatalogResponse = {
    root,
    stats: countCatalogNodes(root.children),
    fetchedAt: new Date().toISOString(),
    source: CATALOG_SOURCE,
    mode: degraded ? "degraded-live" : "live",
    warnings,
  };
  cachedLiveCatalog = { value, expiresAt: Date.now() + LIVE_CACHE_MS };
  retryLiveAfter = 0;
  retryFailureKind = "unavailable";
  return value;
}

function failureKind(error: unknown): CatalogFailureKind {
  return error instanceof GatewayError && error.code === "UPSTREAM_AUTH_FAILED"
    ? "authentication"
    : "unavailable";
}

function catalogFallback(
  staleCatalog?: ElectricityCatalogResponse,
  kind: CatalogFailureKind = "unavailable",
): ElectricityCatalogResponse {
  const authenticationFailure = kind === "authentication";
  const warning = authenticationFailure
    ? "EPİAŞ kimlik doğrulaması başarısız oldu; hesap erişimi düzeltilene kadar doğrulanmış katalog yapısı gösteriliyor ve canlı veri sorguları kullanılamayabilir."
    : "Canlı EPİAŞ menü servisine geçici olarak ulaşılamadı; doğrulanmış katalog yapısı gösteriliyor.";
  if (staleCatalog) {
    return {
      ...staleCatalog,
      mode: authenticationFailure ? "auth-fallback" : "stale-live",
      warnings: [warning],
    };
  }
  return buildVerifiedCatalogSnapshot(warning, authenticationFailure ? "auth-fallback" : "verified-snapshot");
}

function buildVerifiedCatalogSnapshot(
  warning: string,
  mode: "auth-fallback" | "verified-snapshot",
): ElectricityCatalogResponse {
  const sectionSpecs = [
    { key: "markets", label: "ELEKTRİK PİYASALARI" },
    { key: "generation", label: "ELEKTRİK ÜRETİM" },
    { key: "consumption", label: "ELEKTRİK TÜKETİM" },
    { key: "renewables", label: "YEKDEM" },
    { key: "transmission", label: "ELEKTRİK İLETİM" },
    { key: "dams", label: "BARAJLAR" },
    { key: "messages", label: "PİYASA MESAJ SİSTEMİ" },
    { key: "reports", label: "ELEKTRİK PİYASASI RAPORLARI" },
    { key: "bulletins", label: "ELEKTRİK PİYASASI BÜLTENLERİ" },
  ] as const;
  const grouped = new Map<string, Map<string, CatalogNode[]>>();
  for (const section of sectionSpecs) grouped.set(section.key, new Map());

  for (const { menuId, datasetId } of listCatalogDatasetMappings()) {
    const definition = getDatasetDefinition(datasetId);
    if (!definition) continue;
    const sectionKey = snapshotSectionKey(definition);
    const sectionGroups = grouped.get(sectionKey);
    if (!sectionGroups) continue;
    const nodes = sectionGroups.get(definition.category) ?? [];
    nodes.push({
      id: menuId,
      label: definition.title,
      labelEn: VERIFIED_CATALOG_ENGLISH_LABELS[menuId],
      kind: "dataset",
      children: [],
    });
    sectionGroups.set(definition.category, nodes);
  }

  addSnapshotLeaf(grouped, "renewables", "Yenilenebilirler ve YEKDEM", {
    id: 59,
    label: "Kurulu Güç",
    labelEn: VERIFIED_CATALOG_ENGLISH_LABELS[59],
    kind: "dataset",
    children: [],
  });
  addSnapshotLeaf(grouped, "bulletins", "Elektrik Piyasası Bültenleri", {
    id: 254,
    label: "Elektrik Piyasası Bültenleri",
    labelEn: VERIFIED_CATALOG_ENGLISH_LABELS[254],
    kind: "dataset",
    children: [],
  });

  let groupId = -100;
  const children: CatalogNode[] = sectionSpecs.map((section, sectionIndex) => {
    const entries = [...(grouped.get(section.key)?.entries() ?? [])];
    return {
      id: -1 - sectionIndex,
      label: section.label,
      kind: "section",
      children: entries
        .sort(([left], [right]) => left.localeCompare(right, "tr"))
        .map(([label, nodes]) => ({
          id: groupId--,
          label,
          kind: "group" as const,
          children: nodes.sort((left, right) => left.id - right.id),
        })),
    };
  });
  const root: ElectricityCatalogRoot = { id: 0, label: "ELEKTRİK", children };
  return {
    root,
    stats: countCatalogNodes(root.children),
    fetchedAt: VERIFIED_SNAPSHOT_AT,
    source: `${CATALOG_SOURCE} · doğrulanmış katalog anlık görüntüsü`,
    mode,
    warnings: [warning],
  };
}

interface CatalogCoverage {
  mappedCount: number;
  expectedMappedCount: number;
  verifiedLeafCount: number;
  expectedVerifiedLeafCount: number;
  missingOrChangedMenuIds: number[];
}

function catalogCoverage(root: ElectricityCatalogRoot): CatalogCoverage {
  const leaves = new Map<number, { label: string; trail: string[] }>();
  const visit = (node: CatalogNode, trail: string[]): void => {
    const nextTrail = [...trail, node.label];
    if (node.children.length === 0) leaves.set(node.id, { label: node.label, trail });
    node.children.forEach((child) => visit(child, nextTrail));
  };
  root.children.forEach((node) => visit(node, [root.label]));

  const mappings = listCatalogDatasetMappings();
  const missingOrChangedMenuIds = mappings.flatMap(({ menuId }) => {
    const leaf = leaves.get(menuId);
    return leaf && resolveCatalogDataset(menuId, leaf.label, leaf.trail) ? [] : [menuId];
  });
  const verifiedLeafIds = new Set([
    ...mappings.map(({ menuId }) => menuId),
    ...VERIFIED_UNMAPPED_MENU_IDS,
  ]);
  const verifiedLeafCount = [...verifiedLeafIds].filter((menuId) => leaves.has(menuId)).length;

  return {
    mappedCount: mappings.length - missingOrChangedMenuIds.length,
    expectedMappedCount: mappings.length,
    verifiedLeafCount,
    expectedVerifiedLeafCount: verifiedLeafIds.size,
    missingOrChangedMenuIds,
  };
}

function coverageWarning(coverage: CatalogCoverage): string {
  const unavailableCount = coverage.expectedMappedCount - coverage.mappedCount;
  const missingLeafCount = coverage.expectedVerifiedLeafCount - coverage.verifiedLeafCount;
  const affectedIds = coverage.missingOrChangedMenuIds.slice(0, 12).join(", ");
  const affectedSuffix = affectedIds ? ` Etkilenen menü kimlikleri: ${affectedIds}.` : "";
  return `Canlı EPİAŞ kataloğu doğrulanmış kapsamın altında: ${coverage.mappedCount}/${coverage.expectedMappedCount} JSON eşleşmesi ve ${coverage.verifiedLeafCount}/${coverage.expectedVerifiedLeafCount} beklenen menü kaydı bulundu. ${unavailableCount} veri adaptörü ile ${missingLeafCount} menü kaydı güvenli olarak devre dışı bırakıldı.${affectedSuffix}`;
}

function snapshotSectionKey(definition: DatasetDefinition): string {
  if (definition.service === "reporting-service") return "reports";
  if (definition.path.startsWith("/v1/generation/")) return "generation";
  if (definition.path.startsWith("/v1/consumption/")) return "consumption";
  if (definition.path.startsWith("/v1/renewables/")) return "renewables";
  if (definition.path.startsWith("/v1/transmission/")) return "transmission";
  if (definition.path.startsWith("/v1/dams/")) return "dams";
  if (definition.path.startsWith("/v1/markets/data/")) return "messages";
  return "markets";
}

function addSnapshotLeaf(
  grouped: Map<string, Map<string, CatalogNode[]>>,
  section: string,
  group: string,
  node: CatalogNode,
): void {
  const sectionGroups = grouped.get(section);
  if (!sectionGroups) return;
  const nodes = sectionGroups.get(group) ?? [];
  nodes.push(node);
  sectionGroups.set(group, nodes);
}

export function normalizeElectricityRoot(
  menuItems: Record<string, unknown>[],
): ElectricityCatalogResponse["root"] {
  const electricityCandidates = menuItems.filter(isElectricityRoot);
  if (electricityCandidates.length !== 1) {
    throw invalidMenuResponse("Electricity menu root could not be identified unambiguously.");
  }

  const state: ParseState = { nodeCount: 0, ids: new Set<number>() };
  const parsedRoot = parseMenuNode(electricityCandidates[0], 0, state);

  return {
    id: parsedRoot.id,
    label: parsedRoot.label,
    children: parsedRoot.children.map((child) => toCatalogNode(child, 1)),
  };
}

function isElectricityRoot(item: Record<string, unknown>): boolean {
  const labelTr = normalizedLabel(item.labelTr, "tr-TR");
  const labelEn = normalizedLabel(item.labelEn, "en-US");
  return labelTr === "ELEKTRİK" || labelEn === "ELECTRICITY";
}

function normalizedLabel(value: unknown, locale: string): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.toLocaleUpperCase(locale) : null;
}

function parseMenuNode(
  value: unknown,
  depth: number,
  state: ParseState,
): ParsedMenuNode {
  if (depth > MAX_MENU_DEPTH) {
    throw invalidMenuResponse("Electricity menu exceeded the supported nesting depth.");
  }
  if (!isRecord(value)) {
    throw invalidMenuResponse("Electricity menu contained an invalid node.");
  }

  state.nodeCount += 1;
  if (state.nodeCount > MAX_MENU_NODES) {
    throw invalidMenuResponse("Electricity menu contained too many nodes.");
  }

  const id = value.id;
  if (!Number.isSafeInteger(id) || (id as number) < 0) {
    throw invalidMenuResponse("Electricity menu contained an invalid node identifier.");
  }
  if (state.ids.has(id as number)) {
    throw invalidMenuResponse("Electricity menu contained duplicate node identifiers.");
  }
  state.ids.add(id as number);

  const label = readRequiredLabel(value.labelTr);
  const labelEn = readOptionalLabel(value.labelEn);
  if (!Array.isArray(value.children)) {
    throw invalidMenuResponse("Electricity menu contained an invalid child list.");
  }

  return {
    id: id as number,
    label,
    ...(labelEn ? { labelEn } : {}),
    children: value.children.map((child) => parseMenuNode(child, depth + 1, state)),
  };
}

function readRequiredLabel(value: unknown): string {
  if (typeof value !== "string") {
    throw invalidMenuResponse("Electricity menu contained a node without a Turkish label.");
  }
  const label = value.trim();
  if (!label || label.length > MAX_LABEL_LENGTH) {
    throw invalidMenuResponse("Electricity menu contained an invalid Turkish label.");
  }
  return label;
}

function readOptionalLabel(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") {
    throw invalidMenuResponse("Electricity menu contained an invalid English label.");
  }
  const label = value.trim();
  if (!label) return undefined;
  if (label.length > MAX_LABEL_LENGTH) {
    throw invalidMenuResponse("Electricity menu contained an invalid English label.");
  }
  return label;
}

function toCatalogNode(node: ParsedMenuNode, depthFromRoot: number): CatalogNode {
  const kind = depthFromRoot === 1
    ? "section"
    : node.children.length === 0
      ? "dataset"
      : "group";

  return {
    id: node.id,
    label: node.label,
    ...(node.labelEn ? { labelEn: node.labelEn } : {}),
    kind,
    children: node.children.map((child) => toCatalogNode(child, depthFromRoot + 1)),
  };
}

function countCatalogNodes(children: CatalogNode[]): ElectricityCatalogStats {
  const stats: ElectricityCatalogStats = {
    sections: 0,
    groups: 0,
    datasets: 0,
  };

  const visit = (node: CatalogNode): void => {
    if (node.kind === "section") stats.sections += 1;
    if (node.kind === "group") stats.groups += 1;
    // Two top-level electricity entries (message system and bulletins) are
    // simultaneously sections and selectable screens. Counting terminal nodes
    // keeps the total aligned with the official menu tree.
    if (node.children.length === 0) stats.datasets += 1;
    node.children.forEach(visit);
  };

  children.forEach(visit);
  return stats;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidMenuResponse(message: string): GatewayError {
  return new GatewayError("UPSTREAM_INVALID_RESPONSE", message, 502);
}
