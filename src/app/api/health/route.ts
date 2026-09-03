import { NextResponse } from "next/server";

import { getEpiasConfigurationStatus } from "../../../lib/epias";
import { getAccessConfigurationStatus } from "../../../lib/server/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HealthMode = "live" | "synthetic" | "misconfigured";

interface GatewayHealth {
  status: "ok" | "degraded";
  service: "gridbrief-market-gateway";
  mode: HealthMode;
  timestamp: string;
}

export function GET(): NextResponse<GatewayHealth> {
  const epiasStatus = getEpiasConfigurationStatus();
  const accessStatus = getAccessConfigurationStatus();
  const mode: HealthMode = epiasStatus === "misconfigured"
    || accessStatus === "misconfigured"
    ? "misconfigured"
    : epiasStatus === "ready"
      ? "live"
      : "synthetic";

  return NextResponse.json(
    {
      status: mode === "misconfigured" ? "degraded" : "ok",
      service: "gridbrief-market-gateway",
      mode,
      timestamp: new Date().toISOString(),
    },
    {
      status: mode === "misconfigured" ? 503 : 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
