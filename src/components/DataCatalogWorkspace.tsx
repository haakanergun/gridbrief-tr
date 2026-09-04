"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ChevronDown,
  Database,
  ExternalLink,
  Factory,
  FileBarChart,
  Gauge,
  Info,
  LineChart,
  Play,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Table2,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  CatalogDatasetCapability,
  DatasetDescriptor,
  DatasetFilterCapability,
  DatasetQueryInput,
  DatasetQueryResponse,
  UnsupportedCatalogDataset,
} from "@/lib/transparency/dataset-types";
import { GenericDatasetViewer } from "./GenericDatasetViewer";
import type { Locale } from "@/i18n/locale";

export type CatalogDestination = "market" | "organizations" | "plants" | "planning";

type CatalogNode = {
  id: number;
  label: string;
  labelEn?: string;
  kind: "section" | "group" | "dataset";
  children: CatalogNode[];
};

type CatalogResponse = {
  root: {
    id: number;
    label: string;
    children: CatalogNode[];
  };
  stats: {
    sections: number;
    groups: number;
    datasets: number;
  };
  fetchedAt: string;
  source: string;
  mode?: "live" | "degraded-live" | "stale-live" | "auth-fallback" | "verified-snapshot";
  warnings?: string[];
};

type FlatDataset = CatalogNode & {
  section: string;
  trail: string[];
};

export type CatalogRuntimeMode =
  | "live"
  | "degraded-live"
  | "stale-live"
  | "auth-fallback"
  | "verified-snapshot"
  | "unavailable";

export type CatalogRuntimeStatus = {
  mode: CatalogRuntimeMode;
  warnings: string[];
};

type DataCatalogWorkspaceProps = {
  date: string;
  refreshNonce: number;
  initialQuery?: string;
  initialSection?: string;
  initialSelectedId?: number;
  initialDatasetQuery?: DatasetQueryInput | null;
  initialDatasetResult?: DatasetQueryResponse | null;
  onCatalogStatus?: (status: CatalogRuntimeStatus) => void;
  onNavigate: (destination: CatalogDestination) => void;
  locale?: Locale;
};

type DatasetCapability = CatalogDatasetCapability & { descriptor: DatasetDescriptor };

type DatasetCapabilitiesResponse = {
  capabilities: DatasetCapability[];
  mappedCount: number;
  catalogDatasetCount: number;
  registryEndpointCount: number;
  unsupported: UnsupportedCatalogDataset[];
  source: string;
  generatedAt: string;
};

const SECTION_DETAILS: Record<string, { short: string; description: string; icon: typeof Zap }> = {
  "ELEKTRİK PİYASALARI": {
    short: "Piyasalar",
    description: "GÖP, GİP, VEP, DGP, dengeleme ve piyasa katılımcıları",
    icon: LineChart,
  },
  "ELEKTRİK ÜRETİM": {
    short: "Üretim",
    description: "Planlanan, emre amade ve gerçekleşen üretim verileri",
    icon: Factory,
  },
  "ELEKTRİK TÜKETİM": {
    short: "Tüketim",
    description: "Tahmin, gerçekleşen tüketim ve tüketici göstergeleri",
    icon: Gauge,
  },
  YEKDEM: {
    short: "YEKDEM",
    description: "Portföy, tahmin, maliyet ve yenilenebilir enerji göstergeleri",
    icon: Zap,
  },
  "ELEKTRİK İLETİM": {
    short: "İletim",
    description: "Kısıt, kapasite, enterkonneksiyon ve sistem verileri",
    icon: Waves,
  },
  BARAJLAR: {
    short: "Barajlar",
    description: "Kot, hacim, doluluk, debi ve enerji karşılığı",
    icon: Waves,
  },
  "PİYASA MESAJ SİSTEMİ": {
    short: "Mesajlar",
    description: "Piyasa mesajları ve operasyonel bildirimler",
    icon: Info,
  },
  "ELEKTRİK PİYASASI RAPORLARI": {
    short: "Raporlar",
    description: "Dönemsel fiyat, hacim, talimat ve özet raporları",
    icon: FileBarChart,
  },
  "ELEKTRİK PİYASASI BÜLTENLERİ": {
    short: "Bültenler",
    description: "EPİAŞ elektrik piyasası bültenleri",
    icon: FileBarChart,
  },
};

const SECTION_DETAILS_EN: Record<string, { short: string; description: string; icon: typeof Zap }> = {
  "ELEKTRİK PİYASALARI": { short: "Markets", description: "DAM, IDM, futures, balancing, and market participants", icon: LineChart },
  "ELEKTRİK ÜRETİM": { short: "Generation", description: "Scheduled, available, and actual generation data", icon: Factory },
  "ELEKTRİK TÜKETİM": { short: "Consumption", description: "Forecast, actual consumption, and consumer indicators", icon: Gauge },
  YEKDEM: { short: "YEKDEM", description: "Portfolio, forecast, cost, and renewable-energy indicators", icon: Zap },
  "ELEKTRİK İLETİM": { short: "Transmission", description: "Constraints, capacity, interconnection, and system data", icon: Waves },
  BARAJLAR: { short: "Reservoirs", description: "Elevation, volume, occupancy, inflow, and energy equivalent", icon: Waves },
  "PİYASA MESAJ SİSTEMİ": { short: "Messages", description: "Market messages and operational notices", icon: Info },
  "ELEKTRİK PİYASASI RAPORLARI": { short: "Reports", description: "Periodic price, volume, instruction, and summary reports", icon: FileBarChart },
  "ELEKTRİK PİYASASI BÜLTENLERİ": { short: "Bulletins", description: "EPİAŞ electricity-market bulletins", icon: FileBarChart },
};

