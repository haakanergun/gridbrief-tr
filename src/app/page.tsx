"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  Braces,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Copy,
  Database,
  ExternalLink,
  Factory,
  Gauge,
  LayoutDashboard,
  Network,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarketChart } from "@/components/MarketChart";
import { TransparencyWorkspace, type TransparencyView } from "@/components/TransparencyWorkspace";
import { useWebMcp } from "@/hooks/useWebMcp";
import { createDemoSnapshot } from "@/lib/demo";
import {
  createSyntheticExplorerResponse,
  normalizeExplorerSearch,
  type CatalogExplorerResponse,
  type ExplorerPoint,
  type ExplorerRequest,
  type ExplorerResponse,
} from "@/lib/explorer";
import {
  AnalysisScope,
  calculateStress,
  DEFAULT_SCOPE,
  draftBrief,
  formatNumber,
  formatTry,
  MarketSnapshot,
  PositionSide,
  StressResult,
} from "@/lib/market";
import {
  type AnalysisScopeInput,
  type ComparePlanActualInput,
  type DraftShiftBriefInput,
  type FindMarketEntitiesInput,
  type JsonValue,
  type MarketSnapshotInput,
  type StressTestPositionInput,
  type WebMcpActivityEvent,
  type WebMcpExecutionContext,
  type WebMcpToolName,
} from "@/lib/webmcp";

type ActivityItem = {
  id: number;
  label: string;
  detail: string;
  status: "done" | "active" | "waiting";
};

type AppView = "market" | TransparencyView;

const APP_VIEWS: Array<{
  id: AppView;
  label: string;
  kicker: string;
  description: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "market", label: "Piyasa özeti", kicker: "OPERASYON", description: "Fiyat, denge ve risk sinyalleri", icon: LayoutDashboard },
  { id: "organizations", label: "Organizasyonlar", kicker: "VARLIK", description: "Katılımcı, GÖP ve UEVÇB", icon: Building2 },
  { id: "plants", label: "Santraller", kicker: "VARLIK", description: "Üretim ve uzlaştırma kayıtları", icon: Factory },
  { id: "planning", label: "Planlama", kicker: "PLAN / GERÇEK", description: "KGÜP, KUDÜP ve yük tahmini", icon: BarChart3 },
];

const STARTING_ACTIVITY: ActivityItem[] = [
  { id: 1, label: "Kapsam alındı", detail: "04 Eyl · 17:00–22:00 · 50 MWh kısa", status: "done" },
  { id: 2, label: "Piyasa görünümü", detail: "Üç fiyat katmanı UTC+3’e hizalandı", status: "done" },
  { id: 3, label: "Pozisyon stresi", detail: "Olumsuz makas senaryosu hesaplandı", status: "done" },
  { id: 4, label: "Vardiya notu", detail: "Kaynaklı taslak hazırlandı", status: "done" },
  { id: 5, label: "İnsan kontrolü", detail: "Operatör onayı bekleniyor", status: "waiting" },
];

const TOOL_ACTIVITY: Record<WebMcpToolName, Pick<ActivityItem, "id" | "label">> = {
  set_analysis_scope: { id: 1, label: "Kapsam alındı" },
  get_market_snapshot: { id: 2, label: "Piyasa görünümü" },
  find_market_entities: { id: 6, label: "Varlık araması" },
  compare_plan_actual: { id: 7, label: "Plan / gerçekleşen" },
  stress_test_position: { id: 3, label: "Pozisyon stresi" },
  draft_shift_brief: { id: 4, label: "Vardiya notu" },
};

const ALL_BRIEF_SECTIONS = ["market", "position", "risks", "actions"] as const;
const STATIC_DEMO_MODE = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";

