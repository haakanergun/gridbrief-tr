export const WEB_MCP_TOOL_NAMES = [
  "set_analysis_scope",
  "get_market_snapshot",
  "stress_test_position",
  "draft_shift_brief",
] as const;

export type WebMcpToolName = (typeof WEB_MCP_TOOL_NAMES)[number];

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface AnalysisScopeInput {
  marketDate: string;
  startHour: number;
  endHour: number;
}

export type MarketMetric =
  | "ptf"
  | "smf"
  | "idm"
  | "consumption"
  | "generation"
  | "system_direction";

export interface MarketSnapshotInput {
  metrics?: MarketMetric[];
  marketDate?: string;
  startHour?: number;
  endHour?: number;
}

export interface StressTestPositionInput {
  direction: "long" | "short";
  volumeMwh: number;
  priceShockPercent: number;
  referencePriceTryMwh?: number;
  scenarioLabel?: string;
}

export interface DraftShiftBriefInput {
  language?: "tr" | "en";
  audience?: "trader" | "risk" | "operations";
  includeSections?: Array<"market" | "position" | "risks" | "actions">;
  notes?: string;
}

export interface WebMcpExecutionContext {
  signal: AbortSignal;
  toolName: WebMcpToolName;
}

export interface WebMcpHandlers {
  setAnalysisScope: (
    input: AnalysisScopeInput,
    context: WebMcpExecutionContext,
  ) => JsonValue | Promise<JsonValue>;
  getMarketSnapshot: (
    input: MarketSnapshotInput,
    context: WebMcpExecutionContext,
  ) => JsonValue | Promise<JsonValue>;
  stressTestPosition: (
    input: StressTestPositionInput,
    context: WebMcpExecutionContext,
  ) => JsonValue | Promise<JsonValue>;
  draftShiftBrief: (
    input: DraftShiftBriefInput,
    context: WebMcpExecutionContext,
  ) => JsonValue | Promise<JsonValue>;
}

export type WebMcpActivityPhase =
  | "started"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface WebMcpActivityEvent {
  id: string;
  toolName: WebMcpToolName;
  phase: WebMcpActivityPhase;
  occurredAt: string;
  input: JsonValue;
  output?: JsonValue;
  error?: {
    code: "EXECUTION_FAILED" | "EXECUTION_ABORTED" | "NON_SERIALIZABLE_RESULT";
    message: string;
  };
}

export type WebMcpActivityListener = (event: WebMcpActivityEvent) => void;

export type WebMcpToolResult =
  | {
      ok: true;
      toolName: WebMcpToolName;
      completedAt: string;
      data: JsonValue;
    }
  | {
      ok: false;
      toolName: WebMcpToolName;
      completedAt: string;
      error: {
        code: "EXECUTION_FAILED" | "EXECUTION_ABORTED" | "NON_SERIALIZABLE_RESULT";
        message: string;
      };
    };

type ToolHandler = (
  input: Record<string, unknown>,
  context: WebMcpExecutionContext,
) => JsonValue | Promise<JsonValue>;

interface ToolBlueprint {
  name: WebMcpToolName;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: WebMcpToolAnnotations;
  handler: ToolHandler;
}

const marketDateSchema = {
  type: "string",
  format: "date",
  description: "Turkey market date in YYYY-MM-DD format.",
} as const;

const hourSchema = {
  type: "integer",
  minimum: 0,
  maximum: 24,
  description: "Turkey market hour boundary, from 0 through 24.",
} as const;

