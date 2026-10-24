import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { bounties, claims } from "@/db/schema";
import { readPhoto } from "@/domain/work/work";
import { currentUser } from "@/lib/auth";

// Serves a proof photo to the worker who took it, the owner of the task, or an admin.
export async function GET(_req: Request, ctx: RouteContext<"/api/photos/[id]">) {
  const user = await currentUser();
  if (!user) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  const p = await readPhoto(db(), id);
  if (!p) return new Response(null, { status: 404 });
  let allowed = user.role === "admin" || p.ownerUserId === user.id;
  if (!allowed && user.role === "owner" && p.claimId) {
    const [c] = await db().select({ bountyId: claims.bountyId }).from(claims).where(eq(claims.id, p.claimId));
    const [b] = c ? await db().select({ ownerId: bounties.ownerId }).from(bounties).where(eq(bounties.id, c.bountyId)) : [];
    allowed = b?.ownerId === user.id;
  }
  if (!allowed) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(p.bytes), { headers: { "Content-Type": p.mime, "Cache-Control": "private, max-age=3600" } });
}
