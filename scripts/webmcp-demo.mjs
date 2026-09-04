#!/usr/bin/env node

/**
 * GridBrief TR native WebMCP sample-agent workflow.
 *
 * This script talks directly to Chrome DevTools Protocol (CDP). It does not
 * emulate document.modelContext and it does not call the application's HTTP
 * routes in place of WebMCP. Chrome must expose the page-defined tools.
 *
 * No credential flag is supported. For a protected deployment, authenticate
 * in the headed Chrome window while the script waits. EPİAŞ credentials stay
 * on the GridBrief server and are never available to this process.
 */

import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, resolve, sep } from "node:path";
import process from "node:process";

const EXPECTED_TOOL_NAMES = [
  "set_analysis_scope",
  "get_market_snapshot",
  "find_market_entities",
  "compare_plan_actual",
  "stress_test_position",
  "draft_shift_brief",
  "search_transparency_datasets",
  "get_transparency_dataset",
];

const DEFAULT_DATASET_ID = "markets.dam.mcp";
const DEFAULT_DATASET_QUERY = "Piyasa Takas Fiyatı";
const DEFAULT_URL = "http://127.0.0.1:3000/en";
const DEFAULT_OUTPUT_DIR = "output/webmcp-demo";
const DEFAULT_CDP_PORT = 9222;
const DEFAULT_WAIT_MS = 120_000;
const MAX_ARRAY_ITEMS = 48;
const MAX_OBJECT_KEYS = 120;
const MAX_STRING_LENGTH = 2_000;
const SENSITIVE_KEY = /(?:authorization|cookie|credential|email|password|secret|session|tgt|token)/i;

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();

    socket.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (!message.id) return;
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) {
        request.reject(new Error(`CDP ${request.method} failed: ${message.error.message}`));
      } else {
        request.resolve(message.result ?? {});
      }
    });

    socket.addEventListener("close", () => {
      for (const request of this.pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error(`CDP connection closed during ${request.method}.`));
      }
      this.pending.clear();
    });
  }

  static async connect(webSocketDebuggerUrl, timeoutMs = 15_000) {
    const socket = new WebSocket(webSocketDebuggerUrl);
    await new Promise((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => {
        socket.close();
        rejectPromise(new Error("Timed out while connecting to Chrome DevTools Protocol."));
      }, timeoutMs);
      socket.addEventListener("open", () => {
        clearTimeout(timer);
        resolvePromise();
      }, { once: true });
      socket.addEventListener("error", () => {
        clearTimeout(timer);
        rejectPromise(new Error("Could not connect to Chrome DevTools Protocol."));
      }, { once: true });
    });
    return new CdpClient(socket);
  }

  call(method, params = {}, timeoutMs = 120_000) {
    const id = this.nextId++;
    return new Promise((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rejectPromise(new Error(`Timed out waiting for CDP ${method}.`));
      }, timeoutMs);
      this.pending.set(id, { method, resolve: resolvePromise, reject: rejectPromise, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.close();
  }
}

function printHelp() {
  console.log(`GridBrief TR native WebMCP sample-agent workflow

Usage:
  node scripts/webmcp-demo.mjs [options]

Typical live local run (start GridBrief in live mode first):
  node scripts/webmcp-demo.mjs --url http://127.0.0.1:3000/en --with-brief

Connect to a Chrome 152 instance you launched yourself:
  chrome.exe --remote-debugging-port=9222 --enable-features=WebMCP --user-data-dir=C:\\Temp\\gridbrief-webmcp
  node scripts/webmcp-demo.mjs --attach --url https://gridbrief-tr.vercel.app/en

Options:
  --url <url>               GridBrief page (${DEFAULT_URL})
  --date <YYYY-MM-DD>       Completed market day (default: yesterday in Istanbul)
  --dataset-id <id>         Allowlisted dataset (${DEFAULT_DATASET_ID})
  --dataset-query <text>    Catalogue search (${DEFAULT_DATASET_QUERY})
  --output-dir <path>       Sanitized evidence and screenshots (${DEFAULT_OUTPUT_DIR})
  --cdp-port <port>         Loopback CDP port (${DEFAULT_CDP_PORT})
  --chrome <path>           Chrome 152 executable; auto-detected on Windows
  --attach                  Connect to an existing CDP browser; do not launch/close it
  --with-brief              After verified live market data, run local what-if and draft tools
  --keep-open               Leave a script-launched browser open after a successful run
  --wait-ms <milliseconds>  Wait for login/app/WebMCP readiness (${DEFAULT_WAIT_MS})
  --allow-other-chrome      Permit a Chrome major version other than 152
  --help                    Show this help

Security:
  The CLI intentionally accepts no username, password, token, cookie, or auth
  header. Authenticate only in the headed browser. Evidence is recursively
  sanitized and bounded before it is written.`);
}

function parseArgs(argv) {
  const options = {
    url: DEFAULT_URL,
    date: previousIstanbulDate(),
    datasetId: DEFAULT_DATASET_ID,
    datasetQuery: DEFAULT_DATASET_QUERY,
    outputDir: DEFAULT_OUTPUT_DIR,
    cdpPort: DEFAULT_CDP_PORT,
    chromePath: null,
    attach: false,
    withBrief: false,
    keepOpen: false,
    waitMs: DEFAULT_WAIT_MS,
    allowOtherChrome: false,
    help: false,
  };

  const valueFlags = new Map([
    ["--url", "url"],
    ["--date", "date"],
    ["--dataset-id", "datasetId"],
    ["--dataset-query", "datasetQuery"],
    ["--output-dir", "outputDir"],
    ["--cdp-port", "cdpPort"],
    ["--chrome", "chromePath"],
    ["--wait-ms", "waitMs"],
  ]);
  const booleanFlags = new Map([
    ["--attach", "attach"],
    ["--with-brief", "withBrief"],
    ["--keep-open", "keepOpen"],
    ["--allow-other-chrome", "allowOtherChrome"],
    ["--help", "help"],
    ["-h", "help"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (booleanFlags.has(argument)) {
      options[booleanFlags.get(argument)] = true;
      continue;
    }
    const optionName = valueFlags.get(argument);
    if (!optionName) throw new Error(`Unknown option: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
    options[optionName] = value;
    index += 1;
  }

  options.cdpPort = parseBoundedInteger(options.cdpPort, "--cdp-port", 1024, 65_535);
  options.waitMs = parseBoundedInteger(options.waitMs, "--wait-ms", 5_000, 600_000);
  validateIsoDay(options.date, "--date");
  options.url = validatePublicPageUrl(options.url);
  if (!String(options.datasetId).trim()) throw new Error("--dataset-id cannot be empty.");
  if (!String(options.datasetQuery).trim()) throw new Error("--dataset-query cannot be empty.");
  options.outputDir = resolve(String(options.outputDir));
  return options;
}

function parseBoundedInteger(value, name, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} through ${maximum}.`);
  }
  return parsed;
}

function validateIsoDay(value, name) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) throw new Error(`${name} must use YYYY-MM-DD.`);
  const candidate = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (
    candidate.getUTCFullYear() !== Number(match[1])
    || candidate.getUTCMonth() !== Number(match[2]) - 1
    || candidate.getUTCDate() !== Number(match[3])
  ) {
    throw new Error(`${name} is not a real calendar date.`);
  }
}

function validatePublicPageUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value));
  } catch {
    throw new Error("--url must be an absolute HTTP(S) URL.");
  }
  if (!(["http:", "https:"].includes(parsed.protocol))) {
    throw new Error("--url must use HTTP or HTTPS.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Credentials in --url are forbidden. Authenticate in the headed browser.");
  }
  parsed.hash = "";
  return parsed.toString();
}

