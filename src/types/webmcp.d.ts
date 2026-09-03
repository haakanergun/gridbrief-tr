/**
 * Minimal WebMCP declarations for the current imperative API draft.
 *
 * The API is intentionally marked optional: browsers without WebMCP support
 * must continue to render the application normally.
 */
type WebMcpJsonPrimitive = string | number | boolean | null;

type WebMcpJsonValue =
  | WebMcpJsonPrimitive
  | WebMcpJsonValue[]
  | { [key: string]: WebMcpJsonValue };

interface WebMcpToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

interface WebMcpToolExecuteOptions {
  signal: AbortSignal;
}

interface WebMcpToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: WebMcpToolAnnotations;
  execute: (
    input: Record<string, unknown>,
    options: WebMcpToolExecuteOptions,
  ) => Promise<WebMcpJsonValue>;
}

interface WebMcpRegisterToolOptions {
  exposedTo?: string[];
  signal?: AbortSignal;
}

interface WebMcpRegisteredTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: string;
  annotations?: WebMcpToolAnnotations;
}

interface WebMcpGetToolOptions {
  fromOrigins?: string[];
}

interface WebMcpExecuteToolOptions {
  signal?: AbortSignal;
}

interface WebMcpModelContext extends EventTarget {
  registerTool(
    tool: WebMcpToolDefinition,
    options?: WebMcpRegisterToolOptions,
  ): Promise<void>;
  getTools(options?: WebMcpGetToolOptions): Promise<WebMcpRegisteredTool[]>;
  executeTool(
    tool: WebMcpRegisteredTool,
    input?: Record<string, unknown>,
    options?: WebMcpExecuteToolOptions,
  ): Promise<string>;
  ontoolchange: ((event: Event) => void) | null;
}

interface Document {
  readonly modelContext?: WebMcpModelContext;
}
