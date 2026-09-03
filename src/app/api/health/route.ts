import { NextResponse } from "next/server";

import { hasEpiasCredentials, type EpiasHealth } from "../../../lib/epias";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): NextResponse<EpiasHealth> {
  const configured = hasEpiasCredentials();
  return NextResponse.json(
    {
      status: "ok",
      service: "gridbrief-market-gateway",
      mode: configured ? "live" : "synthetic",
      epiasConfigured: configured,
      timestamp: new Date().toISOString(),
      checks: { credentials: configured ? "configured" : "missing" },
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

