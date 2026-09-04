import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getAccessConfigurationStatus,
  isLiveProductionMode,
  isRequestAuthorized,
  isSameOriginPost,
} from "./lib/server/access";
import { checkApiRateLimit } from "./lib/server/rate-limit";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export function proxy(request: NextRequest): NextResponse {
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/")
    || request.nextUrl.pathname === "/api";
  const accessStatus = getAccessConfigurationStatus();

  if (accessStatus === "misconfigured") {
    return errorResponse(
      isApiRequest,
      503,
      "SERVICE_UNAVAILABLE",
      "Service unavailable.",
    );
  }

  if (!isRequestAuthorized(request)) {
    const response = errorResponse(
      isApiRequest,
      401,
      "UNAUTHORIZED",
      "Authentication required.",
    );
    response.headers.set("WWW-Authenticate", 'Basic realm="GridBrief Live", charset="UTF-8"');
    return response;
  }

  if (isApiRequest && !isSameOriginPost(request)) {
    return errorResponse(
      true,
      403,
      "ORIGIN_REJECTED",
      "Same-origin request required.",
    );
  }

  const response = NextResponse.next();
  if (isApiRequest && isLiveProductionMode()) {
    const rateLimit = checkApiRateLimit(request.headers);
    for (const [name, value] of Object.entries(rateLimit.headers)) {
      response.headers.set(name, value);
    }
    if (!rateLimit.allowed) {
      return errorResponse(
        true,
        429,
        "RATE_LIMITED",
        "Too many requests. Try again later.",
        rateLimit.headers,
      );
    }
  }

  return response;
}

function errorResponse(
  json: boolean,
  status: number,
  code: string,
  message: string,
  headers: Record<string, string> = {},
): NextResponse {
  const responseHeaders = { ...NO_STORE_HEADERS, ...headers };
  if (json) {
    return NextResponse.json(
      { error: { code, message } },
      { status, headers: responseHeaders },
    );
  }
  return new NextResponse(message, { status, headers: responseHeaders });
}

export const config = {
  matcher: ["/", "/tr/:path*", "/en/:path*", "/api/:path*"],
};
