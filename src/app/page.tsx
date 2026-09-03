"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  Braces,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Copy,
  Database,
  ExternalLink,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { type FormEvent, useCallback, useMemo, useRef, useState } from "react";
import { MarketChart } from "@/components/MarketChart";
import { useWebMcp } from "@/hooks/useWebMcp";
import { createDemoSnapshot } from "@/lib/demo";
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
  type DraftShiftBriefInput,
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

const STARTING_ACTIVITY: ActivityItem[] = [
  { id: 1, label: "Scope received", detail: "04 Sep · 17:00–22:00 · 50 MWh short", status: "done" },
  { id: 2, label: "Market snapshot", detail: "Three price layers aligned to UTC+3", status: "done" },
  { id: 3, label: "Exposure stress", detail: "Adverse spread scenario calculated", status: "done" },
  { id: 4, label: "Shift brief", detail: "Source-attributed draft prepared", status: "done" },
  { id: 5, label: "Human review", detail: "Waiting for operator approval", status: "waiting" },
];

const TOOL_ACTIVITY: Record<WebMcpToolName, Pick<ActivityItem, "id" | "label">> = {
  set_analysis_scope: { id: 1, label: "Scope received" },
  get_market_snapshot: { id: 2, label: "Market snapshot" },
  stress_test_position: { id: 3, label: "Exposure stress" },
  draft_shift_brief: { id: 4, label: "Shift brief" },
};

const ALL_BRIEF_SECTIONS = ["market", "position", "risks", "actions"] as const;
const STATIC_DEMO_MODE = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";

