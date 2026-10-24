import { db } from "@/db/client";
import { resetDemo } from "@/db/seed";
import { currentUser } from "@/lib/auth";

// Admin only: wipe everything and reseed the demo accounts and story.
export async function POST() {
  const user = await currentUser();
  if (!user || user.role !== "admin") return new Response(null, { status: 404 });
  const r = await resetDemo(db());
  return Response.json({ ok: true, ms: r.ms });
}
