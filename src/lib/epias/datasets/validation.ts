import "server-only";

import { GatewayError } from "../errors";
import type {
  DatasetDefinition,
  DatasetParameterSpec,
} from "./registry";
import { getDatasetDefinition } from "./registry";
import type { DatasetFilterType, DatasetQueryScope } from "../../transparency/dataset-types";

const MAX_FILTERS = 16;
const MAX_STRING_LENGTH = 180;
const MAX_ARRAY_LENGTH = 100;
const MAX_RANGE_DAYS = 366;
const MAX_PAGE_NUMBER = 10_000;
const MAX_PAGE_SIZE = 500;
const ALLOWED_INPUT_KEYS = new Set([
  "datasetId",
  "startDate",
  "endDate",
  "date",
  "period",
  "filters",
  "page",
]);
const PUBLIC_DATE_FIELDS = ["startDate", "endDate", "date", "period"] as const;
type PublicDateField = (typeof PUBLIC_DATE_FIELDS)[number];

export interface ValidatedDatasetQuery {
  definition: DatasetDefinition;
  scope: DatasetQueryScope;
  requestBody: Record<string, unknown>;
}

export function parseDatasetQueryInput(value: unknown): ValidatedDatasetQuery {
  const input = record(value, "Request body must be a JSON object.");
  rejectUnknownKeys(input, ALLOWED_INPUT_KEYS, "request");

  const datasetId = requiredString(input.datasetId, "datasetId", 160);
  const definition = getDatasetDefinition(datasetId);
  if (!definition) {
    throw invalid("datasetId is not in the approved EPİAŞ dataset registry.");
  }

  const supportedDateFields = supportedPublicDateFields(definition);
  for (const field of PUBLIC_DATE_FIELDS) {
    if (Object.hasOwn(input, field) && !supportedDateFields.has(field)) {
      throw invalid(`${field} is not supported for ${datasetId}.`);
    }
  }

  const dateValues = {
    startDate: optionalDate(input.startDate, "startDate", "start"),
    endDate: optionalDate(input.endDate, "endDate", "end"),
    date: optionalDate(input.date, "date", "start"),
    period: optionalDate(input.period, "period", "start"),
  };
  validateRange(dateValues.startDate, dateValues.endDate);

  const filters = parseFilters(input.filters, definition);
  const page = parsePage(input.page);
  const scope: DatasetQueryScope = {
    ...defined(dateValues),
    filters,
    page,
  };

  const requestBody: Record<string, unknown> = {};
  for (const parameter of definition.parameters) {
    if (parameter.kind === "page") {
      requestBody.page = {
        number: page.number,
        size: page.size,
        sort: { direction: "ASC", field: "date" },
      };
      continue;
    }
    const parameterValue = valueForParameter(parameter, scope);
    if (parameterValue === undefined) {
      if (parameter.required) {
        throw invalid(`${publicParameterName(parameter.key)} is required for ${datasetId}.`);
      }
      continue;
    }
    requestBody[parameter.key] = parameterValue;
  }

  return { definition, scope, requestBody };
}

function supportedPublicDateFields(definition: DatasetDefinition): Set<PublicDateField> {
  const supported = new Set<PublicDateField>();
  for (const parameter of definition.parameters) {
    if (parameter.kind !== "date") continue;
    if (parameter.key === "periodStartDate") supported.add("startDate");
    else if (parameter.key === "periodEndDate") supported.add("endDate");
    else if (PUBLIC_DATE_FIELDS.includes(parameter.key as PublicDateField)) {
      supported.add(parameter.key as PublicDateField);
    }
  }
  return supported;
}

function parseFilters(
  value: unknown,
  definition: DatasetDefinition,
): Record<string, string | number | string[] | number[]> {
  if (value === undefined) value = {};
  const filters = record(value, "filters must be a JSON object.");
  const allowed = new Map(definition.availableFilters.map((filter) => [filter.key, filter]));
  if (Object.keys(filters).length > MAX_FILTERS) throw invalid("Too many filters were supplied.");
  rejectUnknownKeys(filters, new Set(allowed.keys()), "filters");

  const parsed: Record<string, string | number | string[] | number[]> = {};
  for (const capability of definition.availableFilters) {
    const candidate = filters[capability.key];
    if (candidate === undefined || candidate === null || candidate === "") {
      if (capability.required) {
        throw invalid(`filters.${capability.key} is required for ${definition.id}.`);
      }
      continue;
    }
    parsed[capability.key] = parseFilterValue(candidate, capability.type, capability.key);
  }
  return parsed;
}