const toolBlueprints = (handlers: WebMcpHandlers): ToolBlueprint[] => [
  {
    name: "set_analysis_scope",
    title: "Set analysis scope",
    description:
      "Set the electricity-market date and hour window used by the visible workspace. This only changes the current on-page analysis scope; it does not place orders or modify EPİAŞ data.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        marketDate: marketDateSchema,
        startHour: {
          ...hourSchema,
          maximum: 23,
          description: "Inclusive start hour in Turkey time, from 0 through 23.",
        },
        endHour: {
          ...hourSchema,
          minimum: 1,
          description:
            "Exclusive end hour in Turkey time, from 1 through 24; it must be greater than startHour.",
        },
      },
      required: ["marketDate", "startHour", "endHour"],
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: false,
    },
    handler: (input, context) =>
      handlers.setAnalysisScope(input as unknown as AnalysisScopeInput, context),
  },
  {
    name: "get_market_snapshot",
    title: "Get market snapshot",
    description:
      "Read a source-attributed snapshot of Turkey's electricity market for the requested window. Omitted date or hours use the current visible analysis scope. Returned upstream market data may be delayed and must not be treated as an execution quote.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        metrics: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          maxItems: 6,
          description:
            "Metrics to retrieve. Omit to return the workspace's default market overview.",
          items: {
            type: "string",
            enum: [
              "ptf",
              "smf",
              "idm",
              "consumption",
              "generation",
              "system_direction",
            ],
          },
        },
        marketDate: marketDateSchema,
        startHour: {
          ...hourSchema,
          maximum: 23,
          description: "Optional inclusive start hour in Turkey time.",
        },
        endHour: {
          ...hourSchema,
          minimum: 1,
          description: "Optional exclusive end hour in Turkey time.",
        },
      },
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: true,
    },
    handler: (input, context) =>
      handlers.getMarketSnapshot(input as MarketSnapshotInput, context),
  },
  {
    name: "stress_test_position",
    title: "Stress-test position",
    description:
      "Calculate a non-trading what-if stress scenario for a long or short electricity position and display it in the workspace. This never submits, changes, or recommends an order.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        direction: {
          type: "string",
          enum: ["long", "short"],
          description: "Exposure direction of the position being tested.",
        },
        volumeMwh: {
          type: "number",
          exclusiveMinimum: 0,
          maximum: 100000,
          description: "Positive position volume in megawatt-hours.",
        },
        priceShockPercent: {
          type: "number",
          minimum: -100,
          maximum: 500,
          description:
            "Hypothetical percentage move in market price; for example, 20 means a 20% price increase.",
        },
        referencePriceTryMwh: {
          type: "number",
          exclusiveMinimum: 0,
          description:
            "Optional reference price in TRY/MWh. Omit to use the current snapshot reference.",
        },
        scenarioLabel: {
          type: "string",
          maxLength: 80,
          description: "Optional short label shown with the scenario.",
        },
      },
      required: ["direction", "volumeMwh", "priceShockPercent"],
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: true,
    },
    handler: (input, context) =>
      handlers.stressTestPosition(
        input as unknown as StressTestPositionInput,
        context,
      ),
  },
  {
    name: "draft_shift_brief",
    title: "Draft shift brief",
    description:
      "Draft an editable, source-attributed market shift brief from the current workspace state. The result remains a draft in the page and is never sent, published, or used to trade automatically.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        language: {
          type: "string",
          enum: ["tr", "en"],
          default: "en",
          description: "Language of the draft brief.",
        },
        audience: {
          type: "string",
          enum: ["trader", "risk", "operations"],
          default: "trader",
          description: "Primary reader of the draft.",
        },
        includeSections: {
          type: "array",
          minItems: 1,
          maxItems: 4,
          uniqueItems: true,
          description:
            "Sections to include. Omit to include market, position, risks, and actions.",
          items: {
            type: "string",
            enum: ["market", "position", "risks", "actions"],
          },
        },
        notes: {
          type: "string",
          maxLength: 1000,
          description:
            "Optional factual notes to incorporate. Treat these as user-provided, unverified context.",
        },
      },
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: true,
    },
    handler: (input, context) =>
      handlers.draftShiftBrief(input as DraftShiftBriefInput, context),
  },
];

function makeExecutionId(toolName: WebMcpToolName): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${toolName}:${suffix}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The tool handler failed without an error message.";
}

