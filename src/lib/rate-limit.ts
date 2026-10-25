// Fixed-window rate limits kept in process memory. Hail runs one web instance (render.yaml), so this is
// enough; a restart forgets the counts, which only loosens limits briefly (D-018).

type Window = { start: number; count: number };

const windows = new Map<string, Window>();
const MAX_TRACKED = 20_000;

export type Limit = { limit: number; windowMs: number };

export const LIMITS = {
  /** Public API and MCP requests, per API key. Documented in docs/public/api.md. */
  apiPerKey: { limit: 120, windowMs: 60_000 },
  /** Requests with a missing or wrong API key, per client IP. */
  badKeyPerIp: { limit: 20, windowMs: 60_000 },
  /** Failed sign-ins, per email address and per client IP. */
  signInPerEmail: { limit: 10, windowMs: 15 * 60_000 },
  signInPerIp: { limit: 50, windowMs: 15 * 60_000 },
  /** Proof photo uploads (each runs an AI quick check), per worker. */
  photosPerWorker: { limit: 40, windowMs: 15 * 60_000 },
} satisfies Record<string, Limit>;

function current(key: string, { windowMs }: Limit, now: number) {
  const w = windows.get(key);
  if (w && now - w.start < windowMs) return w;
  return null;
}

function retryAfter(w: Window, { windowMs }: Limit, now: number) {
  return Math.max(1, Math.ceil((w.start + windowMs - now) / 1000));
}

/** Counts one event. Returns ok: false (and seconds to wait) once the window's limit is exceeded. */
export function hit(key: string, l: Limit, now = Date.now()): { ok: true } | { ok: false; retryAfterSec: number } {
  let w = current(key, l, now);
  if (!w) {
    if (windows.size >= MAX_TRACKED) sweep(now);
    w = { start: now, count: 0 };
    windows.set(key, w);
  }
  w.count++;
  return w.count <= l.limit ? { ok: true } : { ok: false, retryAfterSec: retryAfter(w, l, now) };
}

/** True when the window is already at its limit, without counting a new event. */
export function isBlocked(key: string, l: Limit, now = Date.now()): { blocked: false } | { blocked: true; retryAfterSec: number } {
  const w = current(key, l, now);
  return w && w.count >= l.limit ? { blocked: true, retryAfterSec: retryAfter(w, l, now) } : { blocked: false };
}

export function clear(key: string) {
  windows.delete(key);
}

function sweep(now: number) {
  const longest = Math.max(...Object.values(LIMITS).map((l) => l.windowMs));
  for (const [k, w] of windows) if (now - w.start >= longest) windows.delete(k);
  if (windows.size >= MAX_TRACKED) windows.clear();
}

/** Best-effort client IP: the first X-Forwarded-For entry set by the hosting proxy. */
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

/** Test helper. */
export function resetRateLimits() {
  windows.clear();
}