const FAVORITES_STORAGE_KEY = "gridbrief:catalog-favorites:v1";

function flattenDatasets(node: CatalogNode, trail: string[] = []): FlatDataset[] {
  const nextTrail = [...trail, node.label];
  if (node.kind === "dataset" || node.children.length === 0) {
    return [{ ...node, section: trail[0] ?? node.label, trail: nextTrail }];
  }
  return node.children.flatMap((child) => flattenDatasets(child, nextTrail));
}

function countDatasets(node: CatalogNode): number {
  return flattenDatasets(node).length;
}

function normalizeSearch(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

function destinationFor(dataset: FlatDataset, locale: Locale): { view: CatalogDestination; label: string } | null {
  const en = locale === "en";
  const value = normalizeSearch(`${dataset.label} ${dataset.trail.join(" ")}`);
  if (/piyasa takas fiyati|sistem marjinal fiyati|agirlikli ortalama fiyat/.test(value)) {
    return { view: "market", label: en ? "Open market view" : "Piyasa görünümünü aç" };
  }
  if (/piyasa katilimci|lisans turune gore katilimci/.test(value)) {
    return { view: "organizations", label: en ? "Open organization view" : "Organizasyon görünümünü aç" };
  }
  if (/gercek zamanli uretim|uzlastirma esas veris|santral yatirim/.test(value)) {
    return { view: "plants", label: en ? "Open power plant view" : "Santral görünümünü aç" };
  }
  if (/uretim plani|kgup|kudup|emre amade|yuk tahmin|talep tahmini|gercek zamanli tuketim/.test(value)) {
    return { view: "planning", label: en ? "Open planning view" : "Planlama görünümünü aç" };
  }
  return null;
}

function presentationFor(dataset: FlatDataset, locale: Locale): { label: string; icon: typeof LineChart } {
  const en = locale === "en";
  const value = normalizeSearch(dataset.label);
  if (/liste|katilimci|kod|bildirim|islem akisi|kesinti/.test(value)) {
    return { label: en ? "Filterable table" : "Filtrelenebilir tablo", icon: Table2 };
  }
  if (/fiyat|tutar|bedel|gelir|maliyet|endeks/.test(value)) {
    return { label: en ? "Time series + distribution" : "Zaman serisi + dağılım", icon: LineChart };
  }
  if (/adet|sayi/.test(value)) {
    return { label: en ? "Comparative columns" : "Karşılaştırmalı sütun", icon: BarChart3 };
  }
  if (/hacim|miktar|kapasite|uretim|tuketim|rezerv|debi|doluluk|kot/.test(value)) {
    return { label: en ? "Time series + total" : "Zaman serisi + toplam", icon: LineChart };
  }
  return { label: en ? "Summary + data table" : "Özet + veri tablosu", icon: FileBarChart };
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  }).format(date);
}

const FILTER_LABELS: Record<string, string> = {
  basinName: "Havza",
  contractId: "Kontrat kimliği",
  damName: "Baraj",
  deliveryPeriod: "Teslimat dönemi",
  direction: "Yön",
  distributionCompanyId: "Dağıtım şirketi kimliği",
  distributionId: "Dağıtım kimliği",
  distrubutionOrganization: "Dağıtım organizasyonu",
  districtName: "İlçe",
  groupId: "Grup kimliği",
  loadType: "Yük tipi",
  mesajTipId: "Mesaj tipi kimliği",
  meterReadOrgId: "Sayaç okuyan kurum kimliği",
  meterReadingType: "Sayaç okuma tipi",
  orderType: "Talimat tipi",
  organizationId: "Organizasyon kimliği",
  powerPlantId: "Santral kimliği",
  powerplantId: "Santral kimliği",
  priceType: "Fiyat tipi",
  profileGroupId: "Profil grubu kimliği",
  profileGroupName: "Profil grubu",
  provinceId: "İl kimliği",
  region: "Bölge",
  regionId: "Bölge kimliği",
  subscriberProfileGroup: "Abone profil grubu",
  subscriberProfileGroupName: "Abone profil grubu",
  uevcbId: "UEVÇB kimliği",
  uevcbName: "UEVÇB adı",
  year: "Yıl",
};

function filterLabel(filter: DatasetFilterCapability): string {
  return FILTER_LABELS[filter.key] ?? filter.key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function initialFilterValue(filter: DatasetFilterCapability, marketDate: string): string {
  if (filter.key === "region") return "TR1";
  if (filter.key === "year") return marketDate.slice(0, 4);
  return "";
}

function parseFilterValue(value: string, filter: DatasetFilterCapability): string | number | string[] | number[] {
  if (filter.type === "integer" || filter.type === "number") return Number(value);
  if (filter.type === "integer[]") {
    return value.split(",").map((item) => Number(item.trim())).filter(Number.isFinite);
  }
  if (filter.type === "string[]") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return value.trim();
}

function dateInputValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? null;
}

function filterInputValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (
    Array.isArray(value)
    && value.every((item) => typeof item === "string" || (typeof item === "number" && Number.isFinite(item)))
  ) {
    return value.join(", ");
  }
  return null;
}

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json() as { error?: { message?: string } };
    return payload.error?.message || fallback;
  } catch {
    return fallback;
  }
}

export function DataCatalogWorkspace({
  date,
  refreshNonce,
  initialQuery = "",
  initialSection = "all",
  initialSelectedId,
  initialDatasetQuery = null,
  initialDatasetResult = null,
  onCatalogStatus,
  onNavigate,
  locale = "tr",
}: DataCatalogWorkspaceProps) {
  const en = locale === "en";
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [capabilities, setCapabilities] = useState<DatasetCapabilitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [activeSection, setActiveSection] = useState<string>(initialSection);
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId ?? null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(() => new Set());
  const [queryExpanded, setQueryExpanded] = useState(initialDatasetResult === null);
  const initialScopeStart = dateInputValue(
    initialDatasetQuery?.startDate
      ?? initialDatasetQuery?.date
      ?? initialDatasetQuery?.period
      ?? initialDatasetResult?.scope.startDate
      ?? initialDatasetResult?.scope.date
      ?? initialDatasetResult?.scope.period,
  ) ?? date;
  const initialScopeEnd = dateInputValue(
    initialDatasetQuery?.endDate
      ?? initialDatasetQuery?.startDate
      ?? initialDatasetResult?.scope.endDate
      ?? initialDatasetResult?.scope.startDate,
  ) ?? initialScopeStart;
  const initialScopeFilters = initialDatasetQuery?.filters ?? initialDatasetResult?.scope.filters ?? {};
  const [startDate, setStartDate] = useState(initialScopeStart);
  const [endDate, setEndDate] = useState(initialScopeEnd);
  const [datasetPage, setDatasetPage] = useState({
    number: initialDatasetQuery?.page?.number ?? initialDatasetResult?.scope.page.number ?? 1,
    size: initialDatasetQuery?.page?.size ?? initialDatasetResult?.scope.page.size ?? 100,
  });
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(initialScopeFilters).flatMap(([key, value]) => {
        const serialized = filterInputValue(value);
        return serialized === null ? [] : [[key, serialized]];
      }),
    ),
  );
  const [datasetResult, setDatasetResult] = useState<DatasetQueryResponse | null>(initialDatasetResult);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [datasetStateId, setDatasetStateId] = useState<string | null>(
    initialDatasetResult?.dataset.id ?? null,
  );
  const datasetRequestRef = useRef(0);
  const selectedIdRef = useRef<number | null>(initialSelectedId ?? null);
  const catalogIndexRef = useRef<HTMLElement>(null);
  const catalogDetailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let storedFavorites: Set<number> | null = null;
    try {
      const stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) return;
      storedFavorites = new Set(parsed.filter((value): value is number => Number.isInteger(value)));
    } catch {
      // A damaged local preference must never block the live catalogue.
    }
    if (!storedFavorites) return;
    const timer = window.setTimeout(() => setFavorites(storedFavorites), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/catalog", { signal: controller.signal, headers: { Accept: "application/json" } }),
      fetch("/api/dataset", { signal: controller.signal, headers: { Accept: "application/json" } }),
    ])
      .then(async ([catalogResponse, capabilityResponse]) => {
        if (!catalogResponse.ok) {
          throw new Error(await responseError(catalogResponse, "Katalog alınamadı."));
        }
        const catalogPayload = await catalogResponse.json() as CatalogResponse;
        let capabilityPayload: DatasetCapabilitiesResponse | null = null;
        if (capabilityResponse.ok) {
          capabilityPayload = await capabilityResponse.json() as DatasetCapabilitiesResponse;
        } else {
          setCapabilityError(await responseError(capabilityResponse, "Canlı adaptör listesi alınamadı."));
        }
        return { catalogPayload, capabilityPayload };
      })
      .then(({ catalogPayload, capabilityPayload }) => {
        onCatalogStatus?.({
          mode: catalogPayload.mode ?? "live",
          warnings: catalogPayload.warnings ?? [],
        });
        setCatalog(catalogPayload);
        setCapabilities(capabilityPayload);
        const datasets = catalogPayload.root.children.flatMap((section) => flattenDatasets(section));
        const requested = initialSelectedId === undefined
          ? undefined
          : datasets.find((dataset) => dataset.id === initialSelectedId);
        const retained = datasets.find((dataset) => dataset.id === selectedIdRef.current);
        const nextId = requested?.id ?? retained?.id ?? datasets[0]?.id ?? null;
        selectedIdRef.current = nextId;
        setSelectedId(nextId);
        const nextCapability = capabilityPayload?.capabilities.find((item) => item.menuId === nextId);
        setFilterValues(Object.fromEntries(
          (nextCapability?.descriptor.availableFilters ?? []).map((filter) => [
            filter.key,
            initialDatasetQuery && nextCapability?.datasetId === initialDatasetQuery.datasetId
              ? filterInputValue(initialDatasetQuery.filters?.[filter.key]) ?? initialFilterValue(filter, date)
              : initialFilterValue(filter, date),
          ]),
        ));
        if (!initialDatasetResult) {
          setDatasetResult(null);
          setDatasetStateId(null);
          setDatasetError(null);
          setQueryExpanded(true);
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const message = reason instanceof Error ? reason.message : "Katalog alınamadı.";
        onCatalogStatus?.({ mode: "unavailable", warnings: [message] });
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [date, initialDatasetQuery, initialDatasetResult, initialSelectedId, onCatalogStatus, refreshNonce]);

  const sections = useMemo(() => catalog?.root.children ?? [], [catalog]);
  const allDatasets = useMemo(
    () => sections.flatMap((section) => flattenDatasets(section)),
    [sections],
  );
  const capabilitiesByMenuId = useMemo(
    () => new Map((capabilities?.capabilities ?? []).map((capability) => [capability.menuId, capability])),
    [capabilities],
  );
  const unsupportedByMenuId = useMemo(
    () => new Map((capabilities?.unsupported ?? []).map((item) => [item.menuId, item])),
    [capabilities],
  );
  const filteredDatasets = useMemo(() => {
    const needle = normalizeSearch(query.trim());
    return allDatasets.filter((dataset) => {
      if (activeSection !== "all" && dataset.section !== activeSection) return false;
      if (favoritesOnly && !favorites.has(dataset.id)) return false;
      if (!needle) return true;
      return normalizeSearch(`${dataset.label} ${dataset.labelEn ?? ""} ${dataset.trail.join(" ")}`).includes(needle);
    });
  }, [activeSection, allDatasets, favorites, favoritesOnly, query]);

  const groupedDatasets = useMemo(() => {
    const groups = new Map<string, FlatDataset[]>();
    for (const dataset of filteredDatasets) {
      const groupTrail = dataset.trail.slice(0, -1);
      const group = groupTrail.length > 1 ? groupTrail.join(" / ") : dataset.section;
      const items = groups.get(group) ?? [];
      items.push(dataset);
      groups.set(group, items);
    }
    return [...groups.entries()];
  }, [filteredDatasets]);

  const selected = filteredDatasets.find((dataset) => dataset.id === selectedId)
    ?? filteredDatasets[0]
    ?? (favoritesOnly || query.trim() ? undefined : allDatasets[0]);
  const selectedPresentation = selected ? presentationFor(selected, locale) : null;
  const selectedDestination = selected ? destinationFor(selected, locale) : null;
  const selectedSection = selected ? SECTION_DETAILS[selected.section] : null;
  const selectedCapability = selected ? capabilitiesByMenuId.get(selected.id) : undefined;
  const selectedUnsupported = selected ? unsupportedByMenuId.get(selected.id) : undefined;
  const selectedDateFields = selectedCapability?.descriptor.dateFields ?? [];
  const selectedDatasetId = selectedCapability?.datasetId ?? null;
  const visibleDatasetResult = datasetResult?.dataset.id === selectedDatasetId ? datasetResult : null;
  const visibleDatasetLoading = datasetStateId === selectedDatasetId && datasetLoading;
  const visibleDatasetError = datasetStateId === selectedDatasetId ? datasetError : null;
  const integratedCount = capabilities?.mappedCount ?? 0;
  const catalogIsLive = catalog?.mode === undefined || catalog.mode === "live";
  const catalogModeLabel = catalogIsLive
    ? en ? "Live catalog" : "Canlı katalog"
    : catalog?.mode === "degraded-live"
      ? en ? "Partial live catalog" : "Kısmi canlı katalog"
      : catalog?.mode === "stale-live"
        ? en ? "Last live catalog" : "Son canlı katalog"
        : catalog?.mode === "auth-fallback"
          ? en ? "Authentication fallback catalog" : "Kimlik yedek kataloğu"
          : en ? "Verified catalog" : "Doğrulanmış katalog";
  const catalogTimestampLabel = catalogIsLive || catalog?.mode === "degraded-live"
    ? en ? "sync" : "eşitlemesi"
    : en ? "version" : "sürümü";
  const catalogNotice = capabilityError ?? catalog?.warnings?.[0] ?? null;
  const catalogNoticeHeading = capabilityError
    ? en ? "Adapter status unavailable" : "Adaptör durumu alınamadı"
    : catalog?.mode === "degraded-live"
      ? en ? "Live catalog coverage is partial" : "Canlı katalog kapsamı eksik"
      : catalog?.mode === "auth-fallback"
        ? en ? "Live catalog authentication failed" : "Canlı katalog kimliği doğrulanamadı"
        : catalog?.mode === "stale-live"
          ? en ? "Using the last live catalog" : "Son canlı katalog kullanılıyor"
          : catalog?.mode === "verified-snapshot"
            ? en ? "Using a verified catalog" : "Doğrulanmış katalog kullanılıyor"
            : catalogNotice
              ? en ? "Catalog warning" : "Katalog uyarısı"
              : en ? "Source verified" : "Kaynak doğrulandı";
  const DetailIcon = selectedSection?.icon ?? Database;
  const PresentationIcon = selectedPresentation?.icon ?? FileBarChart;

  async function runDatasetQuery(pageOverride = datasetPage): Promise<void> {
    if (!selectedCapability || (datasetLoading && datasetStateId === selectedCapability.datasetId)) return;
    const requiredMissing = selectedCapability.descriptor.availableFilters.find(
      (filter) => filter.required && !filterValues[filter.key]?.trim(),
    );
    if (requiredMissing) {
      setDatasetStateId(selectedCapability.datasetId);
      setDatasetError(`${filterLabel(requiredMissing)} alanı bu veri seti için zorunludur.`);
      return;
    }

    const parsedFilters: Record<string, unknown> = {};
    for (const filter of selectedCapability.descriptor.availableFilters) {
      const raw = filterValues[filter.key]?.trim();
      if (!raw) continue;
      const parsed = parseFilterValue(raw, filter);
      if (
        (filter.type === "integer" || filter.type === "number")
        && (typeof parsed !== "number" || !Number.isFinite(parsed))
      ) {
        setDatasetStateId(selectedCapability.datasetId);
        setDatasetError(`${filterLabel(filter)} geçerli bir sayı olmalıdır.`);
        return;
      }
      if ((filter.type === "integer[]" || filter.type === "string[]") && Array.isArray(parsed) && parsed.length === 0) {
        setDatasetStateId(selectedCapability.datasetId);
        setDatasetError(`${filterLabel(filter)} en az bir değer içermelidir.`);
        return;
      }
      parsedFilters[filter.key] = parsed;
    }

    const payload: DatasetQueryInput = {
      datasetId: selectedCapability.datasetId,
      filters: parsedFilters,
      page: pageOverride,
    };
    for (const field of selectedCapability.descriptor.dateFields) {
      if (field.key === "startDate") payload.startDate = startDate;
      if (field.key === "endDate") payload.endDate = endDate;
      if (field.key === "date") payload.date = startDate;
      if (field.key === "period") payload.period = startDate;
    }

    const requestId = datasetRequestRef.current + 1;
    datasetRequestRef.current = requestId;
    setDatasetPage(pageOverride);
    setDatasetStateId(selectedCapability.datasetId);
    setDatasetLoading(true);
    setDatasetError(null);
    try {
      const response = await fetch("/api/dataset", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await responseError(response, "Veri seti alınamadı."));
      const result = await response.json() as DatasetQueryResponse;
      if (requestId === datasetRequestRef.current) {
        setDatasetResult(result);
        setQueryExpanded(false);
      }
    } catch (reason) {
      if (requestId === datasetRequestRef.current) {
        setDatasetResult(null);
        setDatasetError(reason instanceof Error ? reason.message : "Veri seti alınamadı.");
      }
    } finally {
      if (requestId === datasetRequestRef.current) setDatasetLoading(false);
    }
  }

  function selectSection(label: string) {
    setActiveSection(label);
    setFavoritesOnly(false);
    const next = label === "all"
      ? allDatasets[0]
      : allDatasets.find((dataset) => dataset.section === label);
    if (next) selectDataset(next.id);
  }

  function selectDataset(id: number, revealDetail = false) {
    datasetRequestRef.current += 1;
    selectedIdRef.current = id;
    setSelectedId(id);
    setStartDate(date);
    setEndDate(date);
    setDatasetPage({ number: 1, size: 100 });
    setDatasetLoading(false);
    setDatasetError(null);
    setDatasetResult(null);
    setDatasetStateId(null);
    setQueryExpanded(true);
    const capability = capabilitiesByMenuId.get(id);
    setFilterValues(Object.fromEntries(
      (capability?.descriptor.availableFilters ?? []).map((filter) => [
        filter.key,
        initialFilterValue(filter, date),
      ]),
    ));
    window.requestAnimationFrame(() => {
      const detail = catalogDetailRef.current;
      if (!detail) return;
      if (revealDetail && window.matchMedia("(max-width: 980px)").matches) {
        detail.scrollIntoView({ behavior: "smooth", block: "start" });
        detail.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
        return;
      }
      detail.scrollTo({ top: 0, behavior: "auto" });
    });
  }

  function toggleFavorite(id: number) {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Preference persistence is optional; the in-memory state still works.
      }
      return next;
    });
  }

  function returnToCatalogList() {
    const index = catalogIndexRef.current;
    index?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.requestAnimationFrame(() => {
      index?.querySelector<HTMLElement>("button.active")?.focus({ preventScroll: true });
    });
  }

  if (loading) {
    return (
      <section className="catalog-loading" aria-live="polite">
        <RefreshCw className="spin" size={20} />
        <div><b>{en ? "Syncing the Transparency 2.0 catalog" : "Şeffaflık 2.0 kataloğu eşitleniyor"}</b><span>{en ? "Reading the live EPİAŞ menu tree." : "Canlı EPİAŞ menü ağacı okunuyor."}</span></div>
      </section>
    );
  }

  if (error || !catalog) {
    return (
      <section className="catalog-error" role="alert">
        <Database size={22} />
        <div><b>{en ? "The data catalog is currently unavailable" : "Veri kataloğuna şu anda ulaşılamıyor"}</b><span>{error ?? (en ? "Unexpected catalog response." : "Beklenmeyen katalog yanıtı.")}</span></div>
        <button type="button" onClick={() => window.location.reload()}><RefreshCw size={15} /> {en ? "Try again" : "Yeniden dene"}</button>
      </section>
    );
  }

  return (
    <section className="catalog-workspace">
      <header className="catalog-commandbar">
        <div className="catalog-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={en ? "Search MCP, KGÜP, capacity, reservoir, or report" : "PTF, KGÜP, kapasite, baraj veya rapor ara"}
            aria-label={en ? "Search Transparency datasets" : "Şeffaflık veri setlerinde ara"}
          />
          {query && <button type="button" onClick={() => setQuery("")} aria-label={en ? "Clear search" : "Aramayı temizle"}><X size={14} /></button>}
          <kbd>{filteredDatasets.length}</kbd>
        </div>
        <button
          className={`catalog-favorites-toggle ${favoritesOnly ? "active" : ""}`}
          type="button"
          onClick={() => setFavoritesOnly((value) => !value)}
          aria-pressed={favoritesOnly}
          aria-label={`${favoritesOnly ? en ? "Hide favorite datasets" : "Favori veri setlerini gizle" : en ? "Show favorite datasets" : "Favori veri setlerini göster"} (${favorites.size})`}
        >
          <Bookmark size={15} /> <span className="catalog-favorites-label">{en ? "Favorites" : "Favoriler"}</span> <span>{favorites.size}</span>
        </button>
        <div className={`catalog-live-state ${catalogIsLive ? "" : "snapshot"}`}>
          <i />
          <span>
            <b>{catalogModeLabel}</b>
            <small>{formatTimestamp(catalog.fetchedAt)} {catalogTimestampLabel}</small>
          </span>
        </div>
      </header>

      <div className="catalog-statbar" aria-label={en ? "Catalog summary" : "Katalog özeti"}>
        <div><span>{en ? "Data domains" : "Veri alanı"}</span><strong>{catalog.stats.sections}</strong><small>{en ? "electricity categories" : "elektrik ana başlığı"}</small></div>
        <div><span>{en ? "Datasets" : "Veri seti"}</span><strong>{catalog.stats.datasets}</strong><small>{en ? "official menu items" : "resmî menü kalemi"}</small></div>
        <div><span>{en ? "Live feeds" : "Canlı akış"}</span><strong>{integratedCount}</strong><small>{en ? "verified JSON adapters" : "doğrulanmış JSON adaptörü"}</small></div>
        <div><span>{en ? "Market day" : "Piyasa günü"}</span><strong className="catalog-date-value">{date}</strong><small>Europe / Istanbul</small></div>
      </div>

      <div className="catalog-layout">
        <nav className="catalog-sections" aria-label={en ? "Transparency 2.0 data menu" : "Şeffaflık 2.0 veri menüsü"}>
          <div className="catalog-pane-heading"><span>{en ? "TRANSPARENCY MENU" : "ŞEFFAFLIK MENÜSÜ"}</span><small>{catalog.stats.datasets} {en ? "items" : "kalem"}</small></div>
          <button
            className={activeSection === "all" ? "active" : ""}
            type="button"
            onClick={() => selectSection("all")}
            aria-current={activeSection === "all" ? "page" : undefined}
          >
            <span className="catalog-section-icon"><Database size={16} /></span>
            <span><b>{en ? "All datasets" : "Tüm veri setleri"}</b><small>{en ? "Complete electricity catalog" : "Eksiksiz elektrik kataloğu"}</small></span>
            <em>{allDatasets.length}</em>
          </button>
          {sections.map((section) => {
            const details = (en ? SECTION_DETAILS_EN : SECTION_DETAILS)[section.label];
            const Icon = details?.icon ?? FileBarChart;
            return (
              <button
                className={activeSection === section.label ? "active" : ""}
                type="button"
                key={section.id}
                onClick={() => selectSection(section.label)}
                aria-current={activeSection === section.label ? "page" : undefined}
              >
                <span className="catalog-section-icon"><Icon size={16} /></span>
                <span><b>{details?.short ?? section.label}</b><small>{details?.description ?? (en ? "Transparency 2.0 data domain" : "Şeffaflık 2.0 veri alanı")}</small></span>
                <em>{countDatasets(section)}</em>
              </button>
            );
          })}
          <div className={`catalog-source-note ${catalogNotice ? "warning" : ""}`}>
            {catalogNotice ? <Info size={14} /> : <CheckCircle2 size={14} />}
            <span>
              <b>{catalogNoticeHeading}</b>
              <small>{catalogNotice ?? catalog.source}</small>
            </span>
          </div>
        </nav>

        <section ref={catalogIndexRef} className="catalog-index" aria-label={en ? "Dataset list" : "Veri seti listesi"}>
          <div className="catalog-pane-heading">
            <span>{favoritesOnly ? en ? "FAVORITE DATASETS" : "FAVORİ VERİ SETLERİ" : activeSection === "all" ? en ? "ALL DATASETS" : "TÜM VERİ SETLERİ" : (en ? SECTION_DETAILS_EN[activeSection]?.short ?? activeSection : activeSection)}</span>
            <small>{filteredDatasets.length} {en ? "results" : "sonuç"}</small>
          </div>
          {groupedDatasets.length === 0 ? (
            <div className="catalog-empty"><Search size={22} /><b>{en ? "No matching dataset" : "Eşleşen veri seti yok"}</b><span>{en ? "Change the search term or section filter." : "Arama sözcüğünü veya bölüm filtresini değiştirin."}</span></div>
          ) : (
            <div className="catalog-groups">
              {groupedDatasets.map(([group, datasets], index) => (
                <details key={group} open={Boolean(query) || activeSection !== "all" || index < 2}>
                  <summary><span>{group}</span><small>{datasets.length}</small><ChevronDown size={15} /></summary>
                  <div>
                    {datasets.map((dataset) => {
                      const liveCapability = capabilitiesByMenuId.has(dataset.id);
                      return (
                        <button
                          className={selected?.id === dataset.id ? "active" : ""}
                          type="button"
                          key={dataset.id}
                          onClick={() => selectDataset(dataset.id, true)}
                          aria-current={selected?.id === dataset.id ? "page" : undefined}
                        >
                          <span className="dataset-status"><i className={liveCapability ? "integrated" : "catalogued"} /></span>
                          <span><b>{en ? dataset.labelEn || dataset.label : dataset.label}</b><small>{en ? dataset.label : dataset.labelEn || "EPİAŞ Transparency 2.0"}</small></span>
                          {favorites.has(dataset.id) && <BookmarkCheck size={14} />}
                          <ArrowRight size={14} />
                        </button>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>

        <aside ref={catalogDetailRef} className="catalog-detail" aria-label={en ? "Selected dataset" : "Seçili veri seti"}>
          {selected && selectedPresentation ? (
            <>
              <div className="catalog-detail-topline">
                <span>{en ? "DATASET" : "VERİ SETİ"} · #{selected.id}</span>
                <div className="catalog-detail-actions">
                  <button className="catalog-back-button" type="button" onClick={returnToCatalogList}>
                    <ArrowLeft size={15} /> <span>{en ? "Data menu" : "Veri menüsü"}</span>
                  </button>
                  <button
                    className="catalog-favorite-button"
                    type="button"
                    onClick={() => toggleFavorite(selected.id)}
                    aria-label={favorites.has(selected.id) ? en ? "Remove from favorites" : "Favorilerden çıkar" : en ? "Add to favorites" : "Favorilere ekle"}
                    aria-pressed={favorites.has(selected.id)}
                  >
                    {favorites.has(selected.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                  </button>
                </div>
              </div>
              <div className="catalog-detail-icon"><DetailIcon size={20} /></div>
              <div className="catalog-breadcrumb">{selected.trail.slice(0, -1).join(" / ")}</div>
              <h2 tabIndex={-1}>{en ? selected.labelEn || selected.label : selected.label}</h2>
              {selected.labelEn && <p className="catalog-english-label">{en ? selected.label : selected.labelEn}</p>}
              <p className="catalog-detail-copy">
                {(en ? SECTION_DETAILS_EN[selected.section]?.description : selectedSection?.description) ?? (en ? "Official dataset published in the EPİAŞ Transparency 2.0 electricity domain." : "EPİAŞ Şeffaflık 2.0 elektrik veri alanında yayımlanan resmî veri seti.")}
              </p>

              <div className={`catalog-presentation-band ${selectedCapability ? "is-live" : "is-catalog-only"}`}>
                {selectedCapability ? <Play size={17} /> : <PresentationIcon size={18} />}
                <span>
                  <small>{selectedCapability ? en ? "LIVE SERVICE · RECOMMENDED VIEW" : "CANLI SERVİS · ÖNERİLEN GÖRÜNÜM" : en ? "CATALOG STATUS · RECOMMENDED VIEW" : "KATALOG DURUMU · ÖNERİLEN GÖRÜNÜM"}</small>
                  <b>{selectedCapability ? `${selectedCapability.descriptor.service} · ${selectedPresentation.label}` : selectedPresentation.label}</b>
                </span>
              </div>

              {selectedCapability ? (
                <>
                  <form
                    className={`dataset-query-panel ${queryExpanded ? "is-expanded" : "is-collapsed"}`}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void runDatasetQuery();
                    }}
                  >
                    <button
                      className="dataset-query-heading"
                      type="button"
                      aria-expanded={queryExpanded}
                      aria-controls={`dataset-query-fields-${selected.id}`}
                      onClick={() => setQueryExpanded((value) => !value)}
                    >
                      <span><SlidersHorizontal size={14} /><b>{en ? "Query scope" : "Sorgu kapsamı"}</b></span>
                      <span className="dataset-query-toggle-meta">
                        <small>{queryExpanded ? selectedCapability.datasetId : `${startDate}${endDate !== startDate ? ` — ${endDate}` : ""}`}</small>
                        <ChevronDown size={15} aria-hidden="true" />
                      </span>
                    </button>

                    {queryExpanded ? (
                      <div className="dataset-query-body" id={`dataset-query-fields-${selected.id}`}>
                    {selectedDateFields.length > 0 ? (
                      <div className="dataset-date-grid">
                        {selectedDateFields.some((field) => field.key === "startDate") ? (
                          <label><span>{en ? "Start" : "Başlangıç"}</span><input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} required={selectedDateFields.find((field) => field.key === "startDate")?.required} /></label>
                        ) : null}
                        {selectedDateFields.some((field) => field.key === "endDate") ? (
                          <label><span>{en ? "End" : "Bitiş"}</span><input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} required={selectedDateFields.find((field) => field.key === "endDate")?.required} /></label>
                        ) : null}
                        {selectedDateFields.some((field) => field.key === "date") ? (
                          <label><span>{en ? "Date" : "Tarih"}</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required={selectedDateFields.find((field) => field.key === "date")?.required} /></label>
                        ) : null}
                        {selectedDateFields.some((field) => field.key === "period") ? (
                          <label><span>{en ? "Period" : "Dönem"}</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required={selectedDateFields.find((field) => field.key === "period")?.required} /></label>
                        ) : null}
                      </div>
                    ) : null}

                    {selectedCapability.descriptor.availableFilters.length > 0 ? (
                      <div className="dataset-filter-grid">
                        {selectedCapability.descriptor.availableFilters.map((filter) => (
                          <label key={filter.key}>
                            <span>{filterLabel(filter)}{filter.required ? " *" : ""}</span>
                            <input
                              type={filter.type === "integer" || filter.type === "number" ? "number" : "text"}
                              min={filter.type === "integer" || filter.type === "number" ? 0 : undefined}
                              inputMode={filter.type.includes("integer") || filter.type === "number" ? "numeric" : "text"}
                              value={filterValues[filter.key] ?? ""}
                              placeholder={filter.type.endsWith("[]") ? en ? "Comma-separated" : "Virgülle ayırın" : filter.required ? en ? "Required" : "Zorunlu" : en ? "All" : "Tümü"}
                              required={filter.required}
                              onChange={(event) => setFilterValues((current) => ({ ...current, [filter.key]: event.target.value }))}
                            />
                          </label>
                        ))}
                      </div>
                    ) : null}

                    <div className="dataset-query-actions">
                      <button className="catalog-primary-action" type="submit" disabled={visibleDatasetLoading}>
                        {visibleDatasetLoading ? <RefreshCw className="spin" size={15} /> : <Play size={15} />}
                        {visibleDatasetLoading ? en ? "Waiting for EPİAŞ" : "EPİAŞ yanıtı bekleniyor" : en ? "Fetch live data" : "Canlı veriyi getir"}
                      </button>
                      {selectedDestination ? (
                        <button className="catalog-primary-action secondary" type="button" onClick={() => onNavigate(selectedDestination.view)}>
                          {selectedDestination.label} <ArrowRight size={15} />
                        </button>
                      ) : null}
                    </div>
                      </div>
                    ) : null}
                  </form>

                  {visibleDatasetResult || visibleDatasetLoading || visibleDatasetError ? (
                    <GenericDatasetViewer
                      result={visibleDatasetResult}
                      loading={visibleDatasetLoading}
                      error={visibleDatasetError}
                      onRetry={() => void runDatasetQuery()}
                      onPageChange={(number, size) => void runDatasetQuery({ number, size })}
                      locale={locale}
                    />
                  ) : (
                    <div className="dataset-query-ready">
                      <CheckCircle2 size={16} />
                      <span><b>{en ? "Ready to query" : "Sorguya hazır"}</b><small>{en ? "Review the date and optional filters, then fetch live data." : "Tarih ve isteğe bağlı filtreleri kontrol edip canlı veriyi getirin."}</small></span>
                    </div>
                  )}
                </>
              ) : selectedUnsupported ? (
                <div className="dataset-unavailable-note">
                  <Info size={17} />
                  <span>
                    <b>{selectedUnsupported.status === "external-document" ? "JSON servisi olarak sunulmuyor" : "Tarih geçiş kuralı doğrulanıyor"}</b>
                    <small>{selectedUnsupported.reason}</small>
                  </span>
                  {selectedUnsupported.externalUrl ? (
                    <a href={selectedUnsupported.externalUrl} target="_blank" rel="noreferrer">
                      Resmî EPİAŞ sayfasını aç <ExternalLink size={13} />
                    </a>
                  ) : null}
                </div>
              ) : (
                <div className="catalog-quality-note">
                  <Info size={16} />
                  <span><b>Yalnız katalog kaydı</b><small>Bu ekran için doğrulanmış canlı adaptör bilgisi bulunamadı.</small></span>
                </div>
              )}

              <dl className="catalog-metadata compact">
                <div><dt>{en ? "View" : "Görünüm"}</dt><dd>{selectedPresentation.label}</dd></div>
                <div><dt>{en ? "Query model" : "Sorgu modeli"}</dt><dd>{selectedCapability ? `${selectedCapability.descriptor.method}${selectedCapability.descriptor.supportsPagination ? en ? " · paginated" : " · sayfalı" : en ? " · single response" : " · tek yanıt"}` : en ? "Catalog record" : "Katalog kaydı"}</dd></div>
                <div><dt>{en ? "Time standard" : "Zaman standardı"}</dt><dd>Türkiye market time · UTC+3</dd></div>
                <div><dt>{en ? "Source" : "Kaynak"}</dt><dd>EPİAŞ Transparency 2.0</dd></div>
              </dl>

              <a
                className="catalog-doc-action"
                href={selectedCapability?.descriptor.service === "reporting-service"
                  ? "https://seffaflik.epias.com.tr/reporting-service/technical/tr/index.html"
                  : "https://seffaflik.epias.com.tr/electricity-service/technical/tr/index.html"}
                target="_blank"
                rel="noreferrer"
              >
                {en ? "Technical data dictionary" : "Teknik veri sözlüğü"} <ExternalLink size={13} />
              </a>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
