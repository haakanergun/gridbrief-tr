"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileCheck2,
  LineChart,
  LoaderCircle,
  RefreshCw,
  Table2,
  Wifi,
} from "lucide-react";
import { useId, useState, type CSSProperties } from "react";

import type {
  DatasetCell,
  DatasetColumn,
  DatasetQueryResponse,
} from "@/lib/transparency/dataset-types";
import { DatasetChart, type DatasetChartPoint } from "./DatasetChart";
import type { Locale } from "@/i18n/locale";

export type DatasetViewerMode = "live" | "cached";

export interface GenericDatasetViewerProps {
  result: DatasetQueryResponse | null;
  loading?: boolean;
  error?: string | null;
  mode?: DatasetViewerMode;
  onRetry?: () => void;
  onPageChange?: (number: number, size: number) => void;
  maxVisibleRows?: number;
  locale?: Locale;
}

const styles: Record<string, CSSProperties> = {
  root: {
    minWidth: 0,
    color: "var(--text-soft)",
    fontSize: 10,
  },
  state: {
    minHeight: 180,
    display: "grid",
    placeItems: "center",
    gap: 12,
    padding: 24,
    borderTop: "1px solid var(--line-soft)",
    color: "var(--muted)",
    textAlign: "center",
  },
  stateInner: {
    display: "grid",
    justifyItems: "center",
    gap: 7,
    maxWidth: 360,
  },
  stateTitle: {
    color: "var(--text-soft)",
    fontSize: 11,
  },
  stateCopy: {
    margin: 0,
    color: "var(--muted)",
    fontSize: 9,
    lineHeight: 1.5,
  },
  retry: {
    minHeight: 36,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "0 12px",
    border: "1px solid var(--line)",
    borderRadius: 7,
    color: "var(--text-soft)",
    background: "#ffffff",
    fontSize: 9,
    fontWeight: 750,
    cursor: "pointer",
  },
  toolbar: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    padding: "15px 0",
    borderTop: "1px solid var(--line-soft)",
    borderBottom: "1px solid var(--line-soft)",
  },
  identity: {
    minWidth: 0,
    display: "grid",
    gap: 4,
  },
  eyebrow: {
    color: "var(--muted)",
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: ".08em",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    color: "var(--text)",
    fontSize: 14,
    lineHeight: 1.3,
    fontWeight: 680,
  },
  badges: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    minHeight: 25,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "0 8px",
    border: "1px solid #cfe3de",
    borderRadius: 999,
    color: "#135f53",
    background: "#eff7f5",
    fontSize: 8,
    fontWeight: 750,
    whiteSpace: "nowrap",
  },
  badgeNeutral: {
    borderColor: "var(--line)",
    color: "var(--muted)",
    background: "#f6f8f7",
  },
  summary: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
    margin: 0,
    borderBottom: "1px solid var(--line-soft)",
  },
  metric: {
    minWidth: 0,
    display: "grid",
    gap: 4,
    padding: "13px 10px 13px 0",
  },
  metricLabel: {
    color: "var(--muted)",
    fontSize: 7,
    fontWeight: 800,
    letterSpacing: ".07em",
    textTransform: "uppercase",
  },
  metricValue: {
    margin: 0,
    color: "var(--text-soft)",
    fontSize: 10,
    fontWeight: 680,
    fontVariantNumeric: "tabular-nums",
    overflowWrap: "anywhere",
  },
  warning: {
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    margin: "13px 0 0",
    padding: "11px 12px",
    border: "1px solid #eadfbe",
    borderRadius: 7,
    color: "#775e24",
    background: "#fff8e8",
  },
  warningList: {
    minWidth: 0,
    display: "grid",
    gap: 4,
    margin: 0,
    padding: 0,
    listStyle: "none",
    fontSize: 8,
    lineHeight: 1.45,
  },
  sectionHeading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    margin: "18px 0 9px",
  },
  sectionTitle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    color: "var(--text-soft)",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: ".04em",
    textTransform: "uppercase",
  },
  sectionMeta: {
    color: "var(--muted)",
    fontSize: 8,
  },
  tableFrame: {
    width: "100%",
    maxHeight: 370,
    overflow: "auto",
    border: "1px solid var(--line)",
    borderRadius: 7,
    background: "#ffffff",
    scrollbarWidth: "thin",
  },
  table: {
    width: "100%",
    minWidth: 560,
    borderCollapse: "collapse",
    color: "var(--text-soft)",
    fontSize: 9,
    fontVariantNumeric: "tabular-nums",
  },
  headerCell: {
    position: "sticky",
    zIndex: 1,
    top: 0,
    padding: "10px 11px",
    borderBottom: "1px solid var(--line)",
    color: "var(--muted)",
    background: "#f7f9f8",
    fontSize: 8,
    fontWeight: 800,
    lineHeight: 1.3,
    textAlign: "left",
    whiteSpace: "nowrap",
  },
  cell: {
    maxWidth: 260,
    padding: "9px 11px",
    borderBottom: "1px solid var(--line-soft)",
    lineHeight: 1.4,
    verticalAlign: "top",
    overflowWrap: "anywhere",
  },
  numericCell: {
    textAlign: "right",
    whiteSpace: "nowrap",
  },
  nullCell: {
    color: "#9aa6a2",
  },
  objectCell: {
    color: "var(--muted)",
    fontFamily: "var(--font-mono), ui-monospace, monospace",
    fontSize: 8,
  },
  tableNote: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    color: "var(--muted)",
    fontSize: 8,
  },
  source: {
    display: "grid",
    gap: 7,
    marginTop: 17,
    paddingTop: 14,
    borderTop: "1px solid var(--line-soft)",
  },
  sourceRow: {
    display: "grid",
    gridTemplateColumns: "84px minmax(0, 1fr)",
    gap: 10,
  },
  sourceLabel: {
    color: "var(--muted)",
    fontSize: 8,
  },
  sourceValue: {
    color: "var(--text-soft)",
    fontSize: 8,
    fontWeight: 650,
    overflowWrap: "anywhere",
  },
  visuallyHidden: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: 0,
  },
};

