import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { apiKeys, ownerPolicies, users } from "@/db/schema";
import { createApiKey } from "@/domain/keys/keys";
import { newId } from "@/lib/ids";
import { seedHistory } from "./demo-history";

type Account = { role: "owner" | "worker" | "admin"; name: string; emailVar: string; passwordVar: string; paypalVar?: string; optional?: boolean };

const ACCOUNTS: Account[] = [
  { role: "owner", name: "Dana (demo owner)", emailVar: "DEMO_OWNER_EMAIL", passwordVar: "DEMO_OWNER_PASSWORD" },
  { role: "worker", name: "Sam (demo worker)", emailVar: "DEMO_WORKER1_EMAIL", passwordVar: "DEMO_WORKER1_PASSWORD", paypalVar: "DEMO_WORKER1_PAYPAL_EMAIL" },
  { role: "worker", name: "Alex (demo worker)", emailVar: "DEMO_WORKER2_EMAIL", passwordVar: "DEMO_WORKER2_PASSWORD", paypalVar: "DEMO_WORKER2_PAYPAL_EMAIL" },
  { role: "admin", name: "Hail admin", emailVar: "DEMO_ADMIN_EMAIL", passwordVar: "DEMO_ADMIN_PASSWORD" },
  // Extra workers so parallel outside testers don't share a reservation. Skipped when not configured;
  // they're paid to worker 1's sandbox PayPal account unless given their own.
  { role: "worker", name: "Jordan (demo worker)", emailVar: "DEMO_WORKER3_EMAIL", passwordVar: "DEMO_WORKER3_PASSWORD", paypalVar: "DEMO_WORKER1_PAYPAL_EMAIL", optional: true },
  { role: "worker", name: "Riley (demo worker)", emailVar: "DEMO_WORKER4_EMAIL", passwordVar: "DEMO_WORKER4_PASSWORD", paypalVar: "DEMO_WORKER1_PAYPAL_EMAIL", optional: true },
];

/** Every table, children first. Used by reset. */
export const ALL_TABLES = [
  "ai_calls",
  "idempotency_records",
  "callback_deliveries",
  "webhook_events",
  "bounty_events",
  "payouts",
  "appeals",
  "verifications",
  "submissions",
  "photos",
  "proof_challenges",
  "claims",
  "screenings",
  "bounties",
  "withdrawals",
  "topups",
  "ledger_entries",
  "owner_policies",
  "api_keys",
  "users",
];

export async function wipeAll(database: DB) {
  await database.execute(sql.raw(`TRUNCATE ${ALL_TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`));
}

/**
 * Idempotent base seed: demo accounts from env and a default owner policy. With `withKey`, also one
 * API key if the owner has none (the raw key is returned so it can be printed once).
 */
export async function seedBase(database: DB, envVars: NodeJS.ProcessEnv = process.env, opts: { withKey?: boolean } = {}) {
  const ids: Record<string, string> = {};
  for (const a of ACCOUNTS) {
    const email = envVars[a.emailVar]?.trim().toLowerCase();
    const password = envVars[a.passwordVar];
    if (!email || !password) {
      if (a.optional) continue;
      throw new Error(`${a.emailVar} and ${a.passwordVar} must be set`);
    }
    const hash = await bcrypt.hash(password, 10);
    const paypalEmail = a.paypalVar ? envVars[a.paypalVar]?.trim() || null : null;
    // Demo workers arrive with PayPal already connected and verified (their sandbox account), and
    // never paused, so the demo works whether or not Connect PayPal is switched on.
    const connected = paypalEmail ? { paypalVerified: true, paypalConnectedAt: new Date(), suspendedAt: null, suspendedReason: null, suspendedBountyId: null } : {};
    const [existing] = await database.select({ id: users.id }).from(users).where(eq(users.email, email));
    const id = existing?.id ?? newId("usr");
    if (existing) {
      await database.update(users).set({ name: a.name, role: a.role, passwordHash: hash, paypalEmail, ...connected }).where(eq(users.id, id));
    } else {
      await database.insert(users).values({ id, role: a.role, name: a.name, email, passwordHash: hash, paypalEmail, ...connected });
    }
    ids[a.emailVar] = id;
  }
  const ownerId = ids.DEMO_OWNER_EMAIL;
  await database.insert(ownerPolicies).values({ ownerId }).onConflictDoNothing();
  const existingKeys = await database.select({ id: apiKeys.id }).from(apiKeys).where(eq(apiKeys.ownerId, ownerId));
  const key = !opts.withKey || existingKeys.length ? null : await createApiKey(database, { ownerId, name: "demo-agent", dailyCapCents: 10_000 });
  return { ownerId, worker1Id: ids.DEMO_WORKER1_EMAIL, worker2Id: ids.DEMO_WORKER2_EMAIL, adminId: ids.DEMO_ADMIN_EMAIL, apiKey: key?.raw ?? null };
}

/** Wipes everything and reseeds demo accounts plus the demo story. Used by the admin reset button. */
export async function resetDemo(database: DB, envVars: NodeJS.ProcessEnv = process.env) {
  const started = Date.now();
  await wipeAll(database);
  const base = await seedBase(database, envVars, { withKey: false });
  const key = await createApiKey(database, { ownerId: base.ownerId, name: "demo-agent", dailyCapCents: 20_000 });
  await seedHistory(database, { ownerId: base.ownerId, worker1Id: base.worker1Id, worker2Id: base.worker2Id, apiKeyId: key.id });
  return { ms: Date.now() - started };
}
