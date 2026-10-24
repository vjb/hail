import { db } from "@/db/client";
import { spentTodayCents } from "@/domain/bounty/service";
import { getBalances } from "@/domain/ledger/ledger";
import { apiJson, authenticate, handler } from "@/lib/api";

export const GET = handler(async (req: Request) => {
  const key = await authenticate(req);
  const [bal, spent] = await Promise.all([getBalances(db(), key.ownerId), spentTodayCents(db(), key.id)]);
  return apiJson({ available_cents: bal.availableCents, held_cents: bal.heldCents, daily_cap_cents: key.dailyCapCents, spent_today_cents: spent });
});
