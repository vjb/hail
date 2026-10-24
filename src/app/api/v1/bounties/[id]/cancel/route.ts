import { db } from "@/db/client";
import { cancelBounty, getBountyForOwner } from "@/domain/bounty/service";
import { apiJson, authenticate, handler, readJson, serializeBounty, withIdempotency } from "@/lib/api";

export const POST = handler(async (req: Request, ctx: RouteContext<"/api/v1/bounties/[id]/cancel">) => {
  const key = await authenticate(req);
  const { id } = await ctx.params;
  const body = await readJson(req);
  return withIdempotency(req, key, `/bounties/${id}/cancel`, body, async () => {
    await cancelBounty(db(), key.ownerId, id, `agent:${key.id}`);
    return apiJson(await serializeBounty(await getBountyForOwner(db(), key.ownerId, id)));
  });
});
