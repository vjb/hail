import { timingSafeEqual } from "node:crypto";
import { db } from "@/db/client";
import { sweep } from "@/domain/sweep/sweep";
import { env } from "@/lib/env";

// Called every minute by the Render cron job with the shared secret.
export async function POST(req: Request) {
  const given = Buffer.from(req.headers.get("x-sweep-secret") ?? "");
  const expected = Buffer.from(env().SWEEP_SECRET);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return new Response(null, { status: 404 });
  const result = await sweep(db());
  return Response.json(result);
}
