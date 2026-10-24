import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type Executor = DB | Tx;

const globalForDb = globalThis as unknown as { __hailSql?: ReturnType<typeof postgres>; __hailDb?: DB };

export function db(): DB {
  if (globalForDb.__hailDb) return globalForDb.__hailDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 10, onnotice: () => {} });
  globalForDb.__hailSql = sql;
  globalForDb.__hailDb = drizzle(sql, { schema });
  return globalForDb.__hailDb;
}

export async function closeDb() {
  await globalForDb.__hailSql?.end({ timeout: 5 });
  globalForDb.__hailSql = undefined;
  globalForDb.__hailDb = undefined;
}

export { schema };
