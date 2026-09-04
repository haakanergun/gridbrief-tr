export type GatewayErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "GATEWAY_MISCONFIGURED"
  | "UPSTREAM_AUTH_FAILED"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_INVALID_RESPONSE";

export class GatewayError extends Error {
  constructor(
    public readonly code: GatewayErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

export function publicError(error: unknown): {
  code: GatewayErrorCode;
  message: string;
  status: number;
} {
  if (error instanceof GatewayError) {
    return { code: error.code, message: error.message, status: error.status };
  }

  return {
    code: "UPSTREAM_UNAVAILABLE",
    message: "Market data could not be loaded.",
    status: 502,
  };
}