function previousIstanbulDate(now = new Date()) {
  const completed = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Istanbul",
  }).formatToParts(completed);
  const value = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

async function findChrome(explicitPath) {
  const candidates = explicitPath
    ? [explicitPath]
    : process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          process.env.LOCALAPPDATA
            ? join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
            : null,
        ]
      : process.platform === "darwin"
        ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
        : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"];

  for (const candidate of candidates.filter(Boolean)) {
    const resolved = isAbsolute(candidate) ? candidate : resolve(candidate);
    try {
      await access(resolved, fsConstants.X_OK);
      return resolved;
    } catch {
      // Continue to the next known location.
    }
  }
  throw new Error("Chrome was not found. Pass its path with --chrome.");
}

async function fetchJson(url, timeoutMs = 2_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function waitForCdp(port, timeoutMs) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      return await fetchJson(endpoint, 1_500);
    } catch {
      await delay(250);
    }
  }
  throw new Error(`Chrome CDP did not become available on 127.0.0.1:${port}.`);
}

async function assertPortNotAlreadyCdp(port) {
  try {
    await fetchJson(`http://127.0.0.1:${port}/json/version`, 800);
  } catch {
    return;
  }
  throw new Error(`CDP port ${port} is already active. Use --attach only if that browser is intended.`);
}

