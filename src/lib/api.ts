import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { apiKeys, bountyEvents, idempotencyRecords, submissions, verifications, type bounties } from "@/db/schema";
import { env } from "@/lib/env";
import { desc } from "drizzle-orm";
import { DomainError, finalScreening } from "@/domain/bounty/service";
import { findActiveKey, type ApiKeyRecord } from "@/domain/keys/keys";
import { clientIp, hit, isBlocked, LIMITS } from "@/lib/rate-limit";

// Public API plumbing: documented error format (docs/public/api.md), bearer-key auth,
// and Idempotency-Key handling. Public errors never include internals.

export type ErrorCode =
  | "invalid_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_state"
  | "idempotency_conflict"
  | "insufficient_funds"
  | "rate_limited"
  | "internal_error";

const STATUS: Record<ErrorCode, number> = {
  invalid_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  invalid_state: 409,
  idempotency_conflict: 409,
  insufficient_funds: 402,
  rate_limited: 429,
  internal_error: 500,
};

const HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

export function apiError(code: ErrorCode, message: string, retryAfterSec?: number) {
  const headers = retryAfterSec ? { ...HEADERS, "Retry-After": String(retryAfterSec) } : HEADERS;
  return new Response(JSON.stringify({ error: { code, message } }), { status: STATUS[code], headers });
}

export function apiJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly retryAfterSec?: number,
  ) {
    super(message);
  }
}

/** Wraps a route handler: maps domain errors to documented API errors and hides everything else. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ApiError) return apiError(e.code, e.message, e.retryAfterSec);
      if (e instanceof DomainError) return apiError(e.code, e.message);
      console.error("[api] unhandled", e instanceof Error ? e.stack : e);
      return apiError("internal_error", "Something went wrong on our side. It's safe to retry with the same Idempotency-Key.");
    }
  };
}

export async function authenticate(req: Request): Promise<ApiKeyRecord> {
  const ipKey = `badkey:${clientIp(req.headers)}`;
  const blocked = isBlocked(ipKey, LIMITS.badKeyPerIp);
  if (blocked.blocked) throw new ApiError("rate_limited", `Too many requests with a missing or invalid API key. Try again in ${blocked.retryAfterSec} seconds.`, blocked.retryAfterSec);
  const fail = (code: ErrorCode, message: string) => {
    hit(ipKey, LIMITS.badKeyPerIp);
    return new ApiError(code, message);
  };
  const header = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(header);
  if (!m) throw fail("unauthorized", "Missing API key. Send Authorization: Bearer hail_sk_...");
  const { key, revoked } = await findActiveKey(db(), m[1]);
  if (revoked) throw fail("forbidden", "This API key has been revoked.");
  if (!key) throw fail("unauthorized", "Invalid API key.");
  const r = hit(`api:${key.id}`, LIMITS.apiPerKey);
  if (!r.ok) throw new ApiError("rate_limited", `Too many requests. Each API key can make ${LIMITS.apiPerKey.limit} requests a minute. Try again in ${r.retryAfterSec} seconds.`, r.retryAfterSec);
  void db().update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id)).catch(() => {});
  return key;
}

export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError("invalid_request", "The request body must be valid JSON.");
  }
}

const hashBody = (method: string, path: string, body: unknown) => createHash("sha256").update(`${method} ${path} ${JSON.stringify(body ?? null)}`).digest("hex");

/**
 * Runs `fn` at most once per (API key, Idempotency-Key). A repeat with the same body returns the
 * stored response; a repeat with a different body is an idempotency_conflict.
 */
