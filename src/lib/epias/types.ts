export type MarketMode = "live" | "synthetic";

export type SignalSeverity = "high" | "medium" | "watch";

export type PositionSide = "long" | "short";

export type SystemDirection = "SHORT" | "LONG" | "BALANCED";

export interface MarketRequest {
  date: string;
  startHour: number;
  endHour: number;
  positionMwh?: number;
  side?: PositionSide;
}

export interface MarketPoint {
  timestamp: string;
  hour: string;
  ptf: number | null;
  smf: number | null;
  idm: number | null;
  load: number | null;
  generation: number | null;
  systemDirection: SystemDirection | null;
}

export interface MarketSignal {
  id: string;
  severity: SignalSeverity;
  title: string;
  detail: string;
  metric: string;
  sourceTimestamp: string;
  coverage: "high" | "medium" | "low";
}

export interface MarketSnapshot {
  mode: MarketMode;
  source: {
    provider: string;
    fetchedAt: string;
    timezone: "Europe/Istanbul";
    note: string;
  };
  scope: {
    date: string;
    startHour: number;
    endHour: number;
  };
  points: MarketPoint[];
  signals: MarketSignal[];
  warnings: string[];
}