async function launchChrome(options) {
  await assertPortNotAlreadyCdp(options.cdpPort);
  const chromePath = await findChrome(options.chromePath);
  const profileDir = await mkdtemp(join(tmpdir(), "gridbrief-webmcp-"));
  const chromeArguments = [
    `--remote-debugging-port=${options.cdpPort}`,
    "--remote-debugging-address=127.0.0.1",
    "--remote-allow-origins=*",
    "--enable-features=WebMCP",
    `--user-data-dir=${profileDir}`,
    "--window-size=1600,1000",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-sync",
    options.url,
  ];
  const child = spawn(chromePath, chromeArguments, {
    detached: false,
    shell: false,
    stdio: "ignore",
    windowsHide: false,
  });
  child.once("error", () => undefined);
  return { child, profileDir };
}

async function findPageTarget(port, pageUrl, timeoutMs) {
  const targetUrl = new URL(pageUrl);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let targets = [];
    try {
      targets = await fetchJson(`http://127.0.0.1:${port}/json/list`, 2_000);
    } catch {
      await delay(250);
      continue;
    }
    const pages = targets.filter((target) => target.type === "page" && target.webSocketDebuggerUrl);
    const exact = pages.find((target) => {
      try {
        const candidate = new URL(target.url);
        return candidate.origin === targetUrl.origin && candidate.pathname === targetUrl.pathname;
      } catch {
        return false;
      }
    });
    if (exact) return exact;
    const sameOrigin = pages.find((target) => {
      try {
        return new URL(target.url).origin === targetUrl.origin;
      } catch {
        return false;
      }
    });
    if (sameOrigin) return sameOrigin;
    await delay(250);
  }
  throw new Error("Could not find the GridBrief page target in Chrome.");
}

async function evaluate(client, expression, timeoutMs = 120_000) {
  const response = await client.call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  }, timeoutMs);
  if (response.exceptionDetails) {
    const description = response.exceptionDetails.exception?.description
      ?? response.exceptionDetails.text
      ?? "Page evaluation failed.";
    throw new Error(String(description).split("\n")[0]);
  }
  return response.result?.value;
}

async function waitForWebMcp(client, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let announcedWait = false;
  while (Date.now() < deadline) {
    const state = await evaluate(client, `(() => ({
      readyState: document.readyState,
      url: location.href,
      hasModelContext: Boolean(document.modelContext),
      canGetTools: typeof document.modelContext?.getTools === "function"
    }))()`);
    if (state?.canGetTools) {
      const tools = await discoverTools(client);
      if (tools.length) return tools;
    }
    if (!announcedWait && Date.now() + 10_000 < deadline) {
      console.log("Waiting for the page, login, and native WebMCP registrations in headed Chrome...");
      announcedWait = true;
    }
    await delay(500);
  }
  throw new Error(
    "Native document.modelContext tools were not available before timeout. "
    + "Confirm Chrome 152 was launched with --enable-features=WebMCP and complete any browser login.",
  );
}

async function discoverTools(client) {
  return await evaluate(client, `(async () => {
    const tools = await document.modelContext.getTools();
    return tools.map((tool) => ({
      name: tool.name,
      title: tool.title ?? null,
      description: tool.description,
      annotations: tool.annotations ?? null
    }));
  })()`);
}

