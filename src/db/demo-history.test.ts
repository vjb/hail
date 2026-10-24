import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DB } from "@/db/client";
import * as schema from "@/db/schema";
import { getBalances, ownerLedgerSum } from "@/domain/ledger/ledger";
import { runMigrations } from "../../scripts/migrate";
import { resetDemo } from "./seed";

// The reset wipes every table, so it runs against its own throwaway database, not the shared test DB.
const base = new URL(process.env.DATABASE_URL!);
const name = `${base.pathname.slice(1)}_reset`;
const url = new URL(base);
url.pathname = `/${name}`;
let client: ReturnType<typeof postgres>;
let database: DB;

beforeAll(async () => {
  const admin = postgres({ host: base.hostname, port: Number(base.port || 5432), user: decodeURIComponent(base.username), password: decodeURIComponent(base.password), database: "postgres", max: 1, onnotice: () => {} });
  await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  await admin.end();
  await runMigrations(url.toString());
  client = postgres(url.toString(), { max: 4, onnotice: () => {} });
  database = drizzle(client, { schema });
}, 30_000);

afterAll(() => client?.end({ timeout: 5 }));

const env = {
  DEMO_OWNER_EMAIL: "owner@reset.test",
  DEMO_OWNER_PASSWORD: "pw-owner-123456",
  DEMO_WORKER1_EMAIL: "w1@reset.test",
  DEMO_WORKER1_PASSWORD: "pw-worker1-123456",
  DEMO_WORKER1_PAYPAL_EMAIL: "w1-paypal@example.com",
  DEMO_WORKER2_EMAIL: "w2@reset.test",
  DEMO_WORKER2_PASSWORD: "pw-worker2-123456",
  DEMO_WORKER2_PAYPAL_EMAIL: "w2-paypal@example.com",
  DEMO_ADMIN_EMAIL: "admin@reset.test",
  DEMO_ADMIN_PASSWORD: "pw-admin-123456",
} as unknown as NodeJS.ProcessEnv;

describe("demo reset", () => {
  it("wipes and rebuilds a consistent demo story in under 10 seconds", async () => {
    const r = await resetDemo(database, env);
    expect(r.ms).toBeLessThan(10_000);
    const rows = await database.execute<{ status: string; n: string }>(sql`select status, count(*)::text as n from bounties group by status order by status`);
    const counts = Object.fromEntries(rows.map((x) => [x.status, Number(x.n)]));
    expect(counts).toEqual({ blocked: 1, needs_owner_review: 1, open: 2, paid: 3, pending_approval: 1 });
    const [owner] = await database.execute<{ id: string }>(sql`select id from users where email = 'owner@reset.test'`);
    expect(await ownerLedgerSum(database, owner.id)).toBe(0);
    // $300 top-up − $23 paid out; $75 + $15 + $25 + $7 still set aside.
    expect(await getBalances(database, owner.id)).toEqual({ availableCents: 30000 - 2300 - 12200, heldCents: 12200 });
    // Resetting again gives the same result.
    await resetDemo(database, env);
    const again = await database.execute<{ n: string }>(sql`select count(*)::text as n from bounties`);
    expect(Number(again[0].n)).toBe(8);
  }, 30_000);
});
