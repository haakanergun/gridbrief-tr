import { NextResponse } from "next/server";

import {
  GatewayError,
  getEpiasConfigurationStatus,
  getMarketSnapshot,
  parseMarketRequest,
  publicError,
} from "../../../lib/epias";
import {
  getAccessConfigurationStatus,
  isRequestAuthorized,
  isSameOriginPost,
} from "../../../lib/server/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16_384;
const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const accessStatus = getAccessConfigurationStatus();
    if (accessStatus === "misconfigured") {
      return apiError("SERVICE_UNAVAILABLE", "Service unavailable.", 503);
    }
    if (!isRequestAuthorized(request)) {
      return apiError(
        "UNAUTHORIZED",
        "Authentication required.",
        401,
        { "WWW-Authenticate": 'Basic realm="GridBrief Live", charset="UTF-8"' },
      );
    }
    if (!isSameOriginPost(request)) {
      return apiError("ORIGIN_REJECTED", "Same-origin request required.", 403);
    }
    if (getEpiasConfigurationStatus() === "misconfigured") {
      throw new GatewayError(
        "GATEWAY_MISCONFIGURED",
        "The live market gateway is not configured.",
        503,
      );
    }

    validateContentLength(request.headers.get("content-length"));
    validateJsonContentType(request.headers.get("content-type"));
    const body = await readLimitedJsonBody(request);
    const marketRequest = parseMarketRequest(body);
    const snapshot = await getMarketSnapshot(marketRequest);
    return NextResponse.json(snapshot, {
      status: 200,
      headers: RESPONSE_HEADERS,
    });
  } catch (error) {
    const normalized = publicError(error);
    return apiError(normalized.code, normalized.message, normalized.status);
  }
}

function validateContentLength(value: string | null): void {
  if (value === null) return;
  if (!/^\d+$/.test(value)) {
    throw new GatewayError("INVALID_REQUEST", "Content-Length must be valid.", 400);
  }

  const length = Number(value);
  if (!Number.isSafeInteger(length) || length > MAX_BODY_BYTES) {
    throw new GatewayError("INVALID_REQUEST", "Request body is too large.", 413);
  }
}

function validateJsonContentType(value: string | null): void {
  const mediaType = value?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new GatewayError("INVALID_REQUEST", "Content-Type must be application/json.", 415);
  }
}

async function readLimitedJsonBody(request: Request): Promise<unknown> {
  if (!request.body) {
    throw new GatewayError("INVALID_REQUEST", "Request body must be valid JSON.", 400);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new GatewayError("INVALID_REQUEST", "Request body is too large.", 413);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new GatewayError("INVALID_REQUEST", "Request body must be valid UTF-8.", 400);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new GatewayError("INVALID_REQUEST", "Request body must be valid JSON.", 400);
  }
}

function apiError(
  code: string,
  message: string,
  status: number,
  headers: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { ...RESPONSE_HEADERS, ...headers } },
  );
}