function formatDateTime(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Europe/Istanbul",
    }).format(new Date(Date.UTC(year, month - 1, day, 12)));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  }).format(parsed);
}

function formatObservedAt(value: string): string {
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

function serializeObject(value: DatasetCell): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "[Nesne]";
  }
}

function cellText(value: DatasetCell, column: DatasetColumn): string {
  if (value === null || value === undefined) return "—";
  if (column.type === "datetime" && typeof value === "string") return formatDateTime(value);
  if (column.type === "number" && typeof value === "number") {
    return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 4 }).format(value);
  }
  if (column.type === "boolean" && typeof value === "boolean") return value ? "Evet" : "Hayır";
  if (typeof value === "object") return serializeObject(value);
  return String(value);
}

function csvCell(value: DatasetCell): string {
  const text = value === null || value === undefined
    ? ""
    : typeof value === "object"
      ? serializeObject(value)
      : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(result: DatasetQueryResponse): void {
  const header = result.columns.map((column) => csvCell(column.label)).join(",");
  const rows = result.rows.map((row) =>
    result.columns.map((column) => csvCell(row[column.key] ?? null)).join(","),
  );
  const csv = `\uFEFF${[header, ...rows].join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeName = result.dataset.id.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-|-$/g, "");
  anchor.href = url;
  anchor.download = `${safeName || "epias-veri-seti"}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function scopeLabel(result: DatasetQueryResponse): string {
  const { scope } = result;
  if (scope.startDate && scope.endDate) {
    return `${formatDateTime(scope.startDate)} — ${formatDateTime(scope.endDate)}`;
  }
  if (scope.date) return formatDateTime(scope.date);
  if (scope.period) return scope.period;
  return "Servis varsayılanı";
}

function qualityLabel(result: DatasetQueryResponse): string {
  switch (result.quality.status) {
    case "complete": return "Tam veri";
    case "partial": return "Kısmi veri";
    case "empty": return "Kayıt yok";
  }
}

function chartMetricOptions(result: DatasetQueryResponse): DatasetColumn[] {
  return result.columns
    .filter((column) => column.type === "number")
    .map((column, index) => ({ column, score: chartMetricScore(column, index) }))
    .filter((item) => item.score > -50)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.column);
}

function chartData(result: DatasetQueryResponse, metricKey: string | undefined, locale: Locale): {
  points: DatasetChartPoint[];
  seriesLabel: string;
  unit: string | null;
} | null {
  const timeColumn = result.columns.find((column) => column.type === "datetime");
  const metricOptions = chartMetricOptions(result);
  const metricColumn = metricOptions.find((column) => column.key === metricKey) ?? metricOptions[0];
  if (!timeColumn || !metricColumn) return null;

  const points = result.rows.flatMap((row) => {
    const time = row[timeColumn.key];
    const value = row[metricColumn.key];
    if (typeof time !== "string" || typeof value !== "number" || !Number.isFinite(value)) return [];
    const parsed = new Date(time);
    if (Number.isNaN(parsed.getTime())) return [];
    return [{
      label: new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Europe/Istanbul",
      }).format(parsed),
      value,
    }];
  });

  if (points.length < 2) return null;
  const stride = Math.max(1, Math.ceil(points.length / 96));
  const sampled = points.filter((_, index) => index % stride === 0 || index === points.length - 1);
  const unitMatch = /\(([^)]+)\)\s*$/.exec(metricColumn.label);
  return {
    points: sampled,
    seriesLabel: metricColumn.label,
    unit: unitMatch?.[1] ?? null,
  };
}

