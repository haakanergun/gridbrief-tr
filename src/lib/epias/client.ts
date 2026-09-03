import "server-only";

import { GatewayError } from "./errors";

const DEFAULT_AUTH_URL = "https://cas.epias.com.tr/cas/v1/tickets";
const API_ROOT = "https://seffaflik.epias.com.tr/electricity-service";
const TGT_LIFETIME_MS = 2 * 60 * 60 * 1_000;
const TGT_SAFETY_WINDOW_MS = 5 * 60 * 1_000;
const REQUEST_TIMEOUT_MS = 8_000;

export type EpiasConfigurationStatus = "disabled" | "ready" | "misconfigured";

interface CachedTicket {
  value: string;
  expiresAt: number;
}

let cachedTicket: CachedTicket | null = null;
let pendingTicket: Promise<string> | null = null;

export function hasEpiasCredentials(): boolean {
  return getEpiasConfigurationStatus() === "ready";
}

export function getEpiasConfigurationStatus(): EpiasConfigurationStatus {
  if (process.env.EPTR_LIVE_ENABLED !== "true") return "disabled";

  const hasUsername = Boolean(process.env.EPTR_USERNAME?.trim());
  const hasPassword = Boolean(process.env.EPTR_PASSWORD);
  return hasUsername && hasPassword ? "ready" : "misconfigured";
}

function credentials(): { username: string; password: string } {
  const username = process.env.EPTR_USERNAME?.trim();
  const password = process.env.EPTR_PASSWORD;

  if (!username || !password) {
    throw new GatewayError(
      "GATEWAY_MISCONFIGURED",
      "Live EPİAŞ access is enabled but its server credentials are incomplete.",
      503,
    );
  }

  return { username, password };
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal, cache: "no-store" });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new GatewayError("UPSTREAM_TIMEOUT", "EPİAŞ request timed out.", 504);
    }
    throw new GatewayError("UPSTREAM_UNAVAILABLE", "EPİAŞ service is unavailable.", 502);
  } finally {
    clearTimeout(timer);
  }
}

async function requestNewTicket(): Promise<string> {
  const { username, password } = credentials();
  const form = new URLSearchParams({ username, password });
  const authUrl = process.env.EPTR_AUTH_URL?.trim() || DEFAULT_AUTH_URL;
  const response = await fetchWithTimeout(authUrl, {
    method: "POST",
    headers: {
      Accept: "text/plain",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (response.status !== 201) {
    // Deliberately do not include the upstream body: it may echo account details.
    throw new GatewayError(
      "UPSTREAM_AUTH_FAILED",
      "EPİAŞ authentication was rejected.",
      502,
    );
  }

  const ticket = (await response.text()).trim();
  if (!ticket.startsWith("TGT-") || ticket.length < 8 || ticket.length > 4_096) {
    throw new GatewayError(
      "UPSTREAM_INVALID_RESPONSE",
      "EPİAŞ authentication returned an invalid response.",
      502,
    );
  }

  cachedTicket = { value: ticket, expiresAt: Date.now() + TGT_LIFETIME_MS };
  return ticket;
}

async function getTicket(): Promise<string> {
  if (cachedTicket && cachedTicket.expiresAt - TGT_SAFETY_WINDOW_MS > Date.now()) {
    return cachedTicket.value;
  }

  if (!pendingTicket) {
    pendingTicket = requestNewTicket().finally(() => {
      pendingTicket = null;
    });
  }

  return pendingTicket;
}

function clearTicket(): void {
  cachedTicket = null;
}

export async function fetchEpiasItems(
  path: string,
  requestBody: Record<string, unknown>,
  retryAuth = true,
): Promise<Record<string, unknown>[]> {
  const ticket = await getTicket();
  const response = await fetchWithTimeout(`${API_ROOT}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      TGT: ticket,
    },
    body: JSON.stringify(requestBody),
  });

  if ((response.status === 401 || response.status === 403) && retryAuth) {
    clearTicket();
    return fetchEpiasItems(path, requestBody, false);
  }

  if (!response.ok) {
    throw new GatewayError(
      response.status === 401 || response.status === 403
        ? "UPSTREAM_AUTH_FAILED"
        : "UPSTREAM_UNAVAILABLE",
      response.status === 401 || response.status === 403
        ? "EPİAŞ authorization failed."
        : "An EPİAŞ market data endpoint failed.",
      502,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GatewayError(
      "UPSTREAM_INVALID_RESPONSE",
      "EPİAŞ returned malformed JSON.",
      502,
    );
  }

  if (typeof payload !== "object" || payload === null) {
    throw new GatewayError(
      "UPSTREAM_INVALID_RESPONSE",
      "EPİAŞ returned an invalid market data response.",
      502,
    );
  }

  const items = (payload as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    throw new GatewayError(
      "UPSTREAM_INVALID_RESPONSE",
      "EPİAŞ response did not contain a data series.",
      502,
    );
  }

  return items.filter(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null && !Array.isArray(item),
  );
}
