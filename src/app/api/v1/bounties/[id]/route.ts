import { db } from "@/db/client";
import { getBountyForOwner } from "@/domain/bounty/service";
import { apiJson, authenticate, handler, serializeBounty } from "@/lib/api";

export const GET = handler(async (req: Request, ctx: RouteContext<"/api/v1/bounties/[id]">) => {
  const key = await authenticate(req);
  const { id } = await ctx.params;
  const b = await getBountyForOwner(db(), key.ownerId, id);
  return apiJson(await serializeBounty(b));
});