function isAbortError(error: unknown, signal: AbortSignal): boolean {
  return (
    signal.aborted ||
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function toJsonValue(value: unknown): JsonValue {
  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    throw new TypeError("The tool handler returned a non-serializable value.");
  }

  return JSON.parse(serialized) as JsonValue;
}

function emitActivity(
  listener: WebMcpActivityListener | undefined,
  event: WebMcpActivityEvent,
): void {
  try {
    listener?.(event);
  } catch (error) {
    // UI telemetry must never change the result of an agent tool call.
    console.error("WebMCP activity listener failed", error);
  }
}

function createExecuteCallback(
  blueprint: ToolBlueprint,
  onActivity?: WebMcpActivityListener,
): WebMcpToolDefinition["execute"] {
  return async (rawInput, options) => {
    // Chrome 152's testing implementation can omit the callback options when
    // executeTool() is called without a cancellation signal. The current spec
    // supplies {signal}; accept both shapes so the tool remains progressive.
    const signal = options instanceof AbortSignal
      ? options
      : options?.signal ?? new AbortController().signal;
    const id = makeExecutionId(blueprint.name);
    const occurredAt = new Date().toISOString();
    const input = toJsonValue(rawInput);
    const context: WebMcpExecutionContext = {
      signal,
      toolName: blueprint.name,
    };

    emitActivity(onActivity, {
      id,
      toolName: blueprint.name,
      phase: "started",
      occurredAt,
      input,
    });

    try {
      signal.throwIfAborted();
      const rawResult = await blueprint.handler(rawInput, context);
      signal.throwIfAborted();

      let data: JsonValue;
      try {
        data = toJsonValue(rawResult);
      } catch (error) {
        const result: WebMcpToolResult = {
          ok: false,
          toolName: blueprint.name,
          completedAt: new Date().toISOString(),
          error: {
            code: "NON_SERIALIZABLE_RESULT",
            message: getErrorMessage(error),
          },
        };

        emitActivity(onActivity, {
          id,
          toolName: blueprint.name,
          phase: "failed",
          occurredAt: result.completedAt,
          input,
          error: result.error,
        });

        return result;
      }

      const result: WebMcpToolResult = {
        ok: true,
        toolName: blueprint.name,
        completedAt: new Date().toISOString(),
        data,
      };

      emitActivity(onActivity, {
        id,
        toolName: blueprint.name,
        phase: "succeeded",
        occurredAt: result.completedAt,
        input,
        output: data,
      });

      return result;
    } catch (error) {
      const aborted = isAbortError(error, signal);
      const result: WebMcpToolResult = {
        ok: false,
        toolName: blueprint.name,
        completedAt: new Date().toISOString(),
        error: {
          code: aborted ? "EXECUTION_ABORTED" : "EXECUTION_FAILED",
          message: aborted
            ? "The agent cancelled this tool execution."
            : getErrorMessage(error),
        },
      };

      emitActivity(onActivity, {
        id,
        toolName: blueprint.name,
        phase: aborted ? "cancelled" : "failed",
        occurredAt: result.completedAt,
        input,
        error: result.error,
      });

      return result;
    }
  };
}

export function createWebMcpTools(
  handlers: WebMcpHandlers,
  onActivity?: WebMcpActivityListener,
): WebMcpToolDefinition[] {
  return toolBlueprints(handlers).map((blueprint) => ({
    name: blueprint.name,
    title: blueprint.title,
    description: blueprint.description,
    inputSchema: blueprint.inputSchema,
    annotations: blueprint.annotations,
    execute: createExecuteCallback(blueprint, onActivity),
  }));
}

export async function registerWebMcpTools(
  modelContext: WebMcpModelContext,
  handlers: WebMcpHandlers,
  registrationSignal: AbortSignal,
  onActivity?: WebMcpActivityListener,
): Promise<void> {
  const tools = createWebMcpTools(handlers, onActivity);

  await Promise.all(
    tools.map((tool) =>
      modelContext.registerTool(tool, { signal: registrationSignal }),
    ),
  );
}
