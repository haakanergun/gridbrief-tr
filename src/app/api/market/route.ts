import { NextResponse } from "next/server";

import {
  GatewayError,
  getMarketSnapshot,
  parseMarketRequest,
  publicError,
} from "../../../lib/epias";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16_384;

export async function POST(request: Request): Promise<NextResponse> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Request body is too large." } },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new GatewayError("INVALID_REQUEST", "Request body must be valid JSON.", 400);
    }

    const marketRequest = parseMarketRequest(body);
    const snapshot = await getMarketSnapshot(marketRequest);
    return NextResponse.json(snapshot, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const normalized = publicError(error);
    return NextResponse.json(
      { error: { code: normalized.code, message: normalized.message } },
      { status: normalized.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

