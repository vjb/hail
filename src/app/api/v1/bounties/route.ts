import { db } from "@/db/client";
import { bountyStatusEnum } from "@/db/schema";
import { createBounty, getBountyForOwner, listBountiesForOwner } from "@/domain/bounty/service";
import type { BountyStatus } from "@/domain/bounty/state";
import { createBountySchema, firstIssue, toCreateInput } from "@/domain/bounty/validation";
import { isSafeCallbackUrl } from "@/domain/callbacks/callbacks";
import { ApiError, apiJson, authenticate, decodeCursor, encodeCursor, handler, readJson, serializeBounty, withIdempotency } from "@/lib/api";

export const POST = handler(async (req: Request) => {
  const key = await authenticate(req);
  const body = await readJson(req);
  return withIdempotency(req, key, "/bounties", body, async () => {
    const parsed = createBountySchema.safeParse(body);
    if (!parsed.success) throw new ApiError("invalid_request", firstIssue(parsed.error));
    if (parsed.data.callback_url && !(await isSafeCallbackUrl(parsed.data.callback_url))) {
      throw new ApiError("invalid_request", "callback_url must be a public https URL.");
    }
    const b = await createBounty(db(), { ownerId: key.ownerId, apiKeyId: key.id, dailyCapCents: key.dailyCapCents, actor: `agent:${key.id}` }, toCreateInput(parsed.data));
    const row = await getBountyForOwner(db(), key.ownerId, b.id);
    return apiJson(await serializeBounty(row), 201);
  });
});

const PUBLIC_STATUSES = bountyStatusEnum.enumValues.filter((s) => s !== "created" && s !== "screening");

export const GET = handler(async (req: Request) => {
  const key = await authenticate(req);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  if (status && !(PUBLIC_STATUSES as string[]).includes(status)) throw new ApiError("invalid_request", `status must be one of: ${PUBLIC_STATUSES.join(", ")}`);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw === null ? 20 : Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new ApiError("invalid_request", "limit must be an integer from 1 to 100");
  const cursorRaw = url.searchParams.get("cursor");
  const cursor = cursorRaw ? decodeCursor(cursorRaw) : undefined;
  const { rows, more } = await listBountiesForOwner(db(), key.ownerId, { status: status as BountyStatus | undefined, limit, cursor });
  const data = await Promise.all(rows.map((r) => serializeBounty(r)));
  const last = rows[rows.length - 1];
  return apiJson({ data, next_cursor: more && last ? encodeCursor(last.createdAt, last.id) : null });
});
