import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

export type AccessConfigurationStatus = "not-required" | "ready" | "misconfigured";

const BASIC_SCHEME = "Basic";
const MAX_AUTHORIZATION_BYTES = 4_096;

export function isLiveProductionMode(): boolean {
  return process.env.NODE_ENV === "production"
    && process.env.EPTR_LIVE_ENABLED === "true";
}

export function getAccessConfigurationStatus(): AccessConfigurationStatus {
  if (!isLiveProductionMode()) return "not-required";

  const username = process.env.GRIDBRIEF_ACCESS_USERNAME;
  const password = process.env.GRIDBRIEF_ACCESS_PASSWORD;
  if (
    !hasNonWhitespaceValue(username)
    || !hasNonWhitespaceValue(password)
    || username.includes(":")
  ) {
    return "misconfigured";
  }

  return "ready";
}

export function isRequestAuthorized(request: Pick<Request, "headers">): boolean {
  const configuration = getAccessConfigurationStatus();
  if (configuration === "not-required") return true;
  if (configuration !== "ready") return false;

  const supplied = decodeBasicAuthorization(request.headers.get("authorization"));
  if (!supplied) return false;

  return secretsMatch(supplied.username, process.env.GRIDBRIEF_ACCESS_USERNAME ?? "")
    && secretsMatch(supplied.password, process.env.GRIDBRIEF_ACCESS_PASSWORD ?? "");
}

export function isSameOriginPost(request: Pick<Request, "headers" | "method" | "url">): boolean {
  if (request.method.toUpperCase() !== "POST") return true;
  if (process.env.NODE_ENV !== "production") return true;
  try {
    const hostname = new URL(request.url).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") return true;
  } catch {
    return false;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;

  const origin = request.headers.get("origin");
  // Browser-embedded local previews can omit Origin on a same-origin fetch.
  // Sec-Fetch-Site is a forbidden request header, so an explicit same-origin
  // value remains a trustworthy browser signal when Origin is absent.
  if (!origin || origin === "null") return fetchSite === "same-origin";

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function hasNonWhitespaceValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function decodeBasicAuthorization(
  authorization: string | null,
): { username: string; password: string } | null {
  if (!authorization || Buffer.byteLength(authorization, "utf8") > MAX_AUTHORIZATION_BYTES) {
    return null;
  }

  const separator = authorization.indexOf(" ");
  if (separator <= 0 || authorization.slice(0, separator) !== BASIC_SCHEME) return null;

  const encoded = authorization.slice(separator + 1);
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;

  let decodedBytes: Buffer;
  try {
    decodedBytes = Buffer.from(encoded, "base64");
  } catch {
    return null;
  }

  const normalizedInput = encoded.replace(/=+$/, "");
  const normalizedRoundTrip = decodedBytes.toString("base64").replace(/=+$/, "");
  if (normalizedInput !== normalizedRoundTrip) return null;

  const decoded = decodedBytes.toString("utf8");
  if (!Buffer.from(decoded, "utf8").equals(decodedBytes)) return null;

  const credentialSeparator = decoded.indexOf(":");
  if (credentialSeparator < 0) return null;

  return {
    username: decoded.slice(0, credentialSeparator),
    password: decoded.slice(credentialSeparator + 1),
  };
}

function secretsMatch(actual: string, expected: string): boolean {
  const actualDigest = createHash("sha256").update(actual, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}