export default function Home() {
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

  const runAnalysis = useCallback(async (nextScope: AnalysisScope, signal?: AbortSignal) => {
    const requestId = ++analysisRequestRef.current;
    setLoading(true);
    setApproved(false);
    setGatewayError(null);
    setActivity([
      { id: 1, label: "Scope received", detail: `${nextScope.date} · ${nextScope.startHour}:00–${nextScope.endHour}:00 · ${nextScope.positionMwh} MWh ${nextScope.side}`, status: "done" },
      { id: 2, label: "Market snapshot", detail: "Requesting aligned market series", status: "active" },
      { id: 3, label: "Exposure stress", detail: "Waiting for market evidence", status: "waiting" },
      { id: 4, label: "Shift brief", detail: "Waiting for stress result", status: "waiting" },
      { id: 5, label: "Human review", detail: "Waiting for operator approval", status: "waiting" },
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
          { id: 1, label: "Scope received", detail: `${nextScope.date} · ${nextScope.startHour}:00–${nextScope.endHour}:00 · ${nextScope.positionMwh} MWh ${nextScope.side}`, status: "done" },
          { id: 2, label: "Market snapshot", detail: `${nextSnapshot.points.length} hourly observations · ${nextSnapshot.mode} mode`, status: "done" },
          { id: 3, label: "Exposure stress", detail: `${formatMaybeTry(nextStress.estimatedExposureTry)} illustrative sensitivity`, status: "done" },
          { id: 4, label: "Shift brief", detail: "Draft updated from the current evidence", status: "done" },
          { id: 5, label: "Human review", detail: "Waiting for operator approval", status: "waiting" },
        ]);
      }
      return { snapshot: nextSnapshot, stress: nextStress };
    } catch (error) {
      if (signal?.aborted || isAbortException(error)) throw error;

      const message = error instanceof Error ? error.message : "The market gateway request failed.";
      if (requestId === analysisRequestRef.current) {
        setGatewayError(message);
        setActivity([
          { id: 1, label: "Scope received", detail: `${nextScope.date} · ${nextScope.startHour}:00–${nextScope.endHour}:00 · ${nextScope.positionMwh} MWh ${nextScope.side}`, status: "done" },
          { id: 2, label: "Market snapshot", detail: "Gateway failed; last valid snapshot retained", status: "waiting" },
          { id: 3, label: "Exposure stress", detail: "Not recalculated from incomplete evidence", status: "waiting" },
          { id: 4, label: "Shift brief", detail: "Existing draft retained", status: "waiting" },
          { id: 5, label: "Human review", detail: "Resolve the source warning before approval", status: "waiting" },
        ]);
      }
      throw error instanceof Error ? error : new Error(message);
    } finally {
      if (requestId === analysisRequestRef.current) setLoading(false);
    }
  }, []);

  const handleWebMcpActivity = useCallback((event: WebMcpActivityEvent) => {
    setTraceLabel("WEBMCP TRACE");
    const tool = TOOL_ACTIVITY[event.toolName];
    const status: ActivityItem["status"] = event.phase === "started" ? "active" : event.phase === "succeeded" ? "done" : "waiting";
    const detail = event.phase === "started"
      ? "Agent invoked this browser tool"
      : event.phase === "succeeded"
        ? `Completed at ${formatTimestamp(event.occurredAt)}`
        : event.phase === "cancelled"
          ? "Cancelled by the agent"
          : event.error?.message ?? "Tool execution failed";

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
        warnings: ["No priced PTF observations are available for the visible window. Provide a reference price or refresh the snapshot."],
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
      calculation: `${input.volumeMwh} MWh × ${roundOne(Math.max(0, adverseSpread))} TRY/MWh adverse movement (${input.priceShockPercent}% scenario)`,
      disclaimer: "Illustrative what-if sensitivity, not a forecast, order recommendation, or settlement calculation.",
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
    const prompt = `Use this page's WebMCP tools to analyze a ${scope.positionMwh} MWh ${scope.side} position for ${scope.date}, delivery hours ${scope.startHour}:00 through ${scope.endHour}:59 (use exclusive endHour ${scope.endHour + 1} in tool calls). Show the evidence, stress the exposure, and draft a shift brief for my review. Do not place or recommend a trade.`;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function approveBrief() {
    setApproved(true);
    setActivity((items) => items.map((item) => item.id === 5 ? { ...item, detail: "Reviewed and approved locally", status: "done" } : item));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#workspace" aria-label="GridBrief TR home">
          <span className="brand-mark"><Zap size={15} strokeWidth={2.8} /></span>
          <span>GRIDBRIEF <em>TR</em></span>
        </a>
        <div className="topbar-context">
          <span className="market-clock"><Clock3 size={14} /> TR market time <b>UTC+3</b></span>
          <span className={`mode-indicator ${snapshot.mode}`}>
            <i /> {snapshot.mode === "live" ? "EPİAŞ LIVE" : "SYNTHETIC REPLAY"}
          </span>
          <span className={`mcp-indicator ${webMcp.registered ? "supported" : ""}`} title={webMcp.error ?? undefined}>
            <Braces size={14} /> WebMCP {webMcp.registered ? "ready" : webMcp.status}
          </span>
        </div>
      </header>

      <section className="workspace" id="workspace">
        <aside className="scope-rail">
          <div className="rail-heading">
            <span className="eyebrow">ANALYSIS SCOPE</span>
            <button className="icon-button" type="button" title="Reset scope" onClick={() => {
              setTraceLabel("LOCAL RUN");
              void runAnalysis(DEFAULT_SCOPE).catch(() => undefined);
            }}>
              <RefreshCw size={15} />
            </button>
          </div>

          <form className="scope-form" onSubmit={submitScope}>
            <label>
              Delivery date
              <input type="date" value={scope.date} onChange={(event) => setScope({ ...scope, date: event.target.value })} />
            </label>
            <div className="form-split">
              <label>
                From
                <select value={scope.startHour} onChange={(event) => setScope({ ...scope, startHour: Number(event.target.value) })}>
                  {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}
                </select>
              </label>
              <label>
                Through (inclusive)
                <select value={scope.endHour} onChange={(event) => setScope({ ...scope, endHour: Number(event.target.value) })}>
                  {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}
                </select>
              </label>
            </div>
            <label>
              Open position
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
              <legend>Position side</legend>
              <div className="side-toggle">
                {(["short", "long"] as PositionSide[]).map((side) => (
                  <button
                    type="button"
                    key={side}
                    className={scope.side === side ? "active" : ""}
                    onClick={() => setScope({ ...scope, side })}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </fieldset>
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? <RefreshCw className="spin" size={16} /> : <Sparkles size={16} />}
              {loading ? "Aligning evidence" : "Run risk brief"}
            </button>
          </form>

          <div className="agent-prompt">
            <span className="eyebrow">TRY WITH YOUR AGENT</span>
            <p>Ask the browser agent to investigate this exact delivery window.</p>
            <button type="button" onClick={() => void copyAgentPrompt()}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Prompt copied" : "Copy agent prompt"}
            </button>
          </div>

          <a className="source-link" href="https://seffaflik.epias.com.tr/electricity-service/technical/tr/index.html" target="_blank" rel="noreferrer">
            EPİAŞ source documentation <ExternalLink size={13} />
          </a>
        </aside>

        <section className="market-stage">
          <div className="stage-heading">
            <div>
              <span className="eyebrow">DELIVERY RISK · {scope.date}</span>
              <h1>Evening position<br /><span>under pressure.</span></h1>
            </div>
            <div className="headline-metric">
              <span>Illustrative adverse exposure</span>
              <strong>{formatMaybeTry(stress.estimatedExposureTry)}</strong>
              <small><ArrowDownRight size={14} /> IDM context peak {stress.contextPeakHour}</small>
            </div>
          </div>

          {gatewayError && (
            <div className="gateway-error" role="alert">
              <CircleAlert size={15} />
              <span><b>Market gateway warning:</b> {gatewayError} The last valid snapshot remains on screen.</span>
            </div>
          )}

          {webMcp.error && (
            <div className="gateway-error" role="status">
              <Braces size={15} />
              <span><b>WebMCP registration warning:</b> {webMcp.error}</span>
            </div>
          )}

          {snapshot.mode === "synthetic" && (
            <div className="replay-banner">
              <CircleAlert size={15} />
              <span><b>Replay mode:</b> fabricated next-day reference values demonstrate the workflow; they are neither EPİAŞ data nor future actuals.</span>
            </div>
          )}

          {(snapshot.warnings?.length ?? 0) > 0 && (
            <div className="warning-stack" aria-label="Source warnings">
              {snapshot.warnings?.slice(0, 4).map((warning, index) => (
                <div className="warning-row" key={`${index}-${warning}`}>
                  <CircleAlert size={14} />
                  <span><b>Source warning:</b> {warning}</span>
                </div>
              ))}
            </div>
          )}

          <MarketChart points={snapshot.points} startHour={scope.startHour} endHour={scope.endHour} loading={loading} />

          <div className="market-readout">
            <div>
              <span>Window avg. PTF</span>
              <strong>{formatMaybeNumber(averagePtf)} <small>TRY/MWh</small></strong>
            </div>
            <div>
              <span>Peak intraday</span>
              <strong>{formatMaybeNumber(peak?.idm)} <small>at {peak?.hour ?? "—"}</small></strong>
            </div>
            <div>
              <span>Short-system hours</span>
              <strong>{shortHours}<small> / {selectedPoints.length || 0}</small></strong>
            </div>
            <div>
              <span>Evidence freshness</span>
              <strong className="freshness"><i /> Review</strong>
            </div>
          </div>

          <section className="signals-section" aria-labelledby="signals-title">
            <div className="section-heading-row">
              <div>
                <span className="eyebrow">RANKED EVIDENCE</span>
                <h2 id="signals-title">What changed the risk picture</h2>
              </div>
              <span className="row-note"><ShieldCheck size={15} /> Source and time attached</span>
            </div>
            <div className="signals-list">
              {snapshot.signals.map((signal, index) => (
                <article className="signal-row" key={signal.id} style={{ "--delay": `${index * 80}ms` } as React.CSSProperties}>
                  <span className={`severity severity-${signal.severity}`}>{signal.severity}</span>
                  <div className="signal-copy">
                    <h3>{signal.title}</h3>
                    <p>{signal.detail}</p>
                  </div>
                  <strong>{signal.metric}</strong>
                  <div className="signal-meta">
                    <span>{signal.coverage} data coverage</span>
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
              <span className="eyebrow">AGENT WORKBENCH</span>
              <h2>Shared trace</h2>
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
              <span><Gauge size={15} /> SHIFT BRIEF / DRAFT</span>
              <span>v1</span>
            </div>
            <h2 id="brief-title">Operator handoff</h2>
            <ol>
              {brief.map((line) => <li key={line}>{line}</li>)}
            </ol>
            <div className="calculation-note">
              <span>Stress basis</span>
              <code>{stress.calculation}</code>
            </div>
            <button className={`approve-button ${approved ? "approved" : ""}`} type="button" onClick={approveBrief}>
              {approved ? <Check size={16} /> : <ShieldCheck size={16} />}
              {approved ? "Approved locally" : "Review & approve"}
              {!approved && <ArrowRight size={16} />}
            </button>
            <p className="disclaimer">{stress.disclaimer}</p>
          </section>

          <footer className="data-provenance">
            <Database size={15} />
            <div>
              <span>DATA PROVENANCE</span>
              <b>{snapshot.source.provider}</b>
              <time>{formatTimestamp(snapshot.source.fetchedAt)}</time>
            </div>
          </footer>
        </aside>
      </section>
    </main>
  );
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  }).format(parsed);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
