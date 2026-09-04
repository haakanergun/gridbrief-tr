import { NextResponse } from "next/server";

import { getEpiasConfigurationStatus } from "../../../lib/epias/client";
import { getDatasetCapabilities, queryDataset } from "../../../lib/epias/datasets/service";
import { parseDatasetQueryInput } from "../../../lib/epias/datasets/validation";
import { GatewayError, publicError } from "../../../lib/epias/errors";
import { getAccessConfigurationStatus, isRequestAuthorized, isSameOriginPost } from "../../../lib/server/access";
import { getElectricityCatalog } from "../../../lib/transparency/catalog";
import type {
  DatasetQueryErrorResponse,
  DatasetQueryResponse,
} from "../../../lib/transparency/dataset-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY_BYTES = 16_384;
const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  Vary: "Authorization",
};
const CAPABILITY_CACHE_MS = 10 * 60_000;
type CapabilityResponse = ReturnType<typeof getDatasetCapabilities>;
let capabilityCache: { value: CapabilityResponse; expiresAt: number } | null = null;
let pendingCapabilities: Promise<CapabilityResponse> | null = null;

export async function GET(request: Request): Promise<NextResponse> {
  try {
    authorize(request);
    requireLiveConfiguration();
    const capabilities = await loadCapabilities();
    return NextResponse.json(capabilities, {
      status: 200,
      headers: RESPONSE_HEADERS,
    });
  } catch (error) {
    const normalized = publicError(error);
    return apiError(normalized.code, normalized.message, normalized.status);
  }
}

async function loadCapabilities(): Promise<CapabilityResponse> {
  if (capabilityCache && capabilityCache.expiresAt > Date.now()) return capabilityCache.value;
  if (!pendingCapabilities) {
    pendingCapabilities = getElectricityCatalog()
      .then((catalog) => {
        const value = getDatasetCapabilities(catalog.root);
        capabilityCache = { value, expiresAt: Date.now() + CAPABILITY_CACHE_MS };
        return value;
      })
      .finally(() => {
        pendingCapabilities = null;
      });
  }
  return pendingCapabilities;
}

export async function POST(
  request: Request,
): Promise<NextResponse<DatasetQueryResponse | DatasetQueryErrorResponse>> {
  try {
    authorize(request);
    if (!isSameOriginPost(request)) {
      return apiError("ORIGIN_REJECTED", "Same-origin request required.", 403);
    }
    requireLiveConfiguration();
    validateContentLength(request.headers.get("content-length"));
    validateJsonContentType(request.headers.get("content-type"));
    const body = await readLimitedJsonBody(request);
    const parsed = parseDatasetQueryInput(body);
    const response = await queryDataset(parsed);
    return NextResponse.json(response, { status: 200, headers: RESPONSE_HEADERS });
  } catch (error) {
    const normalized = publicError(error);
    return apiError(normalized.code, normalized.message, normalized.status);
  }
}

function authorize(request: Request): void {
  const accessStatus = getAccessConfigurationStatus();
  if (accessStatus === "misconfigured") {
    throw new GatewayError("GATEWAY_MISCONFIGURED", "Service unavailable.", 503);
  }
  if (!isRequestAuthorized(request)) {
    throw new GatewayError("UNAUTHORIZED", "Authentication required.", 401);
  }
}

function requireLiveConfiguration(): void {
  if (getEpiasConfigurationStatus() !== "ready") {
    throw new GatewayError(
      "GATEWAY_MISCONFIGURED",
      "The live EPİAŞ dataset gateway is not configured.",
      503,
    );
  }
}

function validateContentLength(value: string | null): void {
  if (value === null) return;
  if (!/^\d+$/.test(value)) throw new GatewayError("INVALID_REQUEST", "Content-Length must be valid.", 400);
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
  if (!request.body) throw new GatewayError("INVALID_REQUEST", "Request body must be valid JSON.", 400);
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
): NextResponse<DatasetQueryErrorResponse> {
  return NextResponse.json(
    { error: { code, message } },
    {
      status,
      headers: {
        ...RESPONSE_HEADERS,
        ...(status === 401 ? { "WWW-Authenticate": 'Basic realm="GridBrief Live", charset="UTF-8"' } : {}),
      },
    },
  );
}
