import { db } from "@/db/client";
import { DomainError } from "@/domain/bounty/service";
import { issueChallenge } from "@/domain/work/work";
import { currentUser } from "@/lib/auth";
import { hit, LIMITS } from "@/lib/rate-limit";

// Worker asks for a fresh photo code for one photo slot, right before taking the photo.
export async function POST(req: Request, ctx: RouteContext<"/api/work/claims/[id]/challenge">) {
  const user = await currentUser();
  if (!user || user.role !== "worker") return Response.json({ error: "Please sign in as a worker." }, { status: 401 });
  const limited = hit(`challenges:${user.id}`, LIMITS.challengesPerWorker);
  if (!limited.ok) {
    return Response.json({ error: "You've asked for a lot of photo codes. Wait a few minutes and try again." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } });
  }
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { slot?: unknown } | null;
  const slot = Number(body?.slot);
  if (!Number.isInteger(slot)) return Response.json({ error: "Choose which photo you're taking." }, { status: 400 });
  try {
    const c = await issueChallenge(db(), user.id, id, slot);
    return Response.json({ challengeId: c.challengeId, code: c.code, expiresAt: c.expiresAt.toISOString() });
  } catch (e) {
    if (e instanceof DomainError) return Response.json({ error: e.message }, { status: e.code === "not_found" ? 404 : 400 });
    console.error("[challenge] failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "Couldn't get a photo code. Check your connection and try again." }, { status: 500 });
  }
}
