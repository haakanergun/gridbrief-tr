import type { MarketPoint, MarketSignal, SignalSeverity } from "./types";

function finite(values: Array<number | null>): number[] {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function severityByRatio(ratio: number): SignalSeverity {
  if (ratio >= 0.3) return "high";
  if (ratio >= 0.15) return "medium";
  return "watch";
}

function coverageLabel(coverage: number): "high" | "medium" | "low" {
  if (coverage >= 0.8) return "high";
  if (coverage >= 0.5) return "medium";
  return "low";
}

export function buildSignals(points: MarketPoint[]): MarketSignal[] {
  if (points.length === 0) return [];

  const signals: MarketSignal[] = [];
  const prices = finite(points.map((point) => point.ptf));
  if (prices.length >= 2) {
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const spread = high - low;
    const base = Math.max(Math.abs(low), 1);
    const ratio = spread / base;
    const peak = points.find((point) => point.ptf === high) ?? points[0];
    signals.push({
      id: "ptf-range",
      severity: severityByRatio(ratio),
      title: "PTF aralığı genişliyor",
      detail: `Seçili penceredeki en düşük ve en yüksek PTF arasındaki fark ${spread.toFixed(0)} TL/MWh.`,
      metric: `${Math.round(spread * 100) / 100} TL/MWh`,
      sourceTimestamp: peak.timestamp,
      coverage: coverageLabel(prices.length / points.length),
    });
  }

  const deficitPoints = points.filter((point) => point.systemDirection === "SHORT");
  const systemDirectionCoverage = points.filter((point) => point.systemDirection !== null).length / points.length;
  if (deficitPoints.length > 0) {
    signals.push({
      id: "system-deficit",
      severity: deficitPoints.length >= Math.ceil(points.length / 2) ? "high" : "medium",
      title: "Sistem açığı sinyali",
      detail: `${deficitPoints.length} saat sistemin enerji açığında olduğunu gösteriyor. Dengeleme piyasası verisi yaklaşık dört saat gecikmeli olabilir.`,
      metric: `${deficitPoints.length} saat`,
      sourceTimestamp: deficitPoints[0].timestamp,
      coverage: coverageLabel(systemDirectionCoverage),
    });
  }

  const supplyPoints = points.filter(
    (point) => point.load !== null && point.generation !== null && point.load > 0,
  );
  const tightest = supplyPoints
    .map((point) => ({ point, margin: ((point.generation as number) - (point.load as number)) / (point.load as number) }))
    .sort((a, b) => a.margin - b.margin)[0];
  if (tightest && tightest.margin < 0.03) {
    signals.push({
      id: "supply-margin",
      severity: tightest.margin < 0 ? "high" : "medium",
      title: "Üretim marjı daralıyor",
      detail: `Saatlik üretim–tüketim marjı yükün ${(tightest.margin * 100).toFixed(1)}% düzeyinde.`,
      metric: `${Math.round(tightest.margin * 10_000) / 100}%`,
      sourceTimestamp: tightest.point.timestamp,
      coverage: coverageLabel(supplyPoints.length / points.length),
    });
  }

  return signals.slice(0, 4);
}
