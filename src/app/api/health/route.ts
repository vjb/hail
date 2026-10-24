import { sql } from "drizzle-orm";
import { db } from "@/db/client";

// Health check for Render: the app is up and can reach Postgres.
export async function GET() {
  try {
    await db().execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