async function executeTool(client, name, input) {
  const nameLiteral = JSON.stringify(name);
  // Chrome 152's native producer-side API accepts the descriptor returned by
  // getTools() plus JSON-stringified arguments. Passing an object produces
  // `UnknownError: Failed to parse input arguments` in the native runtime.
  const inputJsonLiteral = JSON.stringify(JSON.stringify(input)).replace(/[\u2028\u2029]/g, "");
  const result = await evaluate(client, `(async () => {
    const tools = await document.modelContext.getTools();
    const tool = tools.find((candidate) => candidate.name === ${nameLiteral});
    if (!tool) throw new Error("Required WebMCP tool is not registered: " + ${nameLiteral});
    const serialized = await document.modelContext.executeTool(tool, ${inputJsonLiteral});
    if (typeof serialized !== "string") return serialized;
    try { return JSON.parse(serialized); }
    catch { throw new Error("WebMCP tool returned non-JSON output."); }
  })()`, 180_000);
  if (!result || result.ok !== true || result.toolName !== name) {
    const message = result?.error?.message ?? "Tool returned an unsuccessful result.";
    throw new Error(`${name}: ${message}`);
  }
  return result;
}

async function executeToolWithOneRetry(client, name, input) {
  try {
    return { result: await executeTool(client, name, input), attempts: 1 };
  } catch (firstError) {
    console.log(`${name} did not complete; waiting briefly before one bounded retry...`);
    await delay(1_500);
    try {
      return { result: await executeTool(client, name, input), attempts: 2 };
    } catch (secondError) {
      const firstMessage = firstError instanceof Error ? firstError.message : "unknown first failure";
      const secondMessage = secondError instanceof Error ? secondError.message : "unknown second failure";
      throw new Error(`${name} failed twice (${firstMessage}; retry: ${secondMessage}).`);
    }
  }
}

function assertExpectedTools(tools) {
  const names = new Set(tools.map((tool) => tool.name));
  const missing = EXPECTED_TOOL_NAMES.filter((name) => !names.has(name));
  if (missing.length) throw new Error(`Missing WebMCP registrations: ${missing.join(", ")}`);
  if (names.size !== tools.length) throw new Error("WebMCP discovery returned duplicate tool names.");
}

function validateLiveDataset(toolResult, expectedDatasetId) {
  const data = toolResult.data;
  const result = data?.result;
  const source = result?.source;
  if (data?.status !== "dataset_displayed") {
    throw new Error("The live dataset completed but was not rendered in the visible workspace.");
  }
  if (data?.datasetId !== expectedDatasetId || result?.dataset?.id !== expectedDatasetId) {
    throw new Error("The returned dataset does not match the selected allowlisted dataset.");
  }
  if (!String(source?.provider ?? "").includes("EPİAŞ") || !isIsoTimestamp(source?.retrievedAt)) {
    throw new Error("The dataset lacks visible EPİAŞ provider and retrievedAt provenance.");
  }
  if (!Number.isSafeInteger(result?.quality?.rowCount) || result.quality.rowCount < 1) {
    throw new Error("The selected completed day returned no rows; choose another historical date.");
  }
  return {
    provider: source.provider,
    retrievedAt: source.retrievedAt,
    service: source.service,
    upstreamVersion: source.upstreamVersion,
    quality: result.quality,
  };
}

function validateLiveSnapshot(toolResult) {
  const data = toolResult.data;
  const source = data?.source;
  if (data?.status !== "snapshot_ready") throw new Error("Market snapshot did not complete successfully.");
  if (source?.mode !== "live" || !String(source?.provider ?? "").includes("EPİAŞ")) {
    throw new Error("Refusing scenario tools because the market snapshot is not labelled live EPİAŞ.");
  }
  if (!isIsoTimestamp(source?.fetchedAt)) {
    throw new Error("Refusing scenario tools because the market snapshot lacks fetchedAt provenance.");
  }
  const hasReferencePrice = Array.isArray(data.observations)
    && data.observations.some((observation) => Number.isFinite(observation?.ptf));
  if (!hasReferencePrice) {
    throw new Error("Refusing scenario tools because the verified snapshot contains no numeric PTF reference.");
  }
  return { provider: source.provider, fetchedAt: source.fetchedAt, mode: source.mode };
}

function isIsoTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

async function screenshot(client, outputPath) {
  await delay(750);
  const capture = await client.call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true,
  });
  await writeFile(outputPath, Buffer.from(capture.data, "base64"));
}

