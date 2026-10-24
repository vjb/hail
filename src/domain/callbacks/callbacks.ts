import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { and, asc, eq, isNull, lte } from "drizzle-orm";
import type { DB } from "@/db/client";
import { callbackDeliveries } from "@/db/schema";

// Outbound callbacks to agents (docs/public/api.md "Callbacks"). Events are queued by transition()
// in the same transaction as the status change, then delivered here with retries and backoff.
// Agent-supplied URLs are untrusted: only public HTTPS hosts are ever contacted (no SSRF).

const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 3 * 60 * 60_000];
export const MAX_ATTEMPTS = BACKOFF_MS.length + 1;

function privateIPv4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function privateIPv6(ip: string) {
  const x = ip.toLowerCase();
  if (x === "::1" || x === "::") return true;
  if (x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80")) return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(x);
  return mapped ? privateIPv4(mapped[1]) : false;
}

export const isPrivateAddress = (ip: string) => (isIP(ip) === 4 ? privateIPv4(ip) : isIP(ip) === 6 ? privateIPv6(ip) : true);

/** True only for https URLs whose host resolves exclusively to public addresses. */
export async function isSafeCallbackUrl(raw: string, resolve: (host: string) => Promise<string[]> = defaultResolve) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;
  if (isIP(host)) return !isPrivateAddress(host);
  try {
    const addrs = await resolve(host);
    return addrs.length > 0 && addrs.every((a) => !isPrivateAddress(a));
  } catch {
    return false;
  }
}

const defaultResolve = async (host: string) => (await lookup(host, { all: true })).map((a) => a.address);

type Sender = (url: string, body: string) => Promise<number>;

const defaultSender: Sender = async (url, body) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Hail-Callbacks/1.0" },
    body,
    redirect: "manual", // a redirect could point at an internal host
    signal: AbortSignal.timeout(10_000),
  });
  return res.status;
};

/** Delivers due callbacks. 2xx = delivered; anything else retries with backoff, then gives up. */
export async function deliverCallbacks(database: DB, opts: { now?: Date; send?: Sender; resolve?: (h: string) => Promise<string[]> } = {}) {
  const now = opts.now ?? new Date();
  const send = opts.send ?? defaultSender;
  const due = await database
    .select()
    .from(callbackDeliveries)
    .where(and(isNull(callbackDeliveries.deliveredAt), lte(callbackDeliveries.nextAttemptAt, now), lte(callbackDeliveries.attempts, MAX_ATTEMPTS - 1)))
    .orderBy(asc(callbackDeliveries.id))
    .limit(50);
  let delivered = 0;
  for (const d of due) {
    let status = 0;
    if (await isSafeCallbackUrl(d.url, opts.resolve)) {
      try {
        status = await send(d.url, JSON.stringify(d.payload));
      } catch {
        status = 0;
      }
    } else {
      status = -1; // refused: not a public https URL
    }
    const attempts = d.attempts + 1;
    const ok = status >= 200 && status < 300;
    await database
      .update(callbackDeliveries)
      .set({
        attempts,
        lastStatus: status,
        deliveredAt: ok ? now : null,
        // Refused URLs and exhausted retries stop here (nextAttemptAt far in the future).
        nextAttemptAt: ok ? now : status === -1 || attempts >= MAX_ATTEMPTS ? new Date("9999-12-31") : new Date(now.getTime() + BACKOFF_MS[attempts - 1]),
      })
      .where(eq(callbackDeliveries.id, d.id));
    if (ok) delivered++;
  }
  return { due: due.length, delivered };
}
