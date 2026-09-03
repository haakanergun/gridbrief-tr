import "server-only";

import { GatewayError } from "./errors";

const DEFAULT_AUTH_URL = "https://giris.epias.com.tr/cas/v1/tickets";
const API_ROOT = "https://seffaflik.epias.com.tr/electricity-service";
const TGT_LIFETIME_MS = 2 * 60 * 60 * 1_000;
const TGT_SAFETY_WINDOW_MS = 5 * 60 * 1_000;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_TICKET_ATTEMPTS = 2;
const MAX_TICKET_BYTES = 4_096;
const MAX_RETRY_AFTER_MS = 2_000;
const TRANSIENT_TICKET_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

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

function ticketRetryDelay(response?: Response): number {
  const retryAfterHeader = response?.headers.get("retry-after");
  if (retryAfterHeader !== undefined && retryAfterHeader !== null && retryAfterHeader.trim()) {
    const retryAfterSeconds = Number(retryAfterHeader);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
      return Math.min(retryAfterSeconds * 1_000, MAX_RETRY_AFTER_MS);
    }
  }

  return 300 + Math.floor(Math.random() * 501);
}

async function pauseBeforeTicketRetry(delayMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

interface TicketAttemptResult {
  status: number;
  retryDelayMs: number;
  ticket?: string;
}

async function requestTicketAttempt(
  authUrl: string,
  requestInit: RequestInit,
): Promise<TicketAttemptResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(authUrl, {
      ...requestInit,
      signal: controller.signal,
      cache: "no-store",
    });
    const retryDelayMs = ticketRetryDelay(response);

    if (response.status !== 201) {
      if (response.body) {
        await response.body.cancel().catch(() => undefined);
      }
      return { status: response.status, retryDelayMs };
    }

    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_TICKET_BYTES) {
      if (response.body) {
        await response.body.cancel().catch(() => undefined);
      }
      throw new GatewayError(
        "UPSTREAM_INVALID_RESPONSE",
        "EPİAŞ authentication returned an invalid response.",
        502,
      );
    }

    const ticket = (await response.text()).trim();
    if (
      !ticket.startsWith("TGT-")
      || ticket.length < 8
      || Buffer.byteLength(ticket, "utf8") > MAX_TICKET_BYTES
    ) {
      throw new GatewayError(
        "UPSTREAM_INVALID_RESPONSE",
        "EPİAŞ authentication returned an invalid response.",
        502,
      );
    }

    return { status: response.status, retryDelayMs, ticket };
  } catch (error) {
    if (error instanceof GatewayError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new GatewayError("UPSTREAM_TIMEOUT", "EPİAŞ request timed out.", 504);
    }
    throw new GatewayError(
      "UPSTREAM_UNAVAILABLE",
      "EPİAŞ authentication service is unavailable.",
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

async function requestNewTicket(): Promise<string> {
  const { username, password } = credentials();
  const form = new URLSearchParams({ username, password });
  const authUrl = process.env.EPTR_AUTH_URL?.trim() || DEFAULT_AUTH_URL;
  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      Accept: "text/plain",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  };

  for (let attempt = 1; attempt <= MAX_TICKET_ATTEMPTS; attempt += 1) {
    let result: TicketAttemptResult;
    try {
      result = await requestTicketAttempt(authUrl, requestInit);
    } catch (error) {
      const retryableTransport = error instanceof GatewayError
        && (error.code === "UPSTREAM_UNAVAILABLE" || error.code === "UPSTREAM_TIMEOUT");
      const canRetry = attempt < MAX_TICKET_ATTEMPTS
        && retryableTransport;

      if (!canRetry) {
        if (error instanceof GatewayError) throw error;
        throw new GatewayError(
          "UPSTREAM_UNAVAILABLE",
          "EPİAŞ authentication service is unavailable.",
          502,
        );
      }

      await pauseBeforeTicketRetry(ticketRetryDelay());
      continue;
    }

    if (result.status === 201 && result.ticket) {
      cachedTicket = { value: result.ticket, expiresAt: Date.now() + TGT_LIFETIME_MS };
      return result.ticket;
    }

    if (
      attempt < MAX_TICKET_ATTEMPTS
      && TRANSIENT_TICKET_STATUSES.has(result.status)
    ) {
      await pauseBeforeTicketRetry(result.retryDelayMs);
      continue;
    }

    // Deliberately do not include the upstream body: it may echo account details.
    const authenticationRejected = result.status === 401 || result.status === 403;
    throw new GatewayError(
      authenticationRejected ? "UPSTREAM_AUTH_FAILED" : "UPSTREAM_UNAVAILABLE",
      authenticationRejected
        ? "EPİAŞ authentication was rejected."
        : "EPİAŞ authentication service is unavailable.",
      502,
    );
  }

  throw new GatewayError(
    "UPSTREAM_UNAVAILABLE",
    "EPİAŞ authentication service is unavailable.",
    502,
  );
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

export async function ensureEpiasTicket(): Promise<void> {
  await getTicket();
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