function parseFilterValue(
  value: unknown,
  type: DatasetFilterType,
  key: string,
): string | number | string[] | number[] {
  if (type === "integer" || type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw invalid(`filters.${key} must be a finite number.`);
    }
    if (type === "integer" && (!Number.isSafeInteger(value) || value < 0)) {
      throw invalid(`filters.${key} must be a non-negative integer.`);
    }
    return value;
  }
  if (type === "string") return requiredString(value, `filters.${key}`, MAX_STRING_LENGTH);
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ARRAY_LENGTH) {
    throw invalid(`filters.${key} must contain 1-${MAX_ARRAY_LENGTH} values.`);
  }
  if (type === "integer[]") {
    if (!value.every((item) => Number.isSafeInteger(item) && (item as number) >= 0)) {
      throw invalid(`filters.${key} must contain only non-negative integers.`);
    }
    return [...new Set(value as number[])];
  }
  if (!value.every((item) => typeof item === "string" && item.trim().length > 0)) {
    throw invalid(`filters.${key} must contain only non-empty strings.`);
  }
  return [...new Set((value as string[]).map((item) => item.trim()))];
}

function parsePage(value: unknown): { number: number; size: number } {
  if (value === undefined) return { number: 1, size: 100 };
  const page = record(value, "page must be a JSON object.");
  rejectUnknownKeys(page, new Set(["number", "size"]), "page");
  const number = page.number ?? 1;
  const size = page.size ?? 100;
  if (!Number.isSafeInteger(number) || (number as number) < 1 || (number as number) > MAX_PAGE_NUMBER) {
    throw invalid(`page.number must be between 1 and ${MAX_PAGE_NUMBER}.`);
  }
  if (!Number.isSafeInteger(size) || (size as number) < 1 || (size as number) > MAX_PAGE_SIZE) {
    throw invalid(`page.size must be between 1 and ${MAX_PAGE_SIZE}.`);
  }
  return { number: number as number, size: size as number };
}

function valueForParameter(
  parameter: DatasetParameterSpec,
  scope: DatasetQueryScope,
): string | number | string[] | number[] | undefined {
  if (parameter.kind === "filter") return scope.filters[parameter.key];
  switch (parameter.key) {
    case "startDate":
    case "periodStartDate":
      return scope.startDate;
    case "endDate":
    case "periodEndDate":
      return scope.endDate;
    case "date":
      return scope.date;
    case "period":
      return scope.period;
    // Version dates are intentionally not exposed until a dedicated, bounded
    // version-window input is added. They are optional in the official DTO.
    case "versionStartDate":
    case "versionEndDate":
      return undefined;
    default:
      return undefined;
  }
}

function optionalDate(value: unknown, name: string, boundary: "start" | "end"): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw invalid(`${name} must be an ISO-8601 date.`);
  const trimmed = value.trim();
  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const normalized = dayMatch
    ? `${trimmed}T${boundary === "start" ? "00:00:00" : "23:59:59"}+03:00`
    : trimmed;
  const timestamp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?\+03:00$/.exec(normalized);
  if (!timestamp) {
    throw invalid(`${name} must be YYYY-MM-DD or an ISO-8601 timestamp with +03:00 offset.`);
  }
  const [, year, month, day, hour, minute, second] = timestamp.map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  const validDay = calendar.getUTCFullYear() === year
    && calendar.getUTCMonth() === month - 1
    && calendar.getUTCDate() === day;
  if (!validDay || hour > 23 || minute > 59 || second > 59 || !Number.isFinite(Date.parse(normalized))) {
    throw invalid(`${name} is not a valid date.`);
  }
  return normalized;
}

function validateRange(startDate?: string, endDate?: string): void {
  if (!startDate || !endDate) return;
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  if (end < start) throw invalid("endDate must not be earlier than startDate.");
  const days = (end - start) / 86_400_000;
  if (days > MAX_RANGE_DAYS) throw invalid(`Date range cannot exceed ${MAX_RANGE_DAYS} days.`);
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
): void {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length > 0) throw invalid(`${path} contains unsupported fields: ${unknown.join(", ")}.`);
}

function record(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw invalid(message);
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, name: string, maxLength: number): string {
  if (typeof value !== "string") throw invalid(`${name} must be a string.`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    throw invalid(`${name} must contain 1-${maxLength} characters.`);
  }
  return trimmed;
}

function defined<T extends Record<string, string | undefined>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== undefined)) as Partial<T>;
}

function publicParameterName(key: string): string {
  if (key === "periodStartDate") return "startDate";
  if (key === "periodEndDate") return "endDate";
  return key;
}

function invalid(message: string): GatewayError {
  return new GatewayError("INVALID_REQUEST", message, 400);
}
