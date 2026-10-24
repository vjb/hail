import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Executor } from "@/db/client";
import { apiKeys } from "@/db/schema";
import { newId, randomToken } from "@/lib/ids";

// API keys look like `hail_sk_<40 chars>`. Only a SHA-256 hash is stored; the raw key is shown once.
export const KEY_PREFIX = "hail_sk_";

export const hashKey = (raw: string) => createHash("sha256").update(raw).digest("hex");

export async function createApiKey(ex: Executor, input: { ownerId: string; name: string; dailyCapCents: number }) {
  const raw = KEY_PREFIX + randomToken(40);
  const id = newId("key");
  await ex.insert(apiKeys).values({
    id,
    ownerId: input.ownerId,
    name: input.name,
    keyHash: hashKey(raw),
    prefix: raw.slice(0, KEY_PREFIX.length + 6),
    dailyCapCents: input.dailyCapCents,
  });
  return { id, raw };
}

export type ApiKeyRecord = typeof apiKeys.$inferSelect;

/** Finds an active (non-revoked) key by its raw value. Returns null for unknown keys. */
export async function findActiveKey(ex: Executor, raw: string): Promise<{ key: ApiKeyRecord | null; revoked: boolean }> {
  if (!raw.startsWith(KEY_PREFIX)) return { key: null, revoked: false };
  const [k] = await ex.select().from(apiKeys).where(eq(apiKeys.keyHash, hashKey(raw)));
  if (!k) return { key: null, revoked: false };
  if (k.revokedAt) return { key: null, revoked: true };
  return { key: k, revoked: false };
}

export async function revokeApiKey(ex: Executor, ownerId: string, keyId: string) {
  await ex
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.ownerId, ownerId), isNull(apiKeys.revokedAt)));
}
