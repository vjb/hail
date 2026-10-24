import postgres from "postgres";
import { runMigrations } from "../scripts/migrate";

// Integration tests run against a throwaway `<db>_test` database next to DATABASE_URL.
export default async function setup() {
  const base = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/hail";
  const url = new URL(base);
  const testDb = `${url.pathname.slice(1) || "hail"}_test`;
  const admin = postgres({ host: url.hostname, port: Number(url.port || 5432), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: "postgres", max: 1, onnotice: () => {} });
  await admin.unsafe(`DROP DATABASE IF EXISTS "${testDb}" WITH (FORCE)`);
  await admin.unsafe(`CREATE DATABASE "${testDb}"`);
  await admin.end();
  url.pathname = `/${testDb}`;
  process.env.TEST_DATABASE_URL = url.toString();
  await runMigrations(url.toString());
  return () => {};
}
