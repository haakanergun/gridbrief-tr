import { GatewayError } from "./errors";
import type { MarketRequest, PositionSide } from "./types";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function integerHour(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 23) {
    throw new GatewayError(
      "INVALID_REQUEST",
      `${field} must be an integer between 0 and 23.`,
      400,
    );
  }
  return value as number;
}

export function parseMarketRequest(value: unknown): MarketRequest {
  if (!isRecord(value)) {
    throw new GatewayError("INVALID_REQUEST", "Request body must be a JSON object.", 400);
  }

  if (typeof value.date !== "string" || !validCalendarDate(value.date)) {
    throw new GatewayError("INVALID_REQUEST", "date must use YYYY-MM-DD format.", 400);
  }

  const startHour = integerHour(value.startHour, "startHour");
  const endHour = integerHour(value.endHour, "endHour");
  if (startHour > endHour) {
    throw new GatewayError(
      "INVALID_REQUEST",
      "startHour must be less than or equal to endHour.",
      400,
    );
  }

  let positionMwh: number | undefined;
  if (value.positionMwh !== undefined) {
    if (
      typeof value.positionMwh !== "number" ||
      !Number.isFinite(value.positionMwh) ||
      value.positionMwh < 0 ||
      value.positionMwh > 1_000_000
    ) {
      throw new GatewayError(
        "INVALID_REQUEST",
        "positionMwh must be a finite number between 0 and 1000000.",
        400,
      );
    }
    positionMwh = value.positionMwh;
  }

  let side: PositionSide | undefined;
  if (value.side !== undefined) {
    if (value.side !== "long" && value.side !== "short") {
      throw new GatewayError("INVALID_REQUEST", "side must be long or short.", 400);
    }
    side = value.side;
  }

  if ((positionMwh === undefined) !== (side === undefined)) {
    throw new GatewayError(
      "INVALID_REQUEST",
      "positionMwh and side must be supplied together.",
      400,
    );
  }

  return { date: value.date, startHour, endHour, positionMwh, side };
}

