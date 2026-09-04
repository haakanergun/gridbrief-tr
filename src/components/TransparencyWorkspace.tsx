"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  CircleAlert,
  Database,
  Factory,
  Gauge,
  LoaderCircle,
  Network,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createSyntheticExplorerResponse,
  normalizeExplorerSearch,
  type CatalogExplorerResponse,
  type ExplorerPoint,
  type ExplorerRequest,
  type ExplorerResponse,
  type OrganizationExplorerResponse,
  type PlantExplorerResponse,
} from "@/lib/explorer";
import { PlanningChart, type ExplorerMetricKey, type PlanningSeries } from "@/components/PlanningChart";
import type { Locale } from "@/i18n/locale";

export type TransparencyView = "organizations" | "plants" | "planning";

interface TransparencyWorkspaceProps {
  view: TransparencyView;
  date: string;
  staticDemo: boolean;
  initialResult?: ExplorerResponse | null;
  initialQuery?: string;
  initialPlanningLayer?: "production" | "consumption";
  locale?: Locale;
}

const ORGANIZATION_SERIES: PlanningSeries[] = [
  { key: "kgup", label: "KGÜP", tone: "primary", dashed: true },
  { key: "kudup", label: "KUDÜP", tone: "secondary" },
  { key: "eak", label: "EAK", tone: "muted" },
];

const PLANT_SERIES: PlanningSeries[] = [
  { key: "realtimeGeneration", label: "Gerçekleşen üretim", tone: "primary" },
  { key: "injectionQuantity", label: "UEVM", tone: "secondary", dashed: true },
];

const CONSUMPTION_SERIES: PlanningSeries[] = [
  { key: "realtimeConsumption", label: "Gerçekleşen tüketim", tone: "primary" },
  { key: "loadPlan", label: "Yük tahmin planı", tone: "secondary", dashed: true },
];

const PLANT_SERIES_EN: PlanningSeries[] = [
  { key: "realtimeGeneration", label: "Actual generation", tone: "primary" },
  { key: "injectionQuantity", label: "UEVM", tone: "secondary", dashed: true },
];

const CONSUMPTION_SERIES_EN: PlanningSeries[] = [
  { key: "realtimeConsumption", label: "Actual consumption", tone: "primary" },
  { key: "loadPlan", label: "Load forecast plan", tone: "secondary", dashed: true },
];

const INITIAL_ENTITY_ROWS = 120;

