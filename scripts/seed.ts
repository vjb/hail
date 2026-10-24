import { closeDb, db } from "../src/db/client";
import { seedBase, wipeAll } from "../src/db/seed";

async function main() {
  const fresh = process.argv.includes("--fresh");
  if (fresh) await wipeAll(db());
  const r = await seedBase(db());
  console.log(`Seeded owner ${r.ownerId}, workers ${r.worker1Id} / ${r.worker2Id}, admin ${r.adminId}`);
  if (r.apiKey) console.log(`Demo API key (shown once): ${r.apiKey}`);
  else console.log("Owner already has an API key; none created.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
