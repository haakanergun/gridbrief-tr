import type { ExplorerRequest } from "../explorer";
import { GatewayError } from "./errors";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MINIMUM_DATE = "2016-01-01";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return parsed.getUTCFullYear() === Number(match[1])
    && parsed.getUTCMonth() === Number(match[2]) - 1
    && parsed.getUTCDate() === Number(match[3]);
}

function tomorrowInIstanbul(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));
  return tomorrow.toISOString().slice(0, 10);
}

function parseDate(value: unknown): string {
  if (typeof value !== "string" || !validCalendarDate(value)) {
    throw new GatewayError("INVALID_REQUEST", "date must use YYYY-MM-DD format.", 400);
  }
  if (value < MINIMUM_DATE || value > tomorrowInIstanbul()) {
    throw new GatewayError(
      "INVALID_REQUEST",
      `date must be between ${MINIMUM_DATE} and tomorrow in Europe/Istanbul.`,
      400,
    );
  }
  return value;
}

function parseId(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new GatewayError("INVALID_REQUEST", `${field} must be a positive safe integer.`, 400);
  }
  return value as number;
}

function rejectUnknownKeys(value: Record<string, unknown>, allowed: string[]): void {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown) {
    throw new GatewayError("INVALID_REQUEST", `Unknown request field: ${unknown}.`, 400);
  }
}

export function parseExplorerRequest(value: unknown): ExplorerRequest {
  if (!isRecord(value)) {
    throw new GatewayError("INVALID_REQUEST", "Request body must be a JSON object.", 400);
  }
  const date = parseDate(value.date);

  if (value.view === "catalog") {
    rejectUnknownKeys(value, ["view", "date"]);
    return { view: "catalog", date };
  }
  if (value.view === "organization") {
    rejectUnknownKeys(value, ["view", "date", "organizationId"]);
    return { view: "organization", date, organizationId: parseId(value.organizationId, "organizationId") };
  }
  if (value.view === "plant") {
    rejectUnknownKeys(value, ["view", "date", "powerPlantId"]);
    return { view: "plant", date, powerPlantId: parseId(value.powerPlantId, "powerPlantId") };
  }
  if (value.view === "planning") {
    rejectUnknownKeys(value, ["view", "date", "organizationId", "uevcbId", "region"]);
    if (value.region !== undefined && value.region !== "TR1") {
      throw new GatewayError("INVALID_REQUEST", "region must be TR1 when supplied.", 400);
    }
    const organizationId = value.organizationId === undefined
      ? undefined
      : parseId(value.organizationId, "organizationId");
    const uevcbId = value.uevcbId === undefined
      ? undefined
      : parseId(value.uevcbId, "uevcbId");
    if (uevcbId !== undefined && organizationId === undefined) {
      throw new GatewayError(
        "INVALID_REQUEST",
        "organizationId is required when uevcbId is supplied.",
        400,
      );
    }
    return {
      view: "planning",
      date,
      ...(organizationId === undefined ? {} : { organizationId }),
      ...(uevcbId === undefined ? {} : { uevcbId }),
      ...(value.region === undefined ? {} : { region: "TR1" as const }),
    };
  }

  throw new GatewayError(
    "INVALID_REQUEST",
    "view must be catalog, organization, plant, or planning.",
    400,
  );
}