function chartMetricScore(column: DatasetColumn, index: number): number {
  const identity = `${column.key} ${column.label}`.toLocaleLowerCase("tr-TR");
  let score = -index / 100;
  if (/(^|[^a-z])(id|hour|saat|year|yıl|month|ay|day|gün)([^a-z]|$)/i.test(identity)) {
    score -= 100;
  }
  if (/(price|fiyat|mcp|ptf|smf|sdf|amount|miktar|quantity|volume|hacim|total|toplam|generation|üretim|consumption|tüketim|capacity|kapasite|cost|maliyet|income|gelir|value|değer|rate|oran)/i.test(identity)) {
    score += 25;
  }
  return score;
}

function DatasetState({
  kind,
  message,
  onRetry,
  locale,
}: {
  kind: "loading" | "error" | "empty";
  message?: string | null;
  onRetry?: () => void;
  locale: Locale;
}) {
  const en = locale === "en";
  const Icon = kind === "loading" ? LoaderCircle : kind === "error" ? AlertTriangle : Database;
  const title = kind === "loading"
    ? en ? "Fetching data" : "Veri alınıyor"
    : kind === "error"
      ? en ? "Dataset could not be opened" : "Veri seti açılamadı"
      : en ? "No records in this scope" : "Bu kapsamda kayıt yok";
  const copy = message ?? (kind === "loading"
    ? en ? "Waiting for the EPİAŞ Transparency 2.0 response." : "EPİAŞ Şeffaflık 2.0 yanıtı bekleniyor."
    : kind === "empty"
      ? en ? "The source returned no records for the selected date and filters." : "Seçilen tarih ve filtreler için kaynak servis kayıt döndürmedi."
      : en ? "The source service request failed." : "Kaynak servis isteği tamamlanamadı.");

  return (
    <div style={styles.state} role={kind === "error" ? "alert" : "status"} aria-live="polite">
      <div style={styles.stateInner}>
        <Icon size={22} color={kind === "error" ? "#a65b50" : "var(--accent)"} aria-hidden="true" />
        <strong style={styles.stateTitle}>{title}</strong>
        <p style={styles.stateCopy}>{copy}</p>
        {kind === "error" && onRetry ? (
          <button type="button" style={styles.retry} onClick={onRetry}>
            <RefreshCw size={14} aria-hidden="true" /> {en ? "Try again" : "Yeniden dene"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function GenericDatasetViewer({
  result,
  loading = false,
  error = null,
  mode = "live",
  onRetry,
  onPageChange,
  maxVisibleRows = 250,
  locale = "tr",
}: GenericDatasetViewerProps) {
  const en = locale === "en";
  const titleId = useId();
  const chartPanelId = useId();
  const tablePanelId = useId();
  const sourcePanelId = useId();
  const [viewPreference, setViewPreference] = useState<{
    datasetId: string | null;
    view: "chart" | "table" | "source";
  }>({ datasetId: null, view: "chart" });
  const [metricPreference, setMetricPreference] = useState<{
    datasetId: string | null;
    key: string | null;
  }>({ datasetId: null, key: null });
  const metricOptions = result ? chartMetricOptions(result) : [];
  const selectedMetricKey = result && metricPreference.datasetId === result.dataset.id
    ? metricPreference.key ?? undefined
    : metricOptions[0]?.key;
  const chart = result ? chartData(result, selectedMetricKey, locale) : null;

  if (loading && !result) return <DatasetState kind="loading" locale={locale} />;
  if (error && !result) return <DatasetState kind="error" message={error} onRetry={onRetry} locale={locale} />;
  if (!result) return <DatasetState kind="empty" locale={locale} />;

  const requestedView = viewPreference.datasetId === result.dataset.id
    ? viewPreference.view
    : chart
      ? "chart"
      : "table";
  const visibleView = !chart && requestedView === "chart" ? "table" : requestedView;
  const visibleRows = result.rows.slice(0, Math.max(1, maxVisibleRows));
  const truncated = result.rows.length > visibleRows.length;
  const filterCount = Object.keys(result.scope.filters).length;
  const nullableRatio = result.quality.rowCount > 0 && result.quality.columnCount > 0
    ? result.quality.nullableCells / (result.quality.rowCount * result.quality.columnCount)
    : 0;
  const paginationStart = result.pagination
    ? (result.pagination.number - 1) * result.pagination.size + 1
    : 1;
  const paginationEnd = result.pagination
    ? paginationStart + Math.max(0, result.pagination.returnedRows - 1)
    : visibleRows.length;
  const pageSizes = result.pagination
    ? [...new Set([50, 100, 250, result.pagination.size])].sort((left, right) => left - right)
    : [];

  return (
    <section style={styles.root} aria-busy={loading} aria-labelledby={titleId}>
      <header style={styles.toolbar}>
        <div style={styles.identity}>
          <span style={styles.eyebrow}>{result.dataset.category} · {result.dataset.id}</span>
          <h3 id={titleId} style={styles.title}>{result.dataset.title}</h3>
        </div>
        <div style={styles.badges} aria-label={en ? "Data status" : "Veri durumu"}>
          <span style={styles.badge}>
            {mode === "live" ? <Wifi size={12} aria-hidden="true" /> : <Database size={12} aria-hidden="true" />}
            {mode === "live" ? en ? "EPİAŞ data" : "EPİAŞ verisi" : en ? "Cache" : "Önbellek"}
          </span>
          <span style={{ ...styles.badge, ...styles.badgeNeutral }}>
            {result.dataset.method} · {qualityLabel(result)}
          </span>
          {result.rows.length > 0 ? (
            <button
              type="button"
              className="dataset-download-action"
              onClick={() => downloadCsv(result)}
              aria-label={en ? `Download ${result.dataset.title} as CSV` : `${result.dataset.title} verisini CSV olarak indir`}
            >
              <Download size={12} aria-hidden="true" /> {en ? "Download CSV" : "CSV indir"}
            </button>
          ) : null}
        </div>
      </header>

      {loading ? (
        <div className="dataset-refresh-state" role="status">
          <LoaderCircle className="spin" size={13} aria-hidden="true" /> {en ? "Refreshing results; current data remains visible." : "Sonuç yenileniyor; mevcut veri görünür tutuluyor."}
        </div>
      ) : null}

      <dl style={styles.summary} aria-label={en ? "Data summary" : "Veri özeti"}>
        <div style={styles.metric}>
          <dt style={styles.metricLabel}>{en ? "Scope" : "Kapsam"}</dt>
          <dd style={styles.metricValue}>{scopeLabel(result)}</dd>
        </div>
        <div style={styles.metric}>
          <dt style={styles.metricLabel}>{en ? "Records" : "Kayıt"}</dt>
          <dd style={styles.metricValue}>{new Intl.NumberFormat(en ? "en-US" : "tr-TR").format(result.quality.rowCount)}</dd>
        </div>
        <div style={styles.metric}>
          <dt style={styles.metricLabel}>{en ? "Filters" : "Filtre"}</dt>
          <dd style={styles.metricValue}>{filterCount || (en ? "None" : "Yok")}</dd>
        </div>
        <div style={styles.metric}>
          <dt style={styles.metricLabel}>{en ? "Missing cells" : "Eksik hücre"}</dt>
          <dd style={styles.metricValue}>{new Intl.NumberFormat(en ? "en-US" : "tr-TR", { style: "percent", maximumFractionDigits: 1 }).format(nullableRatio)}</dd>
        </div>
      </dl>

      {result.warnings.length > 0 ? (
        <div style={styles.warning} role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <ul style={styles.warningList}>
            {result.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
          </ul>
        </div>
      ) : null}

      {result.quality.status === "empty" || result.rows.length === 0 ? (
        <DatasetState kind="empty" locale={locale} />
      ) : (
        <>
          <div className="dataset-result-nav">
            <div role="tablist" aria-label={en ? "Data view" : "Veri görünümü"}>
              {chart ? (
                <button
                  type="button"
                  role="tab"
                  aria-selected={visibleView === "chart"}
                  aria-controls={chartPanelId}
                  className={visibleView === "chart" ? "active" : ""}
                  onClick={() => setViewPreference({ datasetId: result.dataset.id, view: "chart" })}
                >
                  <LineChart size={14} aria-hidden="true" /> {en ? "Chart" : "Grafik"}
                </button>
              ) : null}
              <button
                type="button"
                role="tab"
                aria-selected={visibleView === "table"}
                aria-controls={tablePanelId}
                className={visibleView === "table" ? "active" : ""}
                onClick={() => setViewPreference({ datasetId: result.dataset.id, view: "table" })}
              >
                <Table2 size={14} aria-hidden="true" /> {en ? "Table" : "Tablo"}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={visibleView === "source"}
                aria-controls={sourcePanelId}
                className={visibleView === "source" ? "active" : ""}
                onClick={() => setViewPreference({ datasetId: result.dataset.id, view: "source" })}
              >
                <FileCheck2 size={14} aria-hidden="true" /> {en ? "Source" : "Kaynak"}
              </button>
            </div>
            <span>{result.columns.length} {en ? "columns" : "sütun"} · {visibleRows.length} {en ? "rows" : "satır"}</span>
          </div>

          {chart && visibleView === "chart" ? (
            <div id={chartPanelId} role="tabpanel" className="dataset-result-panel">
              {metricOptions.length > 1 ? (
                <label className="dataset-metric-select">
                  <span>{en ? "Chart series" : "Grafik serisi"}</span>
                  <select
                    value={selectedMetricKey}
                    onChange={(event) => setMetricPreference({
                      datasetId: result.dataset.id,
                      key: event.target.value,
                    })}
                  >
                    {metricOptions.map((column) => (
                      <option key={column.key} value={column.key}>{column.label}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <DatasetChart
                points={chart.points}
                seriesLabel={chart.seriesLabel}
                unit={chart.unit}
              />
            </div>
          ) : null}

          {visibleView === "table" ? (
            <div id={tablePanelId} role="tabpanel" className="dataset-result-panel">
              <div style={styles.sectionHeading}>
                <strong style={styles.sectionTitle}><Table2 size={14} aria-hidden="true" /> {en ? "Data table" : "Veri tablosu"}</strong>
                <span style={styles.sectionMeta}>{result.columns.length} {en ? "columns" : "sütun"} · {visibleRows.length} {en ? "rows" : "satır"}</span>
              </div>
              <div style={styles.tableFrame} tabIndex={0} aria-label="Yatay kaydırılabilir veri tablosu">
                <table style={styles.table}>
                  <caption style={styles.visuallyHidden}>{result.dataset.title} veri kayıtları</caption>
                  <thead>
                    <tr>
                      {result.columns.map((column) => (
                        <th
                          key={column.key}
                          scope="col"
                          style={{
                            ...styles.headerCell,
                            ...(column.type === "number" ? styles.numericCell : null),
                          }}
                        >
                          {column.label}{column.nullable ? <span aria-label="boş olabilir"> *</span> : null}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {result.columns.map((column) => {
                          const value = row[column.key] ?? null;
                          const isNull = value === null;
                          const isObject = typeof value === "object" && value !== null;
                          const text = cellText(value, column);
                          return (
                            <td
                              key={column.key}
                              style={{
                                ...styles.cell,
                                ...(column.type === "number" ? styles.numericCell : null),
                                ...(isNull ? styles.nullCell : null),
                                ...(isObject ? styles.objectCell : null),
                              }}
                              title={isObject ? text : undefined}
                            >
                              {text}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={styles.tableNote}>
                <span>* Kaynakta boş gelebilen alan</span>
                <span>
                  {truncated ? `İlk ${visibleRows.length} kayıt gösteriliyor` : `${visibleRows.length} kayıt gösteriliyor`}
                  {result.pagination ? ` · sayfa ${result.pagination.number}` : ""}
                  {result.pagination?.hasMore === true ? " · devamı var" : ""}
                </span>
              </div>
              {result.pagination && onPageChange ? (
                <div className="dataset-pagination" aria-label="Veri sayfalama">
                  <button
                    type="button"
                    onClick={() => onPageChange(result.pagination!.number - 1, result.pagination!.size)}
                    disabled={loading || result.pagination.number <= 1}
                  >
                    <ChevronLeft size={14} aria-hidden="true" /> Önceki
                  </button>
                  <span>
                    <b>Sayfa {result.pagination.number}</b>
                    <small>{paginationStart}–{paginationEnd} kayıt</small>
                  </span>
                  <label>
                    <span>Sayfa boyutu</span>
                    <select
                      value={result.pagination.size}
                      disabled={loading}
                      onChange={(event) => onPageChange(1, Number(event.target.value))}
                    >
                      {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => onPageChange(result.pagination!.number + 1, result.pagination!.size)}
                    disabled={loading
                      || result.pagination.hasMore === false
                      || (result.pagination.hasMore === null && result.pagination.returnedRows < result.pagination.size)}
                  >
                    Sonraki <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {visibleView === "source" ? (
            <div id={sourcePanelId} role="tabpanel" className="dataset-result-panel dataset-source-panel">
              <div className="dataset-source-intro">
                <CheckCircle2 size={16} aria-hidden="true" />
                <span><b>Kaynak zinciri görünür</b><small>Servis, uç nokta ve gözlem zamanı sonuçla birlikte korunur.</small></span>
              </div>
              <footer style={styles.source} aria-label="Kaynak ve kalite bilgisi">
                <div style={styles.sourceRow}>
                  <span style={styles.sourceLabel}>Kaynak</span>
                  <span style={styles.sourceValue}>{result.source.provider}</span>
                </div>
                <div style={styles.sourceRow}>
                  <span style={styles.sourceLabel}>Servis</span>
                  <span style={styles.sourceValue}>{result.source.service} · {result.source.upstreamVersion}</span>
                </div>
                <div style={styles.sourceRow}>
                  <span style={styles.sourceLabel}>Uç nokta</span>
                  <code style={styles.sourceValue}>{result.source.endpoint}</code>
                </div>
                <div style={styles.sourceRow}>
                  <span style={styles.sourceLabel}>Gözlem</span>
                  <time style={styles.sourceValue} dateTime={result.quality.observedAt}>
                    {formatObservedAt(result.quality.observedAt)} · Türkiye saati
                  </time>
                </div>
              </footer>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
