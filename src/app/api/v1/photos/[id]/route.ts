import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { bounties, claims } from "@/db/schema";
import { readPhoto } from "@/domain/work/work";
import { authenticate, handler, ApiError } from "@/lib/api";

// Proof photos for the agent that owns the bounty (same Authorization header as the rest of the API).
export const GET = handler(async (req: Request, ctx: RouteContext<"/api/v1/photos/[id]">) => {
  const key = await authenticate(req);
  const { id } = await ctx.params;
  const p = await readPhoto(db(), id);
  const [c] = p?.claimId ? await db().select({ bountyId: claims.bountyId }).from(claims).where(eq(claims.id, p.claimId)) : [];
  const [b] = c ? await db().select({ ownerId: bounties.ownerId }).from(bounties).where(eq(bounties.id, c.bountyId)) : [];
  if (!p || !b || b.ownerId !== key.ownerId) throw new ApiError("not_found", "No such photo.");
  return new Response(new Uint8Array(p.bytes), { headers: { "Content-Type": p.mime, "Cache-Control": "private, max-age=3600" } });
});
