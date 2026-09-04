"use client";

import { useEffect, useRef, useState } from "react";

import {
  WEB_MCP_TOOL_NAMES,
  registerWebMcpTools,
  type WebMcpActivityListener,
  type WebMcpHandlers,
  type WebMcpToolName,
} from "../lib/webmcp";

export type WebMcpRegistrationStatus =
  | "checking"
  | "unsupported"
  | "registering"
  | "ready"
  | "error";

export interface UseWebMcpOptions extends WebMcpHandlers {
  onActivity?: WebMcpActivityListener;
  enabled?: boolean;
}

export interface UseWebMcpResult {
  supported: boolean;
  registered: boolean;
  tools: readonly WebMcpToolName[];
  status: WebMcpRegistrationStatus;
  error: string | null;
}

function getRegistrationError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "WebMCP tools could not be registered.";
}

/**
 * Registers the app's imperative WebMCP tools for the lifetime of the page.
 *
 * Handlers and the activity listener are read through refs, so ordinary React
 * renders do not unregister and re-register the browser tools. Setting enabled
 * to false aborts the registration and removes the tools.
 */
export function useWebMcp({
  setAnalysisScope,
  getMarketSnapshot,
  findMarketEntities,
  comparePlanActual,
  stressTestPosition,
  draftShiftBrief,
  searchTransparencyDatasets,
  getTransparencyDataset,
  onActivity,
  enabled = true,
}: UseWebMcpOptions): UseWebMcpResult {
  const handlersRef = useRef<WebMcpHandlers>({
    setAnalysisScope,
    getMarketSnapshot,
    findMarketEntities,
    comparePlanActual,
    stressTestPosition,
    draftShiftBrief,
    searchTransparencyDatasets,
    getTransparencyDataset,
  });
  const onActivityRef = useRef(onActivity);
  const [status, setStatus] = useState<WebMcpRegistrationStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handlersRef.current = {
      setAnalysisScope,
      getMarketSnapshot,
      findMarketEntities,
      comparePlanActual,
      stressTestPosition,
      draftShiftBrief,
      searchTransparencyDatasets,
      getTransparencyDataset,
    };
    onActivityRef.current = onActivity;
  }, [
    onActivity,
    setAnalysisScope,
    getMarketSnapshot,
    findMarketEntities,
    comparePlanActual,
    stressTestPosition,
    draftShiftBrief,
    searchTransparencyDatasets,
    getTransparencyDataset,
  ]);

  useEffect(() => {
    let active = true;
    const updateState = (
      nextStatus: WebMcpRegistrationStatus,
      nextError: string | null,
    ) => {
      queueMicrotask(() => {
        if (active) {
          setStatus(nextStatus);
          setError(nextError);
        }
      });
    };

    if (!enabled) {
      updateState("unsupported", null);
      return () => {
        active = false;
      };
    }

    const modelContext = document.modelContext;
    if (!modelContext || typeof modelContext.registerTool !== "function") {
      updateState("unsupported", null);
      return () => {
        active = false;
      };
    }

    const registrationController = new AbortController();

    const handlerProxy: WebMcpHandlers = {
      setAnalysisScope: (input, context) =>
        handlersRef.current.setAnalysisScope(input, context),
      getMarketSnapshot: (input, context) =>
        handlersRef.current.getMarketSnapshot(input, context),
      findMarketEntities: (input, context) =>
        handlersRef.current.findMarketEntities(input, context),
      comparePlanActual: (input, context) =>
        handlersRef.current.comparePlanActual(input, context),
      stressTestPosition: (input, context) =>
        handlersRef.current.stressTestPosition(input, context),
      draftShiftBrief: (input, context) =>
        handlersRef.current.draftShiftBrief(input, context),
      searchTransparencyDatasets: (input, context) =>
        handlersRef.current.searchTransparencyDatasets(input, context),
      getTransparencyDataset: (input, context) =>
        handlersRef.current.getTransparencyDataset(input, context),
    };

    const activityProxy: WebMcpActivityListener = (event) =>
      onActivityRef.current?.(event);

    updateState("registering", null);

    void registerWebMcpTools(
      modelContext,
      handlerProxy,
      registrationController.signal,
      activityProxy,
    )
      .then(() => {
        if (active && !registrationController.signal.aborted) {
          updateState("ready", null);
        }
      })
      .catch((registrationError: unknown) => {
        if (active && !registrationController.signal.aborted) {
          // This also unregisters any tools that succeeded before a sibling
          // registration failed, avoiding a partially available tool surface.
          registrationController.abort();
          updateState("error", getRegistrationError(registrationError));
        }
      });

    return () => {
      active = false;
      registrationController.abort();
    };
  }, [enabled]);

  return {
    supported: status !== "checking" && status !== "unsupported",
    registered: status === "ready",
    tools: WEB_MCP_TOOL_NAMES,
    status,
    error,
  };
}