export default function Home() {
  const [activeView, setActiveView] = useState<AppView>("market");
  const [explorerDate, setExplorerDate] = useState(DEFAULT_SCOPE.date);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [agentExplorer, setAgentExplorer] = useState<{
    revision: number;
    result: ExplorerResponse;
    query?: string;
    planningLayer?: "production" | "consumption";
  } | null>(null);
  const [scope, setScope] = useState<AnalysisScope>(DEFAULT_SCOPE);
  const [snapshot, setSnapshot] = useState<MarketSnapshot>(() => createDemoSnapshot(DEFAULT_SCOPE));
  const [stress, setStress] = useState<StressResult>(() =>
    calculateStress(createDemoSnapshot(DEFAULT_SCOPE), DEFAULT_SCOPE.positionMwh, DEFAULT_SCOPE.side),
  );
  const [brief, setBrief] = useState<string[]>(() =>
    draftBrief(
      createDemoSnapshot(DEFAULT_SCOPE),
      calculateStress(createDemoSnapshot(DEFAULT_SCOPE), DEFAULT_SCOPE.positionMwh, DEFAULT_SCOPE.side),
    ),
  );
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>(STARTING_ACTIVITY);
  const [traceLabel, setTraceLabel] = useState("DEMO TRACE");
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const analysisRequestRef = useRef(0);
  const latestStateRef = useRef({ scope, snapshot, stress });
  // Imperative WebMCP calls can run between React commits, so this mirror must be synchronous.
  // eslint-disable-next-line react-hooks/refs
  latestStateRef.current = { scope, snapshot, stress };

  const selectedPoints = useMemo(
    () => snapshot.points.filter((point) => {
      const hour = Number(point.hour.slice(0, 2));
      return hour >= scope.startHour && hour <= scope.endHour;
    }),
    [scope.endHour, scope.startHour, snapshot.points],
  );

  const peak = useMemo(() => {
    let best: MarketSnapshot["points"][number] | undefined;
    for (const point of selectedPoints) {
      if (!isFiniteNumber(point.idm)) continue;
      if (!best || !isFiniteNumber(best.idm) || point.idm > best.idm) best = point;
    }
    return best;
  }, [selectedPoints]);
  const averagePtf = useMemo(
    () => averageFinite(selectedPoints.map((point) => point.ptf)),
    [selectedPoints],
  );
  const shortHours = selectedPoints.filter((point) => point.systemDirection === "SHORT").length;
  const currentView = APP_VIEWS.find((item) => item.id === activeView) ?? APP_VIEWS[0];
  const visibleAgentExplorer = agentExplorer
    && agentExplorer.result.scope.date === explorerDate
    && (
      (agentExplorer.result.view === "catalog" && (activeView === "organizations" || activeView === "plants"))
      || agentExplorer.result.view === activeView
    )
    ? agentExplorer
    : null;

  const runAnalysis = useCallback(async (nextScope: AnalysisScope, signal?: AbortSignal) => {
    const requestId = ++analysisRequestRef.current;
    setLoading(true);
    setApproved(false);
    setGatewayError(null);
    setActivity([
      { id: 1, label: "Kapsam alındı", detail: `${nextScope.date} · ${nextScope.startHour}:00–${nextScope.endHour}:00 · ${nextScope.positionMwh} MWh ${nextScope.side === "short" ? "kısa" : "uzun"}`, status: "done" },
      { id: 2, label: "Piyasa görünümü", detail: "Saatlik piyasa serileri hizalanıyor", status: "active" },
      { id: 3, label: "Pozisyon stresi", detail: "Piyasa kanıtı bekleniyor", status: "waiting" },
      { id: 4, label: "Vardiya notu", detail: "Stres sonucu bekleniyor", status: "waiting" },
      { id: 5, label: "İnsan kontrolü", detail: "Operatör onayı bekleniyor", status: "waiting" },
    ]);

    try {
      let nextSnapshot: MarketSnapshot;
      if (STATIC_DEMO_MODE) {
        signal?.throwIfAborted();
        nextSnapshot = createDemoSnapshot(nextScope);
      } else {
        const response = await fetch("/api/market", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextScope),
          signal,
        });
        if (!response.ok) throw new Error(await readGatewayError(response));
        nextSnapshot = (await response.json()) as MarketSnapshot;
      }
      signal?.throwIfAborted();

      const nextStress = calculateStress(nextSnapshot, nextScope.positionMwh, nextScope.side);
      if (requestId === analysisRequestRef.current) {
        latestStateRef.current = { scope: nextScope, snapshot: nextSnapshot, stress: nextStress };
        setScope(nextScope);
        setSnapshot(nextSnapshot);
        setStress(nextStress);
        setBrief(draftBrief(nextSnapshot, nextStress));
        setActivity([
          { id: 1, label: "Kapsam alındı", detail: `${nextScope.date} · ${nextScope.startHour}:00–${nextScope.endHour}:00 · ${nextScope.positionMwh} MWh ${nextScope.side === "short" ? "kısa" : "uzun"}`, status: "done" },
          { id: 2, label: "Piyasa görünümü", detail: `${nextSnapshot.points.length} saatlik gözlem · ${nextSnapshot.mode === "live" ? "canlı" : "sentetik"}`, status: "done" },
          { id: 3, label: "Pozisyon stresi", detail: `${formatMaybeTry(nextStress.estimatedExposureTry)} gösterge niteliğinde`, status: "done" },
          { id: 4, label: "Vardiya notu", detail: "Taslak güncel kanıtlarla yenilendi", status: "done" },
          { id: 5, label: "İnsan kontrolü", detail: "Operatör onayı bekleniyor", status: "waiting" },
        ]);
      }
      return { snapshot: nextSnapshot, stress: nextStress };
    } catch (error) {
      if (signal?.aborted || isAbortException(error)) throw error;

      const message = error instanceof Error ? error.message : "The market gateway request failed.";
      if (requestId === analysisRequestRef.current) {
        setGatewayError(message);
        setActivity([
          { id: 1, label: "Kapsam alındı", detail: `${nextScope.date} · ${nextScope.startHour}:00–${nextScope.endHour}:00 · ${nextScope.positionMwh} MWh ${nextScope.side === "short" ? "kısa" : "uzun"}`, status: "done" },
          { id: 2, label: "Piyasa görünümü", detail: "Servis yanıtlamadı; son geçerli görünüm korundu", status: "waiting" },
          { id: 3, label: "Pozisyon stresi", detail: "Eksik kanıtla yeniden hesaplanmadı", status: "waiting" },
          { id: 4, label: "Vardiya notu", detail: "Mevcut taslak korundu", status: "waiting" },
          { id: 5, label: "İnsan kontrolü", detail: "Onaydan önce kaynak uyarısını giderin", status: "waiting" },
        ]);
      }
      throw error instanceof Error ? error : new Error(message);
    } finally {
      if (requestId === analysisRequestRef.current) setLoading(false);
    }
  }, []);

  const requestExplorer = useCallback(async (request: ExplorerRequest, signal?: AbortSignal): Promise<ExplorerResponse> => {
    signal?.throwIfAborted();
    if (STATIC_DEMO_MODE) return createSyntheticExplorerResponse(request);

    const response = await fetch("/api/explorer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
    if (!response.ok) throw new Error(await readGatewayError(response));
    return await response.json() as ExplorerResponse;
  }, []);

  useEffect(() => {
    if (STATIC_DEMO_MODE) return;

    const controller = new AbortController();
    async function initializeAuthorizedLiveMode() {
      const response = await fetch("/api/health", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) return;

      const health = await response.json() as { mode?: unknown };
      if (health.mode !== "live") return;
      if (analysisRequestRef.current !== 0) return;

      const liveDate = previousIstanbulDate();
      setExplorerDate(liveDate);
      await runAnalysis({ ...DEFAULT_SCOPE, date: liveDate }, controller.signal);
    }

    void initializeAuthorizedLiveMode().catch((error: unknown) => {
      if (!isAbortException(error)) {
        // runAnalysis already preserves the last valid snapshot and displays its public error.
      }
    });

    return () => controller.abort();
  }, [runAnalysis]);

  const handleWebMcpActivity = useCallback((event: WebMcpActivityEvent) => {
    setTraceLabel("WEBMCP TRACE");
    const tool = TOOL_ACTIVITY[event.toolName];
    const status: ActivityItem["status"] = event.phase === "started" ? "active" : event.phase === "succeeded" ? "done" : "waiting";
    const detail = event.phase === "started"
      ? "Tarayıcı ajanı bu aracı çağırdı"
      : event.phase === "succeeded"
        ? `${formatTimestamp(event.occurredAt)} itibarıyla tamamlandı`
        : event.phase === "cancelled"
          ? "Ajan tarafından iptal edildi"
          : event.error?.message ?? "Araç çalıştırılamadı";

    setActivity((items) => {
      const updated = items.map((item) => item.id === tool.id ? { ...item, label: tool.label, detail, status } : item);
      return updated.some((item) => item.id === tool.id)
        ? updated
        : [...updated, { ...tool, detail, status }];
    });
  }, []);

  const setAnalysisScopeTool = useCallback((input: AnalysisScopeInput, context: WebMcpExecutionContext): JsonValue => {
    context.signal.throwIfAborted();
    const latest = latestStateRef.current;
    const nextScope = fromExclusiveToolWindow(input, latest.scope);
    latestStateRef.current = { ...latest, scope: nextScope };
    setScope(nextScope);
    setApproved(false);

    return toJsonValue({
      status: "scope_updated",
      requestedWindow: { marketDate: input.marketDate, startHour: input.startHour, endHour: input.endHour, endHourConvention: "exclusive" },
      visibleScope: { ...nextScope, endHourConvention: "inclusive" },
      source: sourceAttribution(latest.snapshot, "The scope changed; this source describes the last valid snapshot still on screen."),
      safety: "Scope update only. No order was created, recommended, or submitted.",
    });
  }, []);

  const getMarketSnapshotTool = useCallback(async (input: MarketSnapshotInput, context: WebMcpExecutionContext): Promise<JsonValue> => {
    context.signal.throwIfAborted();
    const latestScope = latestStateRef.current.scope;
    const startHour = input.startHour ?? latestScope.startHour;
    const exclusiveEndHour = input.endHour ?? latestScope.endHour + 1;
    const nextScope = fromExclusiveToolWindow({
      marketDate: input.marketDate ?? latestScope.date,
      startHour,
      endHour: exclusiveEndHour,
    }, latestScope);
    const result = await runAnalysis(nextScope, context.signal);
    const metrics = input.metrics ?? ["ptf", "smf", "idm", "consumption", "generation", "system_direction"];

    return toJsonValue({
      status: "snapshot_ready",
      scope: { marketDate: nextScope.date, startHour, endHour: exclusiveEndHour, endHourConvention: "exclusive" },
      requestedMetrics: metrics,
      observations: projectMarketPoints(result.snapshot, input.metrics, startHour, exclusiveEndHour),
      rankedSignals: result.snapshot.signals,
      source: sourceAttribution(result.snapshot),
      warnings: result.snapshot.warnings ?? [],
      safety: "Read-only market evidence. Publication delays apply; this is not an executable quote.",
    });
  }, [runAnalysis]);

  const findMarketEntitiesTool = useCallback(async (
    input: FindMarketEntitiesInput,
    context: WebMcpExecutionContext,
  ): Promise<JsonValue> => {
    context.signal.throwIfAborted();
    const query = typeof input.query === "string" ? input.query.trim() : "";
    if (query.length < 2 || query.length > 120) {
      throw new Error("query must contain between 2 and 120 characters.");
    }

    const entityType = input.entityType ?? "all";
    if (!(["organization", "plant", "all"] as const).includes(entityType)) {
      throw new Error("entityType must be organization, plant, or all.");
    }
    const limit = input.limit ?? 10;
    if (!Number.isInteger(limit) || limit < 1 || limit > 25) {
      throw new Error("limit must be an integer from 1 through 25.");
    }
    const marketDate = input.marketDate ?? (activeView === "market" ? latestStateRef.current.scope.date : explorerDate);
    if (!isIsoCalendarDate(marketDate)) {
      throw new Error("marketDate must be a real calendar date in YYYY-MM-DD format.");
    }

    const response = await requestExplorer({ view: "catalog", date: marketDate }, context.signal);
    if (response.view !== "catalog") throw new Error("The explorer gateway returned an unexpected response.");

    const normalizedQuery = normalizeExplorerSearch(query);
    const candidates = rankCatalogMatches(response, normalizedQuery, entityType).slice(0, limit);
    const matches = candidates.map((candidate) => ({
      entityType: candidate.entityType,
      id: candidate.id,
      name: candidate.name,
      shortName: candidate.shortName,
      eic: candidate.eic,
      status: candidate.status,
    }));
    const firstMatch = matches[0];
    const targetView: TransparencyView = entityType === "organization"
      ? "organizations"
      : entityType === "plant"
        ? "plants"
        : firstMatch?.entityType === "plant"
          ? "plants"
          : "organizations";

    setExplorerDate(marketDate);
    setActiveView(targetView);
    setAgentExplorer({ revision: Date.now(), result: response, query });

    return toJsonValue({
      status: "matches_displayed",
      query,
      requestedEntityType: entityType,
      matchCount: matches.length,
      matches,
      source: explorerSourceAttribution(
        response,
        response.mode === "live"
          ? "Public EPİAŞ Transparency organization and plant catalog matches."
          : "Explicitly fictional organization and plant matches generated for the static demo.",
      ),
      warnings: response.warnings,
      safety: response.mode === "live"
        ? "Read-only public Transparency catalog search. A match does not prove that an entity belongs to the signed-in user's portfolio."
        : "Synthetic demo search only. Every returned entity is fictional and must not be treated as an EPİAŞ record or private portfolio holding.",
    });
  }, [activeView, explorerDate, requestExplorer]);

  const comparePlanActualTool = useCallback(async (
    input: ComparePlanActualInput,
    context: WebMcpExecutionContext,
  ): Promise<JsonValue> => {
    context.signal.throwIfAborted();
    const marketDate = input.marketDate ?? (activeView === "market" ? latestStateRef.current.scope.date : explorerDate);
    if (!isIsoCalendarDate(marketDate)) {
      throw new Error("marketDate must be a real calendar date in YYYY-MM-DD format.");
    }
    if (input.organizationId !== undefined && !isPositiveSafeInteger(input.organizationId)) {
      throw new Error("organizationId must be a positive safe integer.");
    }
    if (input.uevcbId !== undefined && !isPositiveSafeInteger(input.uevcbId)) {
      throw new Error("uevcbId must be a positive safe integer.");
    }
    if (input.uevcbId !== undefined && input.organizationId === undefined) {
      throw new Error("organizationId is required when uevcbId is supplied.");
    }
    const layer = input.layer ?? "both";
    if (!(["production", "consumption", "both"] as const).includes(layer)) {
      throw new Error("layer must be production, consumption, or both.");
    }

    const response = await requestExplorer({
      view: "planning",
      date: marketDate,
      ...(input.organizationId === undefined ? {} : { organizationId: input.organizationId }),
      ...(input.uevcbId === undefined ? {} : { uevcbId: input.uevcbId }),
      region: "TR1",
    }, context.signal);
    if (response.view !== "planning") throw new Error("The explorer gateway returned an unexpected response.");

    const includeProduction = layer === "production" || layer === "both";
    const includeConsumption = layer === "consumption" || layer === "both";
    const observations = response.points.map((point) => ({
      timestamp: point.timestamp,
      hour: point.hour,
      ...(includeProduction ? {
        kgup: point.kgup,
        kudup: point.kudup,
        eak: point.eak,
        systemRealtimeGeneration: point.realtimeGeneration,
      } : {}),
      ...(includeConsumption ? {
        systemLoadPlan: point.loadPlan,
        systemRealtimeConsumption: point.realtimeConsumption,
      } : {}),
    }));
    const kgupSummary = summarizeExplorerMetric(response.points, "kgup");
    const realtimeGenerationSummary = summarizeExplorerMetric(response.points, "realtimeGeneration");
    const loadPlanSummary = summarizeExplorerMetric(response.points, "loadPlan");
    const realtimeConsumptionSummary = summarizeExplorerMetric(response.points, "realtimeConsumption");
    const visibleLayer = layer === "consumption" ? "consumption" : "production";

    setExplorerDate(marketDate);
    setActiveView("planning");
    setAgentExplorer({
      revision: Date.now(),
      result: response,
      planningLayer: visibleLayer,
    });

    return toJsonValue({
      status: "comparison_loaded",
      requestedLayer: layer,
      visibleLayer,
      ...(layer === "both" ? { additionalLoadedLayer: "consumption", displayNote: "Both groups are loaded; the production tab is visible first and the system-consumption tab is one click away." } : {}),
      scope: response.scope,
      organization: response.organization,
      uevcb: response.uevcb,
      summary: {
        ...(includeProduction ? {
          productionPlan: {
            kgup: kgupSummary,
            kudup: summarizeExplorerMetric(response.points, "kudup"),
            eak: summarizeExplorerMetric(response.points, "eak"),
            systemRealtimeGeneration: realtimeGenerationSummary,
            planActualComparison: input.organizationId === undefined
              ? summarizeExplorerPair(response.points, "realtimeGeneration", "kgup")
              : {
                  fullDayDeviationMwh: null,
                  reason: "Not comparable: the production plan is organization/UEVÇB-scoped while actual generation is Turkey-system scoped.",
                },
          },
        } : {}),
        ...(includeConsumption ? {
          systemConsumption: {
            loadPlan: loadPlanSummary,
            realtimeConsumption: realtimeConsumptionSummary,
            planActualComparison: summarizeExplorerPair(response.points, "realtimeConsumption", "loadPlan"),
          },
        } : {}),
      },
      observations,
      dataLevels: {
        productionPlan: input.uevcbId !== undefined ? "UEVÇB" : input.organizationId !== undefined ? "organization" : "Turkey region TR1",
        realtimeGeneration: "Turkey system",
        consumptionPlanAndActual: "Turkey system",
      },
      source: explorerSourceAttribution(response, "Organization and UEVÇB filters apply only to KGÜP, KUDÜP, and EAK."),
      warnings: response.warnings,
      safety: response.mode === "live"
        ? "Read-only EPİAŞ planning evidence. Missing values remain null; system actuals must not be presented as organization-level actuals."
        : "Synthetic demo evidence only. Values are fictional; missing values remain null and system actuals must not be presented as organization-level actuals.",
    });
  }, [activeView, explorerDate, requestExplorer]);

  const stressTestPositionTool = useCallback((input: StressTestPositionInput, context: WebMcpExecutionContext): JsonValue => {
    context.signal.throwIfAborted();
    const latest = latestStateRef.current;
    const latestSelectedPoints = selectWindowPoints(latest.snapshot, latest.scope);
    const snapshotReference = averageFinite(latestSelectedPoints.map((point) => point.ptf));
    const referencePrice = isFiniteNumber(input.referencePriceTryMwh)
      ? input.referencePriceTryMwh
      : snapshotReference;

    const nextScope = { ...latest.scope, positionMwh: input.volumeMwh, side: input.direction };
    latestStateRef.current = { ...latest, scope: nextScope };
    setScope(nextScope);
    setApproved(false);

    if (!isFiniteNumber(referencePrice)) {
      return toJsonValue({
        status: "unavailable",
        scenario: { direction: input.direction, volumeMwh: input.volumeMwh, priceShockPercent: input.priceShockPercent },
        source: sourceAttribution(latest.snapshot),
        warnings: ["Görünür pencerede fiyatlanmış PTF gözlemi yok. Referans fiyat girin veya piyasa görünümünü yenileyin."],
        safety: "No order was created, recommended, or submitted.",
      });
    }

    const adversePrice = referencePrice * (1 + input.priceShockPercent / 100);
    const adverseSpread = input.direction === "short"
      ? adversePrice - referencePrice
      : referencePrice - adversePrice;
    const nextStress: StressResult = {
      side: input.direction,
      positionMwh: input.volumeMwh,
      referencePrice: roundOne(referencePrice),
      adversePrice: roundOne(adversePrice),
      estimatedExposureTry: Math.round(Math.max(0, adverseSpread) * input.volumeMwh),
      contextPeakHour: findContextPeakHour(latestSelectedPoints, input.direction),
      calculation: `${input.volumeMwh} MWh × ${roundOne(Math.max(0, adverseSpread))} TL/MWh olumsuz hareket (%${input.priceShockPercent} senaryosu)`,
      disclaimer: "Gösterge niteliğinde varsayım analizidir; tahmin, emir önerisi veya uzlaştırma hesabı değildir.",
    };
    latestStateRef.current = { scope: nextScope, snapshot: latest.snapshot, stress: nextStress };
    setStress(nextStress);
    setBrief(draftBrief(latest.snapshot, nextStress));

    return toJsonValue({
      status: "scenario_displayed",
      scenarioLabel: input.scenarioLabel ?? "Agent what-if",
      result: nextStress,
      source: sourceAttribution(latest.snapshot),
      safety: "Illustrative what-if only. No order was created, recommended, or submitted.",
    });
  }, []);

  const draftShiftBriefTool = useCallback((input: DraftShiftBriefInput, context: WebMcpExecutionContext): JsonValue => {
    context.signal.throwIfAborted();
    const latest = latestStateRef.current;
    const language = input.language ?? "en";
    const audience = input.audience ?? "trader";
    const sections = input.includeSections?.length ? input.includeSections : [...ALL_BRIEF_SECTIONS];
    const sectionText = buildBriefSections({ language, audience, sections, notes: input.notes }, latest.snapshot, latest.stress);
    const nextBrief = sectionText.map((section) => section.text);
    setBrief(nextBrief);
    setApproved(false);

    return toJsonValue({
      status: "draft_displayed",
      language,
      audience,
      sections: sectionText,
      source: sourceAttribution(latest.snapshot),
      warnings: latest.snapshot.warnings ?? [],
      safety: "Draft only. Human review is required; nothing was sent, published, or traded.",
    });
  }, []);

  const webMcp = useWebMcp({
    setAnalysisScope: setAnalysisScopeTool,
    getMarketSnapshot: getMarketSnapshotTool,
    findMarketEntities: findMarketEntitiesTool,
    comparePlanActual: comparePlanActualTool,
    stressTestPosition: stressTestPositionTool,
    draftShiftBrief: draftShiftBriefTool,
    onActivity: handleWebMcpActivity,
  });

  function submitScope(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTraceLabel("LOCAL RUN");
    void runAnalysis(scope).catch(() => undefined);
  }

  async function copyAgentPrompt() {
    const prompt = `Bu sayfanın WebMCP araçlarını kullanarak ${scope.date} günü ${scope.startHour}:00–${scope.endHour}:59 teslimat saatlerindeki ${scope.positionMwh} MWh ${scope.side === "short" ? "kısa" : "uzun"} pozisyonu incele (araç çağrısında exclusive endHour ${scope.endHour + 1} kullan). Kanıtları göster, pozisyonu %20 yukarı fiyat şokuyla stres testine sok ve operasyon ekibi için Türkçe vardiya notu hazırla. İşlem yapma veya emir önerme.`;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function approveBrief() {
    setApproved(true);
    setActivity((items) => items.map((item) => item.id === 5 ? { ...item, detail: "Yerel olarak incelendi ve onaylandı", status: "done" } : item));
  }

  function refreshActiveView() {
    if (activeView === "market") {
      setTraceLabel("LOCAL RUN");
      void runAnalysis(scope).catch(() => undefined);
      return;
    }
    setAgentExplorer(null);
    setRefreshNonce((value) => value + 1);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#workspace" aria-label="GridBrief TR home">
          <span className="brand-mark"><Zap size={15} strokeWidth={2.8} /></span>
          <span>GRIDBRIEF <em>TR</em><small>ŞEFFAFLIK OS</small></span>
        </a>
        <div className="topbar-product">
          <Network size={15} />
          <span>Türkiye Elektrik Piyasası</span>
          <ChevronRight size={13} />
          <b>{currentView.label}</b>
        </div>
        <div className="topbar-context">
          <span className="market-clock"><Clock3 size={14} /> TR piyasa saati <b>UTC+3</b></span>
          <span className={`mode-indicator ${snapshot.mode}`}>
            <i /> {snapshot.mode === "live" ? "EPİAŞ LIVE" : "SYNTHETIC REPLAY"}
          </span>
          <span className={`mcp-indicator ${webMcp.registered ? "supported" : ""}`} title={webMcp.error ?? undefined}>
            <Braces size={14} /> WebMCP {webMcp.registered ? "ready" : webMcp.status}
          </span>
        </div>
      </header>

      <div className="platform-frame">
        <aside className="product-nav" aria-label="Ana çalışma alanları">
          <div className="nav-context">
            <span className="nav-context-mark"><Zap size={16} /></span>
            <div><small>ÇALIŞMA ALANI</small><b>Elektrik</b></div>
          </div>
          <nav>
            {APP_VIEWS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={activeView === item.id ? "active" : ""}
                  onClick={() => setActiveView(item.id)}
                  aria-current={activeView === item.id ? "page" : undefined}
                  aria-label={item.label}
                  title={item.label}
                >
                  <span><Icon size={17} /></span>
                  <span><b>{item.label}</b><small>{item.description}</small></span>
                  {activeView === item.id && <i />}
                </button>
              );
            })}
          </nav>
          <div className="nav-system-card">
            <span className="eyebrow">VERİ OMURGASI</span>
            <div><i className={snapshot.mode === "live" ? "is-live" : ""} /><span><b>EPİAŞ Şeffaflık 2.0</b><small>{snapshot.mode === "live" ? "Oturumla erişilen kamu verisi" : "Sentetik gösterim verisi"}</small></span></div>
            <div><Braces size={14} /><span><b>{webMcp.registered ? "WebMCP hazır" : "WebMCP bekleniyor"}</b><small>{webMcp.tools.length} tarayıcı aracı</small></span></div>
          </div>
          <a className="nav-doc-link" href="https://seffaflik.epias.com.tr/electricity-service/technical/tr/index.html" target="_blank" rel="noreferrer">
            <Database size={14} /> Teknik kaynak <ExternalLink size={12} />
          </a>
        </aside>

        <section className="view-root" id="workspace">
          <header className="view-header">
            <div>
              <span className="view-kicker">{currentView.kicker} / ELEKTRİK</span>
              <h1>{currentView.label}</h1>
              <p>{currentView.description}</p>
            </div>
            <div className="global-controls">
              <label className="global-date-control">
                <CalendarDays size={15} />
                <span><small>PİYASA GÜNÜ</small><input
                  type="date"
                  value={activeView === "market" ? scope.date : explorerDate}
                  onChange={(event) => {
                    if (activeView === "market") {
                      setScope({ ...scope, date: event.target.value });
                    } else {
                      setAgentExplorer(null);
                      setExplorerDate(event.target.value);
                    }
                  }}
                /></span>
              </label>
              <button className="refresh-view-button" type="button" onClick={refreshActiveView} disabled={loading && activeView === "market"}>
                <RefreshCw className={loading && activeView === "market" ? "spin" : ""} size={15} />
                <span>Veriyi yenile</span>
              </button>
            </div>
          </header>

          {activeView === "market" ? (
          <section className="workspace market-workspace">
        <aside className="scope-rail">
          <div className="rail-heading">
            <span className="eyebrow">ANALİZ KAPSAMI</span>
            <button className="icon-button" type="button" title="Kapsamı sıfırla" onClick={() => {
              setTraceLabel("LOCAL RUN");
              void runAnalysis(DEFAULT_SCOPE).catch(() => undefined);
            }}>
              <RefreshCw size={15} />
            </button>
          </div>

          <form className="scope-form" onSubmit={submitScope}>
            <label>
              Teslimat günü
              <input type="date" value={scope.date} onChange={(event) => setScope({ ...scope, date: event.target.value })} />
            </label>
            <div className="form-split">
              <label>
                Başlangıç
                <select value={scope.startHour} onChange={(event) => setScope({ ...scope, startHour: Number(event.target.value) })}>
                  {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}
                </select>
              </label>
              <label>
                Bitiş (dahil)
                <select value={scope.endHour} onChange={(event) => setScope({ ...scope, endHour: Number(event.target.value) })}>
                  {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}
                </select>
              </label>
            </div>
            <label>
              Açık pozisyon
              <div className="unit-input">
                <input
                  type="number"
                  min="0"
                  max="100000"
                  value={scope.positionMwh}
                  onChange={(event) => setScope({ ...scope, positionMwh: Number(event.target.value) })}
                />
                <span>MWh</span>
              </div>
            </label>
            <fieldset>
              <legend>Pozisyon yönü</legend>
              <div className="side-toggle">
                {(["short", "long"] as PositionSide[]).map((side) => (
                  <button
                    type="button"
                    key={side}
                    className={scope.side === side ? "active" : ""}
                    onClick={() => setScope({ ...scope, side })}
                  >
                    {side === "short" ? "kısa" : "uzun"}
                  </button>
                ))}
              </div>
            </fieldset>
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? <RefreshCw className="spin" size={16} /> : <Sparkles size={16} />}
              {loading ? "Kanıtlar hizalanıyor" : "Risk notunu çalıştır"}
            </button>
          </form>

          <div className="agent-prompt">
            <span className="eyebrow">AJANINIZLA DENEYİN</span>
            <p>Tarayıcı ajanından bu teslimat penceresini incelemesini isteyin.</p>
            <button type="button" onClick={() => void copyAgentPrompt()}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "İstem kopyalandı" : "Ajan istemini kopyala"}
            </button>
          </div>

          <a className="source-link" href="https://seffaflik.epias.com.tr/electricity-service/technical/tr/index.html" target="_blank" rel="noreferrer">
            EPİAŞ teknik dokümantasyonu <ExternalLink size={13} />
          </a>
        </aside>

        <section className="market-stage">
          <div className="stage-heading">
            <div>
              <span className="eyebrow">TESLİMAT RİSKİ · {scope.date}</span>
              <h1>Akşam pozisyonu<br /><span>baskı altında.</span></h1>
            </div>
            <div className="headline-metric">
              <span>Gösterge niteliğinde olumsuz etki</span>
              <strong>{formatMaybeTry(stress.estimatedExposureTry)}</strong>
              <small><ArrowDownRight size={14} /> GİP bağlam zirvesi {stress.contextPeakHour}</small>
            </div>
          </div>

          {gatewayError && (
            <div className="gateway-error" role="alert">
              <CircleAlert size={15} />
              <span><b>Piyasa servisi uyarısı:</b> {gatewayError} Son geçerli görünüm ekranda korunuyor.</span>
            </div>
          )}

          {webMcp.error && (
            <div className="gateway-error" role="status">
              <Braces size={15} />
              <span><b>WebMCP kayıt uyarısı:</b> {webMcp.error}</span>
            </div>
          )}

          {snapshot.mode === "synthetic" && (
            <div className="replay-banner">
              <CircleAlert size={15} />
              <span><b>Gösterim modu:</b> kurgusal referans değerler iş akışını gösterir; EPİAŞ verisi veya gelecek gerçekleşeni değildir.</span>
            </div>
          )}

          {(snapshot.warnings?.length ?? 0) > 0 && (
            <div className="warning-stack" aria-label="Source warnings">
              {snapshot.warnings?.slice(0, 4).map((warning, index) => (
                <div className="warning-row" key={`${index}-${warning}`}>
                  <CircleAlert size={14} />
                  <span><b>Kaynak uyarısı:</b> {warning}</span>
                </div>
              ))}
            </div>
          )}

          <MarketChart points={snapshot.points} startHour={scope.startHour} endHour={scope.endHour} loading={loading} />

          <div className="market-readout">
            <div>
              <span>Pencere ort. PTF</span>
              <strong>{formatMaybeNumber(averagePtf)} <small>TRY/MWh</small></strong>
            </div>
            <div>
              <span>Gün içi tepe</span>
              <strong>{formatMaybeNumber(peak?.idm)} <small>{peak?.hour ?? "—"}</small></strong>
            </div>
            <div>
              <span>Sistemin açık olduğu saat</span>
              <strong>{shortHours}<small> / {selectedPoints.length || 0}</small></strong>
            </div>
            <div>
              <span>Kanıt tazeliği</span>
              <strong className="freshness"><i /> Kontrol et</strong>
            </div>
          </div>

          <section className="signals-section" aria-labelledby="signals-title">
            <div className="section-heading-row">
              <div>
                <span className="eyebrow">SIRALANMIŞ KANIT</span>
                <h2 id="signals-title">Risk görünümünü ne değiştirdi?</h2>
              </div>
              <span className="row-note"><ShieldCheck size={15} /> Kaynak ve zaman damgası bağlı</span>
            </div>
            <div className="signals-list">
              {snapshot.signals.map((signal, index) => (
                <article className="signal-row" key={signal.id} style={{ "--delay": `${index * 80}ms` } as React.CSSProperties}>
                  <span className={`severity severity-${signal.severity}`}>{severityLabel(signal.severity)}</span>
                  <div className="signal-copy">
                    <h3>{signal.title}</h3>
                    <p>{signal.detail}</p>
                  </div>
                  <strong>{signal.metric}</strong>
                  <div className="signal-meta">
                    <span>{coverageLabel(signal.coverage)} veri kapsamı</span>
                    <time>{formatTimestamp(signal.sourceTimestamp)}</time>
                  </div>
                  <ChevronRight size={17} />
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="agent-rail">
          <div className="agent-heading">
            <div>
              <span className="eyebrow">AJAN ÇALIŞMA MASASI</span>
              <h2>Ortak işlem izi</h2>
            </div>
            <span className="trace-live"><i /> {traceLabel}</span>
          </div>

          <div className="activity-list">
            {activity.map((item) => (
              <div className={`activity-item ${item.status}`} key={item.id}>
                <span className="activity-index">0{item.id}</span>
                <div>
                  <b>{item.label}</b>
                  <p>{item.detail}</p>
                </div>
                <span className="activity-state">{item.status === "done" ? <Check size={13} /> : item.status === "active" ? <Activity size={13} /> : null}</span>
              </div>
            ))}
          </div>

          <section className="brief-sheet" aria-labelledby="brief-title">
            <div className="brief-topline">
              <span><Gauge size={15} /> VARDİYA NOTU / TASLAK</span>
              <span>v1</span>
            </div>
            <h2 id="brief-title">Operatör devri</h2>
            <ol>
              {brief.map((line) => <li key={line}>{line}</li>)}
            </ol>
            <div className="calculation-note">
              <span>Stres dayanağı</span>
              <code>{stress.calculation}</code>
            </div>
            <button className={`approve-button ${approved ? "approved" : ""}`} type="button" onClick={approveBrief}>
              {approved ? <Check size={16} /> : <ShieldCheck size={16} />}
              {approved ? "Yerel olarak onaylandı" : "İncele ve onayla"}
              {!approved && <ArrowRight size={16} />}
            </button>
            <p className="disclaimer">{stress.disclaimer}</p>
          </section>

          <footer className="data-provenance">
            <Database size={15} />
            <div>
              <span>VERİ KAYNAĞI</span>
              <b>{snapshot.source.provider}</b>
              <time>{formatTimestamp(snapshot.source.fetchedAt)}</time>
            </div>
          </footer>
        </aside>
      </section>
          ) : (
            <TransparencyWorkspace
              key={`${activeView}-${explorerDate}-${refreshNonce}-${visibleAgentExplorer?.revision ?? 0}`}
              view={activeView}
              date={explorerDate}
              staticDemo={STATIC_DEMO_MODE}
              initialResult={visibleAgentExplorer?.result}
              initialQuery={visibleAgentExplorer?.query}
              initialPlanningLayer={visibleAgentExplorer?.planningLayer}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  }).format(parsed);
}

