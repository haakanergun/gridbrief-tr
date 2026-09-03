import { syntheticSnapshot } from "./epias/synthetic";
import type { AnalysisScope, MarketSnapshot } from "./market";

const DEMO_AS_OF = "2026-09-03T10:30:00+03:00";

export function createDemoSnapshot(scope: AnalysisScope): MarketSnapshot {
  return syntheticSnapshot(scope, { fetchedAt: DEMO_AS_OF });
}
