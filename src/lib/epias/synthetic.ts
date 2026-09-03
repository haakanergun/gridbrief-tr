import { buildSignals } from "./signals";
import type { MarketPoint, MarketRequest, MarketSnapshot } from "./types";

function hashDate(date: string): number {
  let hash = 2166136261;
  for (const character of date) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function round(value: number, decimals = 2): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

function timestamp(date: string, hour: number): string {
  return `${date}T${hour.toString().padStart(2, "0")}:00:00+03:00`;
}

export function syntheticSnapshot(
  request: MarketRequest,
  options: { fetchedAt?: string } = {},
): MarketSnapshot {
  const dateSeed = hashDate(request.date);
  const points: MarketPoint[] = [];

  for (let hour = 0; hour <= 23; hour += 1) {
    const morningPeak = Math.exp(-((hour - 9) ** 2) / 10);
    const eveningPeak = Math.exp(-((hour - 19) ** 2) / 8);
    const wave = Math.sin((hour + (dateSeed % 7)) * 0.73);
    const ptf = 1_740 + 380 * morningPeak + 710 * eveningPeak + 95 * wave;
    const smfDelta = 105 * Math.sin(hour * 1.37 + (dateSeed % 5)) + (hour === 19 ? 310 : 0);
    const load = 31_000 + 5_100 * morningPeak + 8_800 * eveningPeak + 520 * wave;
    const generationMargin = 900 - 1_480 * eveningPeak + 240 * Math.cos(hour * 0.91);
    const direction = generationMargin < 0 ? "SHORT" : generationMargin > 900 ? "LONG" : "BALANCED";

    points.push({
      timestamp: timestamp(request.date, hour),
      hour: `${hour.toString().padStart(2, "0")}:00`,
      ptf: round(ptf),
      smf: round(ptf + smfDelta),
      idm: round(ptf + 42 * Math.sin(hour * 0.88 + 0.6)),
      load: round(load),
      generation: round(load + generationMargin),
      systemDirection: direction,
    });
  }

  return {
    mode: "synthetic",
    source: {
      provider: "Synthetic demo generator (not EPİAŞ)",
      fetchedAt: options.fetchedAt ?? new Date().toISOString(),
      timezone: "Europe/Istanbul",
      note: "SYNTHETIC DEMO: These values are not EPİAŞ data and must not be used for market decisions. The live gateway activates only when EPTR_USERNAME and EPTR_PASSWORD are configured server-side.",
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
    warnings: ["Synthetic demo data is shown because server-side EPİAŞ credentials are not configured."],
  };
}
