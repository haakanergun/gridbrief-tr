import "server-only";

const WINDOW_SECONDS = 60;
const WINDOW_MS = WINDOW_SECONDS * 1_000;
const REQUEST_LIMIT = 30;
const MAX_TRACKED_CLIENTS = 10_000;

interface Counter {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  counters: Map<string, Counter>;
  lastSweepAt: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  headers: Record<string, string>;
}

const globalRateLimit = globalThis as typeof globalThis & {
  gridBriefRateLimitStore?: RateLimitStore;
};

const store = globalRateLimit.gridBriefRateLimitStore ?? {
  counters: new Map<string, Counter>(),
  lastSweepAt: 0,
};
globalRateLimit.gridBriefRateLimitStore = store;

export function checkApiRateLimit(headers: Headers, now = Date.now()): RateLimitDecision {
  sweepExpiredCounters(now);

  const key = clientKey(headers);
  let counter = store.counters.get(key);
  if (!counter || counter.resetAt <= now) {
    makeRoomForClient(now);
    counter = { count: 0, resetAt: now + WINDOW_MS };
    store.counters.set(key, counter);
  }

  counter.count += 1;
  const remaining = Math.max(0, REQUEST_LIMIT - counter.count);
  const resetSeconds = Math.max(1, Math.ceil((counter.resetAt - now) / 1_000));
  const responseHeaders: Record<string, string> = {
    "RateLimit-Limit": String(REQUEST_LIMIT),
    "RateLimit-Policy": `${REQUEST_LIMIT};w=${WINDOW_SECONDS}`,
    "RateLimit-Remaining": String(remaining),
    "RateLimit-Reset": String(resetSeconds),
    "X-RateLimit-Limit": String(REQUEST_LIMIT),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(counter.resetAt / 1_000)),
  };

  const allowed = counter.count <= REQUEST_LIMIT;
  if (!allowed) responseHeaders["Retry-After"] = String(resetSeconds);

  return { allowed, headers: responseHeaders };
}

function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-vercel-forwarded-for")
    ?? headers.get("cf-connecting-ip")
    ?? headers.get("x-real-ip")
    ?? headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",", 1)[0]?.trim();

  if (candidate && candidate.length <= 64 && /^[0-9a-fA-F:.]+$/.test(candidate)) {
    return candidate;
  }
  return "unknown";
}

function sweepExpiredCounters(now: number): void {
  if (now - store.lastSweepAt < WINDOW_MS) return;
  store.lastSweepAt = now;
  for (const [key, counter] of store.counters) {
    if (counter.resetAt <= now) store.counters.delete(key);
  }
}

function makeRoomForClient(now: number): void {
  if (store.counters.size < MAX_TRACKED_CLIENTS) return;

  for (const [key, counter] of store.counters) {
    if (counter.resetAt <= now) {
      store.counters.delete(key);
      return;
    }
  }

  const oldestKey = store.counters.keys().next().value as string | undefined;
  if (oldestKey) store.counters.delete(oldestKey);
}