export async function withIdempotency(req: Request, key: ApiKeyRecord, path: string, body: unknown, fn: () => Promise<Response>): Promise<Response> {
  const idemKey = req.headers.get("idempotency-key");
  if (!idemKey) return fn();
  if (idemKey.length > 64) throw new ApiError("invalid_request", "Idempotency-Key must be 64 characters or fewer.");
  const requestHash = hashBody(req.method, path, body);
  const inserted = await db().insert(idempotencyRecords).values({ apiKeyId: key.id, key: idemKey, requestHash }).onConflictDoNothing().returning({ id: idempotencyRecords.id });
  if (inserted.length === 0) {
    // Seen before: wait briefly for an in-flight first attempt, then replay or reject.
    for (let i = 0; i < 20; i++) {
      const [rec] = await db().select().from(idempotencyRecords).where(and(eq(idempotencyRecords.apiKeyId, key.id), eq(idempotencyRecords.key, idemKey)));
      if (rec.requestHash !== requestHash) throw new ApiError("idempotency_conflict", "This Idempotency-Key was already used with a different request.");
      if (rec.responseStatus !== null) return apiJson(rec.responseBody, rec.responseStatus);
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new ApiError("idempotency_conflict", "A request with this Idempotency-Key is still being processed. Retry shortly.");
  }
  const id = inserted[0].id;
  let res: Response;
  try {
    res = await fn();
  } catch (e) {
    // Errors other than 5xx are final; 5xx (or a crash) frees the key so a retry can run again.
    const code = e instanceof ApiError || e instanceof DomainError ? e.code : "internal_error";
    if (code === "internal_error") await db().delete(idempotencyRecords).where(eq(idempotencyRecords.id, id));
    else await db().update(idempotencyRecords).set({ responseStatus: STATUS[code], responseBody: { error: { code, message: (e as Error).message } } }).where(eq(idempotencyRecords.id, id));
    throw e;
  }
  if (res.status >= 500) {
    await db().delete(idempotencyRecords).where(eq(idempotencyRecords.id, id));
    return res;
  }
  const responseBody = await res.clone().json();
  await db().update(idempotencyRecords).set({ responseStatus: res.status, responseBody }).where(eq(idempotencyRecords.id, id));
  return res;
}

type BountyRow = typeof bounties.$inferSelect;

/** The public result: filled once the work is accepted (approved, paying or paid). */
async function bountyResult(b: BountyRow) {
  if (!["approved", "paying", "paid"].includes(b.status)) return null;
  const [sub] = await db().select().from(submissions).where(eq(submissions.bountyId, b.id)).orderBy(desc(submissions.createdAt)).limit(1);
  if (!sub) return null;
  const [v] = await db().select().from(verifications).where(eq(verifications.submissionId, sub.id)).orderBy(desc(verifications.id)).limit(1);
  const events = await db().select().from(bountyEvents).where(eq(bountyEvents.bountyId, b.id)).orderBy(desc(bountyEvents.createdAt));
  const accepted = events.find((e) => e.toStatus === "approved");
  const byOwner = accepted && accepted.actor !== "verifier";
  const base = env().APP_BASE_URL.replace(/\/$/, "");
  const texts = (sub.notes ?? "").trim();
  return {
    verification: byOwner ? "owner_approved" : "pass",
    summary: v?.rationale ?? null,
    checklist: (v?.checklistResults ?? []).map((c) => ({ item: c.item, passed: byOwner ? true : c.passed === true })),
    deliverables: [
      ...sub.photoIds.map((id) => ({ type: "photo", url: `${base}/api/v1/photos/${id}` })),
      ...(texts ? [{ type: "text", value: texts }] : []),
      ...(sub.location ? [{ type: "location", lat: sub.location.lat, lng: sub.location.lng }] : []),
    ],
    completed_at: (accepted?.createdAt ?? sub.createdAt).toISOString(),
  };
}

/** The public bounty object (docs/public/api.md). */
export async function serializeBounty(b: BountyRow) {
  const s = await finalScreening(db(), b.id);
  const result = await bountyResult(b);
  return {
    id: b.id,
    status: b.status === "created" || b.status === "screening" ? "pending_approval" : b.status,
    title: b.title,
    instructions: b.instructions,
    deliverables: b.deliverables,
    acceptance_checklist: b.acceptanceChecklist,
    reward_cents: b.rewardCents,
    spots: b.spots,
    location: b.location ?? null,
    product: b.product ?? null,
    expires_at: b.expiresAt.toISOString(),
    screening: s ? { decision: s.decision, category: s.category, rationale: s.rationale } : null,
    result,
    callback_url: b.callbackUrl ?? null,
    created_at: b.createdAt.toISOString(),
  };
}

export const encodeCursor = (createdAt: Date, id: string) => Buffer.from(`${createdAt.toISOString()}|${id}`).toString("base64url");

export function decodeCursor(c: string): { createdAt: Date; id: string } {
  try {
    const [iso, id] = Buffer.from(c, "base64url").toString("utf8").split("|");
    const d = new Date(iso);
    if (!id || Number.isNaN(d.getTime())) throw new Error();
    return { createdAt: d, id };
  } catch {
    throw new ApiError("invalid_request", "cursor is not valid. Use the next_cursor value from a previous response.");
  }
}