function sanitize(value, key = "", depth = 0) {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") {
    let safe = stripUrlCredentials(value);
    if (safe.length > MAX_STRING_LENGTH) safe = `${safe.slice(0, MAX_STRING_LENGTH)}…[truncated]`;
    return safe;
  }
  if (Array.isArray(value)) {
    const safe = value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitize(item, key, depth + 1));
    if (value.length > MAX_ARRAY_ITEMS) safe.push(`[${value.length - MAX_ARRAY_ITEMS} items omitted]`);
    return safe;
  }
  if (typeof value === "object" && depth < 12) {
    const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);
    const safe = Object.fromEntries(entries.map(([entryKey, entryValue]) => [
      entryKey,
      sanitize(entryValue, entryKey, depth + 1),
    ]));
    if (Object.keys(value).length > MAX_OBJECT_KEYS) safe.__omittedKeys = Object.keys(value).length - MAX_OBJECT_KEYS;
    return safe;
  }
  return "[UNSERIALIZABLE]";
}

function stripUrlCredentials(value) {
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) {
      parsed.username = "";
      parsed.password = "";
    }
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "[REDACTED URL]";
  }
}

function safePageIdentity(pageUrl) {
  const parsed = new URL(pageUrl);
  return { origin: parsed.origin, pathname: parsed.pathname };
}

async function writeEvidence(path, evidence) {
  await writeFile(path, `${JSON.stringify(sanitize(evidence), null, 2)}\n`, "utf8");
}