export function TransparencyWorkspace({
  view,
  date,
  staticDemo,
  initialResult = null,
  initialQuery = "",
  initialPlanningLayer = "production",
  locale = "tr",
}: TransparencyWorkspaceProps) {
  const en = locale === "en";
  const seededCatalog = initialResult?.view === "catalog" && initialResult.scope.date === date
    ? initialResult
    : null;
  const seededOrganization = initialResult?.view === "organization" && initialResult.scope.date === date
    ? initialResult
    : null;
  const seededPlant = initialResult?.view === "plant" && initialResult.scope.date === date
    ? initialResult
    : null;
  const seededPlanning = initialResult?.view === "planning" && initialResult.scope.date === date
    ? initialResult
    : null;
  const [catalog, setCatalog] = useState<CatalogExplorerResponse | null>(seededCatalog);
  const [detail, setDetail] = useState<ExplorerResponse | null>(seededOrganization ?? seededPlant ?? seededPlanning);
  const [organizationContext, setOrganizationContext] = useState<OrganizationExplorerResponse | null>(seededOrganization);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | null>(
    seededOrganization?.scope.organizationId ?? seededPlanning?.scope.organizationId ?? null,
  );
  const [selectedPlantId, setSelectedPlantId] = useState<number | null>(seededPlant?.scope.powerPlantId ?? null);
  const [selectedUevcbId, setSelectedUevcbId] = useState<number | null>(seededPlanning?.scope.uevcbId ?? null);
  const [query, setQuery] = useState(initialQuery);
  const [planningLayer, setPlanningLayer] = useState<"production" | "consumption">(initialPlanningLayer);
  const [catalogLoading, setCatalogLoading] = useState(!seededCatalog);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const manualDetailController = useRef<AbortController | null>(null);

  const requestExplorer = useCallback(async (request: ExplorerRequest, signal?: AbortSignal) => {
    signal?.throwIfAborted();
    if (staticDemo) return createSyntheticExplorerResponse(request);

    const response = await fetch("/api/explorer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
    if (!response.ok) throw new Error(await readExplorerError(response));
    return await response.json() as ExplorerResponse;
  }, [staticDemo]);

  useEffect(() => {
    if (seededCatalog) return;
    const controller = new AbortController();
    void requestExplorer({ view: "catalog", date }, controller.signal)
      .then((response) => {
        if (response.view === "catalog") setCatalog(response);
      })
      .catch((reason: unknown) => {
        if (!isAbortError(reason)) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false);
      });
    return () => controller.abort();
  }, [date, requestExplorer, seededCatalog]);

  useEffect(() => {
    if (view !== "planning") return;
    const seedMatchesSelection = seededPlanning
      && (seededPlanning.scope.organizationId ?? null) === selectedOrganizationId
      && (seededPlanning.scope.uevcbId ?? null) === selectedUevcbId;
    if (seedMatchesSelection) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setDetailLoading(true);
        setError(null);
      }
    });
    const request: ExplorerRequest = {
      view: "planning",
      date,
      ...(selectedOrganizationId ? { organizationId: selectedOrganizationId } : {}),
      ...(selectedUevcbId ? { uevcbId: selectedUevcbId } : {}),
      region: "TR1",
    };
    void requestExplorer(request, controller.signal)
      .then(setDetail)
      .catch((reason: unknown) => {
        if (!isAbortError(reason)) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [date, requestExplorer, seededPlanning, selectedOrganizationId, selectedUevcbId, view]);

  useEffect(() => {
    if (view !== "planning" || selectedOrganizationId === null) return;
    if (organizationContext?.scope.organizationId === selectedOrganizationId) return;
    const controller = new AbortController();
    void requestExplorer({ view: "organization", date, organizationId: selectedOrganizationId }, controller.signal)
      .then((response) => {
        if (response.view === "organization") setOrganizationContext(response);
      })
      .catch((reason: unknown) => {
        if (!isAbortError(reason)) setError(errorMessage(reason));
      });
    return () => controller.abort();
  }, [date, organizationContext?.scope.organizationId, requestExplorer, selectedOrganizationId, view]);

  useEffect(() => () => manualDetailController.current?.abort(), [date, view]);

  const filteredOrganizations = useMemo(() => {
    const normalized = normalizeExplorerSearch(query);
    if (!catalog) return [];
    const matches = catalog.organizations
      .filter((item) => !normalized || normalizeExplorerSearch(`${item.name} ${item.shortName ?? ""} ${item.eic ?? ""}`).includes(normalized));
    return normalized ? matches : matches.slice(0, INITIAL_ENTITY_ROWS);
  }, [catalog, query]);

  const filteredPlants = useMemo(() => {
    const normalized = normalizeExplorerSearch(query);
    if (!catalog) return [];
    const matches = catalog.plants
      .filter((item) => !normalized || normalizeExplorerSearch(`${item.name} ${item.shortName ?? ""} ${item.eic ?? ""}`).includes(normalized));
    return normalized ? matches : matches.slice(0, INITIAL_ENTITY_ROWS);
  }, [catalog, query]);

  const selectedOrganizationDetail = detail?.view === "organization"
    && detail.scope.date === date
    && detail.scope.organizationId === selectedOrganizationId
    ? detail
    : null;
  const selectedPlantDetail = detail?.view === "plant"
    && detail.scope.date === date
    && detail.scope.powerPlantId === selectedPlantId
    ? detail
    : null;
  const selectedPlanningDetail = detail?.view === "planning"
    && detail.scope.date === date
    && (detail.scope.organizationId ?? null) === selectedOrganizationId
    && (detail.scope.uevcbId ?? null) === selectedUevcbId
    ? detail
    : null;

  async function loadOrganization(organizationId: number) {
    manualDetailController.current?.abort();
    const controller = new AbortController();
    manualDetailController.current = controller;
    setSelectedOrganizationId(organizationId);
    setSelectedUevcbId(null);
    setDetailLoading(true);
    setError(null);
    try {
      const response = await requestExplorer(
        { view: "organization", date, organizationId },
        controller.signal,
      );
      if (response.view === "organization") {
        setDetail(response);
        setOrganizationContext(response);
      }
    } catch (reason) {
      if (!isAbortError(reason)) setError(errorMessage(reason));
    } finally {
      if (manualDetailController.current === controller) {
        manualDetailController.current = null;
        setDetailLoading(false);
      }
    }
  }

  async function loadPlant(powerPlantId: number) {
    manualDetailController.current?.abort();
    const controller = new AbortController();
    manualDetailController.current = controller;
    setSelectedPlantId(powerPlantId);
    setDetailLoading(true);
    setError(null);
    try {
      const response = await requestExplorer(
        { view: "plant", date, powerPlantId },
        controller.signal,
      );
      if (response.view === "plant") setDetail(response);
    } catch (reason) {
      if (!isAbortError(reason)) setError(errorMessage(reason));
    } finally {
      if (manualDetailController.current === controller) {
        manualDetailController.current = null;
        setDetailLoading(false);
      }
    }
  }

  function selectPlanningOrganization(value: string) {
    const organizationId = value ? Number(value) : null;
    setSelectedOrganizationId(organizationId);
    setSelectedUevcbId(null);
    setOrganizationContext(null);
  }

  const selectedPlanningUnit = selectedPlanningDetail?.uevcb;
  const planningUevcbs = organizationContext?.uevcbs.length
    ? organizationContext.uevcbs
    : selectedPlanningUnit
      ? [selectedPlanningUnit]
      : [];

  if (view === "organizations") {
    return (
      <EntityExplorerLayout
        title={en ? "Organization scope" : "Organizasyon kapsamı"}
        description={en ? "Review market participation, DAM matches, and UEVÇB-level generation plans in one evidence chain." : "Piyasa katılımı, GÖP eşleşmesi ve UEVÇB bazlı üretim planlarını aynı kanıt zincirinde inceleyin."}
        icon={<Building2 size={19} />}
        total={catalog?.organizations.length ?? 0}
        visible={filteredOrganizations.length}
        query={query}
        onQuery={setQuery}
        loading={catalogLoading}
        error={error}
        source={selectedOrganizationDetail?.source ?? catalog?.source}
        locale={locale}
        list={
          filteredOrganizations.map((organization) => (
            <button
              type="button"
              key={organization.id}
              className={`entity-row ${selectedOrganizationId === organization.id ? "active" : ""}`}
              onClick={() => void loadOrganization(organization.id)}
            >
              <span className="entity-avatar"><Building2 size={15} /></span>
              <span><b>{organization.shortName || organization.name}</b><small>{organization.name}</small></span>
              <ChevronRight size={15} />
            </button>
          ))
        }
      >
        {selectedOrganizationDetail ? (
          <OrganizationDetail response={selectedOrganizationDetail} loading={detailLoading} locale={locale} />
        ) : (
          <ExplorerEmpty icon={<Network size={25} />} loading={detailLoading} title={en ? "Select an organization" : "Bir organizasyon seçin"} detail={en ? "Select a record to open its market participation, linked UEVÇB units, and planning series." : "Kayıt listesinden seçim yaptığınızda piyasa katılımı, bağlı UEVÇB’ler ve plan serileri burada açılır."} locale={locale} />
        )}
      </EntityExplorerLayout>
    );
  }

  if (view === "plants") {
    return (
      <EntityExplorerLayout
        title={en ? "Power plant scope" : "Santral kapsamı"}
        description={en ? "Compare plant-level actual generation with settlement injection quantities by hour." : "Santral bazlı gerçekleşen üretim ile uzlaştırmaya esas veriş miktarını saatlik düzeyde karşılaştırın."}
        icon={<Factory size={19} />}
        total={catalog?.plants.length ?? 0}
        visible={filteredPlants.length}
        query={query}
        onQuery={setQuery}
        loading={catalogLoading}
        error={error}
        source={selectedPlantDetail?.source ?? catalog?.source}
        locale={locale}
        list={
          filteredPlants.map((plant) => (
            <button
              type="button"
              key={plant.id}
              className={`entity-row ${selectedPlantId === plant.id ? "active" : ""}`}
              onClick={() => void loadPlant(plant.id)}
            >
              <span className="entity-avatar"><Factory size={15} /></span>
              <span><b>{plant.shortName || plant.name}</b><small>{plant.name}</small></span>
              <ChevronRight size={15} />
            </button>
          ))
        }
      >
        {selectedPlantDetail ? (
          <PlantDetail response={selectedPlantDetail} loading={detailLoading} locale={locale} />
        ) : (
          <ExplorerEmpty icon={<Factory size={25} />} loading={detailLoading} title={en ? "Select a power plant" : "Bir santral seçin"} detail={en ? "A plant selection opens actual generation and UEVM records. Planning data remains UEVÇB-level in the Planning view, matching the official publication level." : "Santral seçimi gerçekleşen üretim ve UEVM kayıtlarını açar. Plan verileri, resmî yayın seviyesine uygun olarak Planlama görünümünde UEVÇB bazındadır."} locale={locale} />
        )}
      </EntityExplorerLayout>
    );
  }

  const planning = selectedPlanningDetail;
  const planningSeries = planningLayer === "production" ? ORGANIZATION_SERIES : en ? CONSUMPTION_SERIES_EN : CONSUMPTION_SERIES;
  const planningRevision = pairedDifference(planning?.points, "kudup", "kgup");
  const planningRevisionCoverage = pairedCoverage(planning?.points, "kudup", "kgup");
  const consumptionDeviation = pairedDifference(planning?.points, "realtimeConsumption", "loadPlan");
  const consumptionCoverage = pairedCoverage(planning?.points, "realtimeConsumption", "loadPlan");
  return (
    <section className="planning-workspace view-enter">
      <div className="planning-commandbar">
        <div>
          <span className="eyebrow">{en ? "PLAN / ACTUAL" : "PLAN / GERÇEKLEŞEN"}</span>
          <h2>{en ? "Operational planning desk" : "Operasyonel planlama masası"}</h2>
          <p>{en ? "Compare generation-plan revisions and system consumption forecasts at their official publication levels." : "Üretim plan revizyonlarını ve sistem tüketim tahminini resmî yayın seviyelerinde karşılaştırın."}</p>
        </div>
        <div className="planning-scope-controls">
          <label>
            {en ? "Generation scope" : "Üretim kapsamı"}
            <select value={selectedOrganizationId ?? ""} onChange={(event) => selectPlanningOrganization(event.target.value)}>
              <option value="">{en ? "Türkiye total" : "Türkiye geneli"}</option>
              {catalog?.organizations.map((organization) => (
                <option value={organization.id} key={organization.id}>{organization.shortName || organization.name}</option>
              ))}
            </select>
          </label>
          <label>
            UEVÇB
            <select
              value={selectedUevcbId ?? ""}
              onChange={(event) => setSelectedUevcbId(event.target.value ? Number(event.target.value) : null)}
              disabled={!selectedOrganizationId || !planningUevcbs.length}
            >
              <option value="">{en ? "All UEVÇB units" : "Tüm UEVÇB’ler"}</option>
              {planningUevcbs.map((unit) => <option value={unit.id} key={unit.id}>{unit.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      {error && <InlineWarning message={error} />}
      {planning?.warnings.map((warning, index) => <InlineWarning key={`${warning}-${index}`} message={localizedExplorerWarning(warning, locale)} subtle />)}

      <div className="planning-kpi-band">
        {planningLayer === "production" ? (
          <>
            <MetricCard label={en ? "Published KGÜP" : "Yayımlanan KGÜP"} value={formatMwh(sumMetric(planning?.points, "kgup"), locale)} meta={en ? `${coverage(planning?.points, "kgup")}/24 hours · initial schedule` : `${coverage(planning?.points, "kgup")}/24 saat · ilk program`} />
            <MetricCard label={en ? "Published KUDÜP" : "Yayımlanan KUDÜP"} value={formatMwh(sumMetric(planning?.points, "kudup"), locale)} meta={en ? `${coverage(planning?.points, "kudup")}/24 hours · current schedule` : `${coverage(planning?.points, "kudup")}/24 saat · güncel program`} />
            <MetricCard label={en ? "Plan revision" : "Plan revizyonu"} value={formatSignedMwh(planningRevision, locale)} meta={en ? `${planningRevisionCoverage}/24 paired hours · KUDÜP − KGÜP` : `${planningRevisionCoverage}/24 ortak saat · KUDÜP − KGÜP`} trend={planningRevision} />
            <MetricCard label={en ? "EAK coverage" : "EAK kapsamı"} value={`${coverage(planning?.points, "eak")}/24`} meta={en ? "Missing hours are not zero" : "Eksik saatler sıfır değildir"} />
          </>
        ) : (
          <>
            <MetricCard label={en ? "Published load plan" : "Yayımlanan yük planı"} value={formatMwh(sumMetric(planning?.points, "loadPlan"), locale)} meta={en ? `${coverage(planning?.points, "loadPlan")}/24 system hours` : `${coverage(planning?.points, "loadPlan")}/24 sistem saati`} />
            <MetricCard label={en ? "Published consumption" : "Yayımlanan tüketim"} value={formatMwh(sumMetric(planning?.points, "realtimeConsumption"), locale)} meta={en ? `${coverage(planning?.points, "realtimeConsumption")}/24 system hours` : `${coverage(planning?.points, "realtimeConsumption")}/24 sistem saati`} />
            <MetricCard label={en ? "Plan deviation" : "Plan sapması"} value={formatSignedMwh(consumptionDeviation, locale)} meta={en ? `${consumptionCoverage}/24 paired hours · actual − plan` : `${consumptionCoverage}/24 ortak saat · gerçekleşen − plan`} trend={consumptionDeviation} />
            <MetricCard label={en ? "Paired data coverage" : "Ortak veri kapsamı"} value={`${consumptionCoverage}/24`} meta={en ? "Türkiye system" : "Türkiye sistemi"} />
          </>
        )}
      </div>

      <div className="planning-panel">
        <div className="panel-title-row">
          <div>
            <span className="eyebrow">{planningLayer === "production" ? en ? "GENERATION SCHEDULE" : "ÜRETİM PROGRAMI" : en ? "SYSTEM CONSUMPTION" : "SİSTEM TÜKETİMİ"}</span>
            <h3>{planningLayer === "production" ? en ? "Plan versions and available capacity" : "Plan versiyonları ve emre amade kapasite" : en ? "Load forecast plan and actual consumption" : "Yük tahmin planı ve gerçekleşen tüketim"}</h3>
          </div>
          <div className="segment-control" role="group" aria-label={en ? "Planning layer" : "Planlama katmanı"}>
            <button type="button" className={planningLayer === "production" ? "active" : ""} onClick={() => setPlanningLayer("production")}>{en ? "Generation" : "Üretim"}</button>
            <button type="button" className={planningLayer === "consumption" ? "active" : ""} onClick={() => setPlanningLayer("consumption")}>{en ? "Consumption · System" : "Tüketim · Sistem"}</button>
          </div>
        </div>
        <PlanningChart
          points={planning?.points ?? []}
          series={planningSeries}
          label={planningLayer === "production" ? en ? "Hourly KGÜP, KUDÜP, and EAK" : "Saatlik KGÜP, KUDÜP ve EAK" : en ? "Hourly system load forecast and actual consumption" : "Saatlik sistem yük tahmini ve gerçekleşen tüketim"}
          loading={detailLoading}
          locale={locale}
        />
      </div>

      <div className="planning-lower-grid">
        <DataTable
          points={planning?.points ?? []}
          columns={planningLayer === "production"
            ? [
                { key: "kgup", label: "KGÜP" },
                { key: "kudup", label: "KUDÜP" },
                { key: "eak", label: "EAK" },
              ]
            : [
                { key: "loadPlan", label: en ? "Load plan" : "Yük planı" },
                { key: "realtimeConsumption", label: en ? "Actual" : "Gerçekleşen" },
              ]}
          locale={locale}
        />
        <aside className="scope-explainer">
          <span className="eyebrow">{en ? "SCOPE BOUNDARY" : "KAPSAM SINIRI"}</span>
          <h3>{planningLayer === "production" ? en ? "Generation plans reach UEVÇB level" : "Üretim planı UEVÇB düzeyine iner" : en ? "Consumption plans are system-level" : "Tüketim planı sistem seviyesindedir"}</h3>
          <p>{planningLayer === "production"
            ? en ? "Selecting an organization or UEVÇB filters only KGÜP, KUDÜP, and EAK. Missing records are not interpreted as zero." : "Organizasyon veya UEVÇB seçimi yalnız KGÜP, KUDÜP ve EAK serilerini filtreler. Eksik kayıtlar sıfır olarak yorumlanmaz."
            : en ? "The EPİAŞ load forecast is not an organization or plant consumption plan. It provides system-market context only." : "EPİAŞ yük tahmin planı organizasyon ya da santral tüketim planı değildir. Seçili varlık için yalnız piyasa bağlamı sağlar."}</p>
          <dl>
            <div><dt>{en ? "Publisher" : "Yayın"}</dt><dd>EPİAŞ Transparency 2.0</dd></div>
            <div><dt>{en ? "Time zone" : "Zaman dilimi"}</dt><dd>Europe/Istanbul · UTC+3</dd></div>
            <div><dt>{en ? "Data day" : "Veri günü"}</dt><dd>{date}</dd></div>
            <div><dt>{en ? "Status" : "Durum"}</dt><dd><i /> {planning?.mode === "live" ? en ? "Live / official" : "Canlı / resmî" : en ? "Synthetic demonstration" : "Sentetik gösterim"}</dd></div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

function EntityExplorerLayout({
  title,
  description,
  icon,
  total,
  visible,
  query,
  onQuery,
  loading,
  error,
  source,
  list,
  children,
  locale,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  total: number;
  visible: number;
  query: string;
  onQuery: (value: string) => void;
  loading: boolean;
  error: string | null;
  source?: ExplorerResponse["source"];
  list: React.ReactNode;
  children: React.ReactNode;
  locale: Locale;
}) {
  const en = locale === "en";
  return (
    <section className="entity-explorer view-enter">
      <aside className="entity-index">
        <div className="entity-index-heading">
          <span className="entity-index-icon">{icon}</span>
          <div><span className="eyebrow">{en ? "ASSET DIRECTORY" : "VARLIK DİZİNİ"}</span><h2>{title}</h2></div>
        </div>
        <p>{description}</p>
        <label className="entity-search">
          <Search size={15} />
          <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder={en ? "Search name, short name, or EIC" : "Ad, kısa ad veya EIC ara"} />
          <span>{loading ? <LoaderCircle className="spin" size={14} /> : `${visible.toLocaleString(en ? "en-US" : "tr-TR")} / ${total.toLocaleString(en ? "en-US" : "tr-TR")}`}</span>
        </label>
        {!loading && !query.trim() && visible < total && (
          <p className="entity-limit-note">{en ? `Showing the first ${visible.toLocaleString("en-US")} records. Search the full catalog by name or EIC.` : `İlk ${visible.toLocaleString("tr-TR")} kayıt gösteriliyor. Tüm katalogda ad veya EIC ile arayın.`}</p>
        )}
        <div className="entity-list">{list}</div>
        <div className="entity-source">
          <Database size={14} />
          <span><b>{source?.provider ?? "EPİAŞ Transparency 2.0"}</b><small>{source ? formatTimestamp(source.fetchedAt, locale) : en ? "Waiting for source" : "Kaynak bekleniyor"}</small></span>
        </div>
      </aside>
      <div className="entity-detail">
        {error && <InlineWarning message={error} />}
        {children}
      </div>
    </section>
  );
}

function OrganizationDetail({ response, loading, locale }: { response: OrganizationExplorerResponse; loading: boolean; locale: Locale }) {
  const en = locale === "en";
  const revision = pairedDifference(response.points, "kudup", "kgup");
  const revisionCoverage = pairedCoverage(response.points, "kudup", "kgup");
  const participation = participationLabels(response.participation);
  return (
    <div className={`detail-canvas ${loading ? "is-loading" : ""}`}>
      <header className="detail-hero">
        <div className="detail-identity"><span><Building2 size={21} /></span><div><span className="eyebrow">{en ? "ORGANIZATION" : "ORGANİZASYON"} / {localizedOrganizationStatus(response.organization.status, locale)}</span><h2>{response.organization.name}</h2><p>{response.organization.eic || (en ? "EIC not published" : "EIC yayımlanmamış")} · ID {response.organization.id}</p></div></div>
        <div className="participation-row">
          {participation.length ? participation.map((item) => <span key={item.label} className={item.active ? "active" : ""}>{item.active && <Check size={11} />}{item.label}</span>) : <span>{en ? "No participation record" : "Katılım kaydı bulunamadı"}</span>}
        </div>
      </header>
      {response.warnings.map((warning, index) => <InlineWarning key={`${warning}-${index}`} message={localizedExplorerWarning(warning, locale)} subtle />)}
      <div className="detail-metrics">
        <MetricCard label={en ? "Linked UEVÇB" : "Bağlı UEVÇB"} value={response.uevcbs.length.toLocaleString(en ? "en-US" : "tr-TR")} meta={en ? "Official organization mapping" : "Resmî organizasyon eşlemesi"} />
        <MetricCard label={en ? "DAM matched buy" : "GÖP eşleşen alış"} value={formatMwh(sumMetric(response.points, "matchedBids"), locale)} meta={en ? `${coverage(response.points, "matchedBids")}/24 published hours` : `${coverage(response.points, "matchedBids")}/24 yayımlanan saat`} />
        <MetricCard label={en ? "DAM matched sell" : "GÖP eşleşen satış"} value={formatMwh(sumMetric(response.points, "matchedOffers"), locale)} meta={en ? `${coverage(response.points, "matchedOffers")}/24 published hours` : `${coverage(response.points, "matchedOffers")}/24 yayımlanan saat`} />
        <MetricCard label={en ? "Plan revision" : "Plan revizyonu"} value={formatSignedMwh(revision, locale)} meta={en ? `${revisionCoverage}/24 paired hours · KUDÜP − KGÜP` : `${revisionCoverage}/24 ortak saat · KUDÜP − KGÜP`} trend={revision} />
      </div>
      <div className="detail-panel">
        <div className="panel-title-row"><div><span className="eyebrow">{en ? "GENERATION PLANNING" : "ÜRETİM PLANLAMA"}</span><h3>KGÜP, KUDÜP {en ? "and" : "ve"} EAK</h3></div><span className="coverage-badge"><i /> {coverage(response.points, "kgup")}/24 {en ? "hours" : "saat"}</span></div>
        <PlanningChart points={response.points} series={ORGANIZATION_SERIES} label={en ? "Organization-level hourly generation plan" : "Organizasyon bazlı saatlik üretim planı"} loading={loading} locale={locale} />
      </div>
      <div className="detail-lower-grid">
        <DataTable points={response.points} columns={[{ key: "matchedBids", label: en ? "DAM buy" : "GÖP alış" }, { key: "matchedOffers", label: en ? "DAM sell" : "GÖP satış" }, { key: "kgup", label: "KGÜP" }, { key: "kudup", label: "KUDÜP" }]} locale={locale} />
        <aside className="unit-list-panel"><div><span className="eyebrow">{en ? "LINKED GENERATION UNITS" : "BAĞLI ÜRETİM BİRİMLERİ"}</span><b>{response.uevcbs.length} UEVÇB</b></div>{response.uevcbs.slice(0, 10).map((unit) => <div className="unit-row" key={unit.id}><span><Gauge size={14} /></span><div><b>{unit.name}</b><small>{unit.eic || `UEVÇB ${unit.id}`}</small></div></div>)}{response.uevcbs.length > 10 && <p>+ {response.uevcbs.length - 10} {en ? "more records" : "kayıt daha"}</p>}</aside>
      </div>
    </div>
  );
}

function PlantDetail({ response, loading, locale }: { response: PlantExplorerResponse; loading: boolean; locale: Locale }) {
  const en = locale === "en";
  return (
    <div className={`detail-canvas ${loading ? "is-loading" : ""}`}>
      <header className="detail-hero">
        <div className="detail-identity"><span><Factory size={21} /></span><div><span className="eyebrow">{en ? "POWER PLANT / ACTUAL" : "SANTRAL / GERÇEKLEŞEN"}</span><h2>{response.plant.name}</h2><p>{response.plant.eic || (en ? "EIC not published" : "EIC yayımlanmamış")} · ID {response.plant.id}</p></div></div>
        <span className="coverage-badge"><i /> {en ? "D+1 publication schedule" : "G+1 yayın takvimi"}</span>
      </header>
      {response.warnings.map((warning, index) => <InlineWarning key={`${warning}-${index}`} message={localizedExplorerWarning(warning, locale)} subtle />)}
      <div className="detail-metrics">
        <MetricCard label={en ? "Published generation" : "Yayımlanan üretim"} value={formatMwh(sumMetric(response.points, "realtimeGeneration"), locale)} meta={`${coverage(response.points, "realtimeGeneration")}/24 ${en ? "hours" : "saat"}`} />
        <MetricCard label={en ? "Hourly peak" : "Saatlik tepe"} value={formatMwh(maxMetric(response.points, "realtimeGeneration"), locale)} meta={en ? "Actual generation" : "Gerçek zamanlı üretim"} />
        <MetricCard label={en ? "Published UEVM" : "Yayımlanan UEVM"} value={formatMwh(sumMetric(response.points, "injectionQuantity"), locale)} meta={en ? `${coverage(response.points, "injectionQuantity")}/24 hours · settlement` : `${coverage(response.points, "injectionQuantity")}/24 saat · uzlaştırma`} />
        <MetricCard label={en ? "Data coverage" : "Veri kapsamı"} value={`${coverage(response.points, "realtimeGeneration")}/24`} meta={en ? "Missing hours are not zero" : "Eksik saatler sıfır değildir"} />
      </div>
      <div className="detail-panel">
        <div className="panel-title-row"><div><span className="eyebrow">{en ? "PLANT RECORD" : "SANTRAL KAYDI"}</span><h3>{en ? "Actual generation and UEVM" : "Gerçekleşen üretim ve UEVM"}</h3></div><span className="data-level-badge">{en ? "PLANT LEVEL" : "SANTRAL BAZI"}</span></div>
        <PlanningChart points={response.points} series={en ? PLANT_SERIES_EN : PLANT_SERIES} label={en ? "Plant-level hourly generation and settlement data" : "Santral bazlı saatlik üretim ve uzlaştırma verisi"} loading={loading} locale={locale} />
      </div>
      <DataTable points={response.points} columns={[{ key: "realtimeGeneration", label: en ? "Actual generation" : "Gerçekleşen üretim" }, { key: "injectionQuantity", label: "UEVM" }]} locale={locale} />
    </div>
  );
}

function DataTable({ points, columns, locale }: { points: ExplorerPoint[]; columns: Array<{ key: ExplorerMetricKey; label: string }>; locale: Locale }) {
  const en = locale === "en";
  return (
    <div className="data-table-shell">
      <div className="table-heading"><span className="eyebrow">{en ? "HOURLY RECORDS" : "SAATLİK KAYITLAR"}</span><b>{points.length} {en ? "rows" : "satır"}</b></div>
      <div className="data-table-scroll">
        <table className="data-table">
          <thead><tr><th>{en ? "Hour" : "Saat"}</th>{columns.map((column) => <th key={column.key}>{column.label}<small>MWh</small></th>)}</tr></thead>
          <tbody>{points.map((point, index) => <tr key={`${point.timestamp}-${index}`}><td><b>{point.hour}</b><small>{shortDate(point.timestamp, locale)}</small></td>{columns.map((column) => <td key={column.key}>{formatNumber(point[column.key], locale)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value, meta, trend }: { label: string; value: string; meta: string; trend?: number | null }) {
  return <div className="metric-card"><span>{label}</span><strong>{value}</strong><small>{typeof trend === "number" ? (trend > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />) : null}{meta}</small></div>;
}

function ExplorerEmpty({ icon, loading, title, detail, locale }: { icon: React.ReactNode; loading: boolean; title: string; detail: string; locale: Locale }) {
  const en = locale === "en";
  return <div className="explorer-empty"><span>{loading ? <LoaderCircle className="spin" size={25} /> : icon}</span><h2>{loading ? en ? "Preparing official data" : "Resmî veri hazırlanıyor" : title}</h2><p>{loading ? en ? "Reading EPİAŞ services in sequence; missing series remain visible as separate warnings." : "EPİAŞ servisleri sırayla okunuyor; eksik seriler ayrı uyarı olarak korunacak." : detail}</p></div>;
}

function InlineWarning({ message, subtle = false }: { message: string; subtle?: boolean }) {
  return <div className={`workspace-warning ${subtle ? "subtle" : ""}`} role={subtle ? "status" : "alert"}><CircleAlert size={14} /><span>{message}</span></div>;
}

function localizedOrganizationStatus(value: string | null | undefined, locale: Locale): string {
  if (locale === "tr") return value || "DURUM BİLİNMİYOR";
  if (!value) return "STATUS UNKNOWN";
  const normalized = value.trim().toLocaleLowerCase("tr-TR");
  if (normalized === "onaylı" || normalized === "onayli") return "VERIFIED";
  if (normalized === "aktif") return "ACTIVE";
  if (normalized === "pasif") return "INACTIVE";
  return value;
}

function localizedExplorerWarning(value: string, locale: Locale): string {
  if (locale === "tr") return value;
  const exact: Record<string, string> = {
    "EPİAŞ yayın gecikmeleri nedeniyle en yeni saatlerde değerler boş olabilir; boş değerler sıfıra çevrilmez.":
      "The newest hours may be blank because of EPİAŞ publication delays; missing values are not converted to zero.",
    "Santral veriş miktarı seçilen kapsam için kayıt döndürmedi.":
      "Plant injection quantity returned no records for the selected scope.",
    "Veriş miktarı yanıtında saatlik sayısal değer bulunamadı.":
      "No numeric hourly values were found in the injection-quantity response.",
  };
  if (exact[value]) return exact[value];
  const ignoredLoadPlan = /^Yük tahmin planı yanıtındaki seçili (\d{4}-\d{2}-\d{2}) günü dışındaki (\d+) kayıt yok sayıldı\.$/.exec(value);
  if (ignoredLoadPlan) {
    return `${ignoredLoadPlan[2]} load-plan records outside the selected ${ignoredLoadPlan[1]} day were ignored.`;
  }
  return value;
}

function participationLabels(value: unknown): Array<{ label: string; active: boolean }> {
  if (!value || typeof value !== "object") return [];
  const labels: Record<string, string> = { dayAhead: "GÖP", intraday: "GİP", futures: "VEP", yekG: "YEK-G", naturalGas: "Doğal gaz" };
  return Object.entries(value as Record<string, unknown>)
    .filter(([key, item]) => key in labels && typeof item === "boolean")
    .map(([key, item]) => ({ label: labels[key], active: item === true }));
}

function sumMetric(points: ExplorerPoint[] | undefined, key: ExplorerMetricKey): number | null {
  const values = points?.map((point) => point[key]).filter(isNumber) ?? [];
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function maxMetric(points: ExplorerPoint[] | undefined, key: ExplorerMetricKey): number | null {
  const values = points?.map((point) => point[key]).filter(isNumber) ?? [];
  return values.length ? Math.max(...values) : null;
}

function pairedDifference(
  points: ExplorerPoint[] | undefined,
  actualKey: ExplorerMetricKey,
  referenceKey: ExplorerMetricKey,
): number | null {
  const paired = points?.filter((point) => isNumber(point[actualKey]) && isNumber(point[referenceKey])) ?? [];
  return paired.length
    ? paired.reduce((sum, point) => sum + Number(point[actualKey]) - Number(point[referenceKey]), 0)
    : null;
}

function pairedCoverage(
  points: ExplorerPoint[] | undefined,
  leftKey: ExplorerMetricKey,
  rightKey: ExplorerMetricKey,
): number {
  return points?.filter((point) => isNumber(point[leftKey]) && isNumber(point[rightKey])).length ?? 0;
}

function coverage(points: ExplorerPoint[] | undefined, key: ExplorerMetricKey): number {
  return points?.filter((point) => isNumber(point[key])).length ?? 0;
}

function formatMwh(value: number | null, locale: Locale): string {
  return value === null ? "—" : `${formatNumber(value, locale)} MWh`;
}

function formatSignedMwh(value: number | null, locale: Locale): string {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${formatNumber(value, locale)} MWh`;
}

function formatNumber(value: unknown, locale: Locale): string {
  return isNumber(value) ? new Intl.NumberFormat(locale === "en" ? "en-US" : "tr-TR", { maximumFractionDigits: 1 }).format(value) : "—";
}

function formatTimestamp(value: string, locale: Locale): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(parsed);
}

function shortDate(value: string, locale: Locale): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", { day: "2-digit", month: "short", timeZone: "Europe/Istanbul" }).format(parsed);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isAbortError(value: unknown): boolean {
  return value instanceof Error && value.name === "AbortError";
}

function errorMessage(value: unknown): string {
  return value instanceof Error ? value.message : "Veri servisi isteği tamamlanamadı.";
}

async function readExplorerError(response: Response): Promise<string> {
  try {
    const payload = await response.json() as { error?: { message?: unknown } };
    if (typeof payload.error?.message === "string" && payload.error.message.trim()) return payload.error.message;
  } catch {
    // An intermediary may return a non-JSON response; the status remains useful.
  }
  return `Veri servisi ${response.status} yanıtını verdi.`;
}
