/** Creates an API key for the demo owner. Usage: npm run key:create -- <name> <daily-cap-cents> [out-file] */
import { writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { closeDb, db } from "../src/db/client";
import { users } from "../src/db/schema";
import { createApiKey } from "../src/domain/keys/keys";

async function main() {
  const [name = "cli", cap = "10000", out] = process.argv.slice(2);
  const email = process.env.DEMO_OWNER_EMAIL!.toLowerCase();
  const [owner] = await db().select().from(users).where(eq(users.email, email));
  if (!owner) throw new Error("Demo owner not found; run npm run db:seed");
  const k = await createApiKey(db(), { ownerId: owner.id, name, dailyCapCents: Number(cap) });
  if (out) {
    writeFileSync(out, k.raw);
    console.log(`Key ${k.id} written to ${out}`);
  } else console.log(k.raw);
}
main().finally(() => closeDb());