async function removeEphemeralProfile(profileDir) {
  if (!profileDir) return;
  const temporaryRoot = resolve(tmpdir());
  const resolvedProfile = resolve(profileDir);
  const expectedPrefix = `${temporaryRoot}${sep}`;
  if (!resolvedProfile.startsWith(expectedPrefix) || !basename(resolvedProfile).startsWith("gridbrief-webmcp-")) {
    throw new Error("Refusing to remove an unexpected Chrome profile path.");
  }
  await rm(resolvedProfile, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
}

async function delay(milliseconds) {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  await mkdir(options.outputDir, { recursive: true });
  const evidencePath = join(options.outputDir, "evidence.json");
  const evidence = {
    schemaVersion: 1,
    status: "running",
    workflow: "GridBrief deterministic sample agent workflow",
    generatedAt: new Date().toISOString(),
    page: safePageIdentity(options.url),
    requestedMarketDate: options.date,
    discovery: null,
    steps: [],
    safeguards: [
      "Native document.modelContext discovery and execution only",
      "No credential, cookie, token, or authorization input accepted",
      "EPİAŞ provider and retrieval timestamp required for success",
      "Scenario and brief tools require a successful live market snapshot first",
      "No market-order or source-data mutation tool is invoked",
    ],
  };

  let launched = null;
  let browserClient = null;
  let pageClient = null;
  let runSucceeded = false;

  try {
    if (!options.attach) {
      console.log("Launching headed Chrome with the native WebMCP feature enabled...");
      launched = await launchChrome(options);
    } else {
      console.log(`Connecting to existing Chrome CDP on 127.0.0.1:${options.cdpPort}...`);
    }

    const versionEndpoint = await waitForCdp(options.cdpPort, 15_000);
    const product = String(versionEndpoint.Browser ?? "unknown");
    const majorMatch = /(?:Chrome|Chromium)\/(\d+)/.exec(product);
    if (!options.allowOtherChrome && majorMatch?.[1] !== "152") {
      throw new Error(`Expected Chrome 152, but CDP reported ${product}.`);
    }
    browserClient = await CdpClient.connect(versionEndpoint.webSocketDebuggerUrl);
    const browserVersion = await browserClient.call("Browser.getVersion");
    evidence.browser = {
      product: browserVersion.product,
      protocolVersion: browserVersion.protocolVersion,
      featureLaunchFlag: "--enable-features=WebMCP",
    };

    const target = await findPageTarget(options.cdpPort, options.url, 15_000);
    pageClient = await CdpClient.connect(target.webSocketDebuggerUrl);
    await Promise.all([
      pageClient.call("Page.enable"),
      pageClient.call("Runtime.enable"),
      pageClient.call("Network.enable"),
      pageClient.call("Emulation.setDeviceMetricsOverride", {
        width: 1600,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      }),
    ]);

    const tools = await waitForWebMcp(pageClient, options.waitMs);
    assertExpectedTools(tools);
    evidence.discovery = {
      count: tools.length,
      requiredToolsPresent: true,
      tools: tools.map((tool) => ({
        name: tool.name,
        title: tool.title,
        annotations: tool.annotations,
      })),
    };
    console.log(`Discovered ${tools.length} native page-defined WebMCP tools.`);
    await screenshot(pageClient, join(options.outputDir, "01-tools-discovered.png"));

    let sequence = 0;
    let verifiedLiveMarket = false;
    let verifiedLiveDataset = false;
    const nonFatalFailures = [];
    if (options.withBrief) {
      console.log("Sample agent workflow: loading a live market snapshot before local scenario tools...");
      const snapshotStartedAt = new Date().toISOString();
      const snapshotInput = {
        metrics: ["ptf", "smf", "idm", "consumption", "generation", "system_direction"],
        marketDate: options.date,
        startHour: 17,
        endHour: 23,
      };
      let snapshotVerified = false;
      try {
        const snapshotRun = await executeToolWithOneRetry(pageClient, "get_market_snapshot", snapshotInput);
        const liveSnapshot = validateLiveSnapshot(snapshotRun.result);
        verifiedLiveMarket = true;
        snapshotVerified = true;
        evidence.steps.push({
          sequence: ++sequence,
          role: "market-context",
          toolName: "get_market_snapshot",
          attempts: snapshotRun.attempts,
          startedAt: snapshotStartedAt,
          completedAt: snapshotRun.result.completedAt,
          input: snapshotInput,
          verifiedLiveSource: liveSnapshot,
          output: snapshotRun.result,
        });
        await screenshot(pageClient, join(options.outputDir, "02-live-market-snapshot.png"));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown market snapshot failure.";
        nonFatalFailures.push({ stage: "live-market-snapshot", message });
        evidence.steps.push({
          sequence: ++sequence,
          role: "market-context",
          toolName: "get_market_snapshot",
          startedAt: snapshotStartedAt,
          input: snapshotInput,
          status: "failed-closed",
          error: { message },
          skippedTools: ["stress_test_position", "draft_shift_brief"],
        });
        console.log("Live market snapshot was not verified; local stress and draft tools were skipped.");
      }

      if (snapshotVerified) {
        try {
          const stressInput = {
            direction: "short",
            volumeMwh: 50,
            priceShockPercent: 20,
            scenarioLabel: "Sample agent what-if — no trade",
          };
          const stressStartedAt = new Date().toISOString();
          const stressResult = await executeTool(pageClient, "stress_test_position", stressInput);
          if (stressResult.data?.status !== "scenario_displayed") {
            throw new Error("The local what-if scenario was not displayed.");
          }
          evidence.steps.push({
            sequence: ++sequence,
            role: "risk-what-if",
            prerequisite: "verified live get_market_snapshot",
            toolName: "stress_test_position",
            startedAt: stressStartedAt,
            completedAt: stressResult.completedAt,
            input: stressInput,
            output: stressResult,
          });
          await screenshot(pageClient, join(options.outputDir, "03-local-what-if.png"));

          const briefInput = {
            language: "en",
            audience: "operations",
            includeSections: ["market", "position", "risks", "actions"],
            notes: "Sample workflow; verify all source timestamps before operational use.",
          };
          const briefStartedAt = new Date().toISOString();
          const briefResult = await executeTool(pageClient, "draft_shift_brief", briefInput);
          if (briefResult.data?.status !== "draft_displayed") {
            throw new Error("The local draft brief was not displayed.");
          }
          evidence.steps.push({
            sequence: ++sequence,
            role: "operations-draft",
            prerequisite: "verified live get_market_snapshot and displayed local what-if",
            toolName: "draft_shift_brief",
            startedAt: briefStartedAt,
            completedAt: briefResult.completedAt,
            input: briefInput,
            output: briefResult,
          });
          await screenshot(pageClient, join(options.outputDir, "04-english-shift-brief.png"));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown local scenario failure.";
          nonFatalFailures.push({ stage: "local-scenario-and-brief", message });
          evidence.steps.push({
            sequence: ++sequence,
            role: "local-decision-support",
            prerequisite: "verified live get_market_snapshot",
            status: "failed-closed",
            error: { message },
          });
          console.log("Live market evidence remains valid, but the local scenario/brief sequence did not complete.");
        }
      }
    }

    try {
      console.log("Sample agent workflow: searching the visible EPİAŞ Transparency catalogue...");
      const searchStartedAt = new Date().toISOString();
      const searchInput = { query: options.datasetQuery, section: "markets", limit: 10 };
      const searchResult = await executeTool(pageClient, "search_transparency_datasets", searchInput);
      const candidate = searchResult.data?.results?.find((item) => item?.datasetId === options.datasetId);
      if (!candidate?.liveAvailable) {
        throw new Error(`The catalogue did not expose ${options.datasetId} as a live allowlisted result.`);
      }
      evidence.steps.push({
        sequence: ++sequence,
        role: "data-discovery",
        toolName: "search_transparency_datasets",
        startedAt: searchStartedAt,
        completedAt: searchResult.completedAt,
        input: searchInput,
        output: searchResult,
      });
      const searchScreenshotName = options.withBrief ? "05-catalog-search.png" : "02-catalog-search.png";
      await screenshot(pageClient, join(options.outputDir, searchScreenshotName));

      console.log(`Sample agent workflow: retrieving ${options.datasetId} for ${options.date}...`);
      const datasetStartedAt = new Date().toISOString();
      const datasetInput = {
        datasetId: options.datasetId,
        startDate: options.date,
        endDate: options.date,
        page: { number: 1, size: 24 },
      };
      const datasetRun = await executeToolWithOneRetry(pageClient, "get_transparency_dataset", datasetInput);
      const liveDataset = validateLiveDataset(datasetRun.result, options.datasetId);
      verifiedLiveDataset = true;
      evidence.steps.push({
        sequence: ++sequence,
        role: "market-data-retrieval",
        toolName: "get_transparency_dataset",
        attempts: datasetRun.attempts,
        startedAt: datasetStartedAt,
        completedAt: datasetRun.result.completedAt,
        input: datasetInput,
        verifiedLiveSource: liveDataset,
        output: datasetRun.result,
      });
      const datasetScreenshotName = options.withBrief ? "06-live-dataset.png" : "03-live-dataset.png";
      await screenshot(pageClient, join(options.outputDir, datasetScreenshotName));
      console.log(`Verified live EPİAŞ data: ${liveDataset.quality.rowCount} rows with retrievedAt provenance.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown dataset workflow failure.";
      nonFatalFailures.push({ stage: "live-dataset", message });
      evidence.steps.push({
        sequence: ++sequence,
        role: "market-data-retrieval",
        toolName: "get_transparency_dataset",
        status: "failed-closed",
        error: { message },
      });
      console.log("Live dataset was not verified; no synthetic result was substituted.");
    }

    if (!verifiedLiveMarket && !verifiedLiveDataset) {
      throw new Error("No live EPİAŞ response passed provenance checks; see sanitized failed-closed evidence.");
    }

    evidence.status = "passed";
    evidence.liveProof = {
      marketSnapshot: verifiedLiveMarket,
      transparencyDataset: verifiedLiveDataset,
    };
    if (nonFatalFailures.length) evidence.nonFatalFailures = nonFatalFailures;
    evidence.completedAt = new Date().toISOString();
    runSucceeded = true;
    await writeEvidence(evidencePath, evidence);
    console.log(`Sanitized evidence written to ${evidencePath}`);
    console.log(`Screenshots written to ${options.outputDir}`);
  } catch (error) {
    evidence.status = "failed";
    evidence.completedAt = new Date().toISOString();
    evidence.error = { message: error instanceof Error ? error.message : "Unknown workflow failure." };
    await writeEvidence(evidencePath, evidence).catch(() => undefined);
    throw error;
  } finally {
    pageClient?.close();
    if (browserClient && launched && !(options.keepOpen && runSucceeded)) {
      await browserClient.call("Browser.close", {}, 5_000).catch(() => undefined);
    }
    browserClient?.close();
    if (launched && !(options.keepOpen && runSucceeded)) {
      await Promise.race([
        new Promise((resolvePromise) => launched.child.once("exit", resolvePromise)),
        delay(5_000),
      ]);
      await removeEphemeralProfile(launched.profileDir).catch(() => undefined);
    }
  }
}

main().catch((error) => {
  console.error(`WebMCP demo failed: ${error instanceof Error ? error.message : "Unknown error."}`);
  process.exitCode = 1;
});