function severityLabel(value: MarketSnapshot["signals"][number]["severity"]): string {
  return value === "high" ? "yüksek" : value === "medium" ? "orta" : "izle";
}

function coverageLabel(value: MarketSnapshot["signals"][number]["coverage"]): string {
  return value === "high" ? "yüksek" : value === "medium" ? "orta" : "düşük";
}

function previousIstanbulDate(now = new Date()): string {
  const completedDay = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Istanbul",
  }).formatToParts(completedDay);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function averageFinite(values: readonly unknown[]): number | null {
  const numeric = values.filter(isFiniteNumber);
  if (!numeric.length) return null;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function formatMaybeTry(value: unknown): string {
  return isFiniteNumber(value) ? formatTry(value) : "—";
}

function formatMaybeNumber(value: unknown, digits = 0): string {
  return isFiniteNumber(value) ? formatNumber(value, digits) : "—";
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function isAbortException(error: unknown): boolean {
  return (error instanceof DOMException && error.name === "AbortError")
    || (error instanceof Error && error.name === "AbortError");
}

async function readGatewayError(response: Response): Promise<string> {
  try {
    const payload = await response.json() as { error?: { message?: unknown } };
    if (typeof payload.error?.message === "string" && payload.error.message.trim()) {
      return payload.error.message;
    }
  } catch {
    // The status is still useful when an intermediary returns a non-JSON body.
  }
  return `Market gateway returned ${response.status}.`;
}

function fromExclusiveToolWindow(input: AnalysisScopeInput, base: AnalysisScope): AnalysisScope {
  if (!isIsoCalendarDate(input.marketDate)) {
    throw new Error("marketDate must be a real calendar date in YYYY-MM-DD format.");
  }
  if (!Number.isInteger(input.startHour) || input.startHour < 0 || input.startHour > 23) {
    throw new Error("startHour must be an integer from 0 through 23.");
  }
  if (!Number.isInteger(input.endHour) || input.endHour < 1 || input.endHour > 24 || input.endHour <= input.startHour) {
    throw new Error("endHour must be an exclusive integer boundary greater than startHour, from 1 through 24.");
  }
  return {
    ...base,
    date: input.marketDate,
    startHour: input.startHour,
    endHour: input.endHour - 1,
  };
}

function sourceAttribution(snapshot: MarketSnapshot, context?: string) {
  return {
    provider: snapshot.source.provider,
    fetchedAt: snapshot.source.fetchedAt,
    timezone: snapshot.source.timezone ?? "Europe/Istanbul",
    mode: snapshot.mode,
    note: snapshot.source.note,
    evidenceScope: snapshot.scope,
    context: context ?? "Source metadata applies to the returned market evidence.",
  };
}

function projectMarketPoints(
  snapshot: MarketSnapshot,
  requestedMetrics: MarketSnapshotInput["metrics"],
  startHour: number,
  exclusiveEndHour: number,
) {
  const points = snapshot.points.filter((point) => {
    const hour = Number(point.hour.slice(0, 2));
    return hour >= startHour && hour < exclusiveEndHour;
  });
  if (!requestedMetrics) return points;

  return points.map((point) => {
    const observation: Record<string, string | number | null> = {
      timestamp: point.timestamp,
      hour: point.hour,
    };
    for (const metric of requestedMetrics) {
      const metricName: string = metric;
      if (metricName === "ptf") observation.ptf = point.ptf;
      if (metricName === "smf") observation.smf = point.smf;
      if (metricName === "idm") observation.idm = point.idm;
      if (metricName === "consumption") observation.consumption = point.load;
      if (metricName === "generation") observation.generation = point.generation;
      if (metricName === "system_direction") observation.systemDirection = point.systemDirection;
    }
    return observation;
  });
}

function selectWindowPoints(snapshot: MarketSnapshot, scope: AnalysisScope): MarketSnapshot["points"] {
  return snapshot.points.filter((point) => {
    const hour = Number(point.hour.slice(0, 2));
    return hour >= scope.startHour && hour <= scope.endHour;
  });
}

function isIsoCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function findContextPeakHour(points: MarketSnapshot["points"], side: PositionSide): string {
  let adverse: MarketSnapshot["points"][number] | undefined;
  for (const point of points) {
    if (!isFiniteNumber(point.idm)) continue;
    if (!adverse || !isFiniteNumber(adverse.idm)) {
      adverse = point;
      continue;
    }
    if ((side === "short" && point.idm > adverse.idm) || (side === "long" && point.idm < adverse.idm)) {
      adverse = point;
    }
  }
  return adverse?.hour ?? "—";
}

function buildBriefSections(
  options: {
    language: "tr" | "en";
    audience: "trader" | "risk" | "operations";
    sections: NonNullable<DraftShiftBriefInput["includeSections"]>;
    notes?: string;
  },
  snapshot: MarketSnapshot,
  stress: StressResult,
) {
  const signalSummary = snapshot.signals.slice(0, 3).map((signal) => signal.title).join("; ");
  const exposure = formatMaybeTry(stress.estimatedExposureTry);
  const texts = options.language === "tr"
    ? {
      market: `Piyasa: ${snapshot.scope.startHour}:00–${snapshot.scope.endHour}:00 penceresinde öne çıkan kanıtlar: ${signalSummary || "sıralanmış sinyal yok"}.`,
      position: `Pozisyon: ${stress.positionMwh} MWh ${stress.side}; gösterge niteliğindeki olumsuz etki ${exposure}; mevcut GİP bağlam zirvesi ${stress.contextPeakHour}.`,
      risks: `Riskler: ${snapshot.warnings?.length ? snapshot.warnings.join("; ") : "Kaynak zamanlarını ve portföye özgü kısıtları yeniden doğrulayın."}`,
      actions: `Aksiyonlar: ${options.audience} ekibi veri yayın saatlerini ve açık pozisyonu doğrulamalı; bu taslak otomatik işlem veya emir önerisi değildir.`,
    }
    : {
      market: `Market: leading evidence for ${snapshot.scope.startHour}:00–${snapshot.scope.endHour}:00 is ${signalSummary || "not yet ranked"}.`,
      position: `Position: ${stress.positionMwh} MWh ${stress.side}; illustrative adverse exposure is ${exposure}; the current IDM context peak is at ${stress.contextPeakHour}.`,
      risks: `Risks: ${snapshot.warnings?.length ? snapshot.warnings.join("; ") : "Re-check source timestamps and portfolio-specific constraints."}`,
      actions: `Actions: the ${options.audience} team should verify publication times and the open position; this draft is not an automated trade or order recommendation.`,
    };
  const result: Array<{ name: string; text: string }> = options.sections.map((name) => ({ name, text: texts[name] }));
  if (options.notes?.trim()) {
    result.push({
      name: "operator_note",
      text: options.language === "tr"
        ? `Doğrulanmamış operatör notu: ${options.notes.trim()}`
        : `Unverified operator note: ${options.notes.trim()}`,
    });
  }
  return result;
}

type CatalogMatch = {
  entityType: "organization" | "plant";
  id: number;
  name: string;
  shortName: string | null;
  eic: string | null;
  status: string | null;
  score: number;
};

type ComparableExplorerMetric =
  | "kgup"
  | "kudup"
  | "eak"
  | "realtimeGeneration"
  | "loadPlan"
  | "realtimeConsumption";

function entitySearchScore(values: Array<string | null>, query: string): number | null {
  const normalizedValues = values.filter((value): value is string => Boolean(value)).map(normalizeExplorerSearch);
  if (normalizedValues.some((value) => value === query)) return 0;
  if (normalizedValues.some((value) => value.startsWith(query))) return 1;
  if (normalizedValues.some((value) => value.split(/\s+/).some((part) => part.startsWith(query)))) return 2;
  if (normalizedValues.some((value) => value.includes(query))) return 3;
  return null;
}

function rankCatalogMatches(
  catalog: CatalogExplorerResponse,
  query: string,
  entityType: "organization" | "plant" | "all",
): CatalogMatch[] {
  const matches: CatalogMatch[] = [];
  if (entityType !== "plant") {
    for (const organization of catalog.organizations) {
      const score = entitySearchScore([organization.name, organization.shortName, organization.eic], query);
      if (score === null) continue;
      matches.push({
        entityType: "organization",
        id: organization.id,
        name: organization.name,
        shortName: organization.shortName,
        eic: organization.eic,
        status: organization.status,
        score,
      });
    }
  }
  if (entityType !== "organization") {
    for (const plant of catalog.plants) {
      const score = entitySearchScore([plant.name, plant.shortName, plant.eic], query);
      if (score === null) continue;
      matches.push({
        entityType: "plant",
        id: plant.id,
        name: plant.name,
        shortName: plant.shortName,
        eic: plant.eic,
        status: null,
        score,
      });
    }
  }
  return matches.sort((left, right) => left.score - right.score || left.name.localeCompare(right.name, "tr-TR"));
}

function summarizeExplorerMetric(points: readonly ExplorerPoint[], metric: ComparableExplorerMetric) {
  const values = points.map((point) => point[metric]).filter(isFiniteNumber);
  const coverageHours = values.length;
  return {
    publishedTotalMwh: coverageHours ? values.reduce((sum, value) => sum + value, 0) : null,
    coverageHours,
    expectedHours: 24,
    fullDay: coverageHours === 24,
  };
}

function summarizeExplorerPair(
  points: readonly ExplorerPoint[],
  actualMetric: ComparableExplorerMetric,
  referenceMetric: ComparableExplorerMetric,
) {
  const paired = points.filter((point) => isFiniteNumber(point[actualMetric]) && isFiniteNumber(point[referenceMetric]));
  const commonHours = paired.length;
  const commonHourDifferenceMwh = commonHours
    ? paired.reduce((sum, point) => sum + Number(point[actualMetric]) - Number(point[referenceMetric]), 0)
    : null;
  return {
    fullDayDeviationMwh: commonHours === 24 ? commonHourDifferenceMwh : null,
    commonHourDifferenceMwh,
    commonHours,
    expectedHours: 24,
    fullDay: commonHours === 24,
    note: commonHours === 24
      ? "Full-day deviation uses 24 hours where both series are published."
      : "Full-day deviation is null because both series are not published for all 24 hours; the partial difference uses only common published hours.",
  };
}

function explorerSourceAttribution(response: ExplorerResponse, context: string) {
  return {
    provider: response.source.provider,
    fetchedAt: response.source.fetchedAt,
    timezone: response.source.timezone,
    mode: response.mode,
    note: response.source.note,
    evidenceScope: response.scope,
    context,
  };
}

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
