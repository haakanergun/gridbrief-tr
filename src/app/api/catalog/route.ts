import { NextResponse } from "next/server";

import { getEpiasConfigurationStatus } from "../../../lib/epias/client";
import { GatewayError, publicError } from "../../../lib/epias/errors";
import { getAccessConfigurationStatus, isRequestAuthorized } from "../../../lib/server/access";
import { getElectricityCatalog } from "../../../lib/transparency/catalog";
import type {
  ElectricityCatalogErrorResponse,
  ElectricityCatalogResponse,
} from "../../../lib/transparency/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  Vary: "Authorization",
};

export async function GET(
  request: Request,
): Promise<NextResponse<ElectricityCatalogResponse | ElectricityCatalogErrorResponse>> {
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
    if (getEpiasConfigurationStatus() !== "ready") {
      throw new GatewayError(
        "GATEWAY_MISCONFIGURED",
        "The live EPİAŞ electricity catalog is not configured.",
        503,
      );
    }

    const catalog = await getElectricityCatalog();
    return NextResponse.json(catalog, { status: 200, headers: RESPONSE_HEADERS });
  } catch (error) {
    const normalized = publicError(error);
    return apiError(normalized.code, normalized.message, normalized.status);
  }
}

function apiError(
  code: string,
  message: string,
  status: number,
  headers: Record<string, string> = {},
): NextResponse<ElectricityCatalogErrorResponse> {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { ...RESPONSE_HEADERS, ...headers } },
  );
}
