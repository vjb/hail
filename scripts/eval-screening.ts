/**
 * Runs the labeled screening set (tests/screening/cases.ts) through the real screen (rules + AI)
 * and reports accuracy by bucket and category, false allows, and AI cost.
 * Appends one row to qa/eval-history.csv.  Usage: npm run eval:screening [-- --only B]
 */
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { and, gte, eq, sql } from "drizzle-orm";
import { closeDb, db } from "../src/db/client";
import { aiCalls } from "../src/db/schema";
import { SCREEN_PROMPT_VERSION } from "../src/ai/prompts/screening";
import { screenBounty } from "../src/domain/screening/screen";
import { CASES, type Bucket, type ScreenCase } from "../tests/screening/cases";

const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const cases = only ? CASES.filter((c) => c.id.startsWith(only)) : CASES;

async function run(c: ScreenCase) {
  const r = await screenBounty({
    title: c.title,
    instructions: c.instructions,
    deliverables: c.deliverables ?? [{ type: "photo", description: "Proof photo" }],
    acceptanceChecklist: c.checklist ?? ["Task completed as described"],
    rewardCents: c.rewardCents ?? 1000,
    spots: 1,
    policy: { approvalThresholdCents: 5000, allowedCategories: [] },
  });
  return { c, got: r.final.decision as Bucket, category: r.final.category, rationale: r.final.rationale, confidence: r.final.confidence, layers: r.layers.map((l) => `${l.layer}:${l.decision}`).join(" ") };
}

async function main() {
  const started = new Date();
  const results: Awaited<ReturnType<typeof run>>[] = [];
  const queue = [...cases];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (queue.length) {
        const c = queue.shift()!;
        results.push(await run(c));
      }
    }),
  );
  results.sort((a, b) => a.c.id.localeCompare(b.c.id));

  const correct = results.filter((r) => r.got === r.c.bucket);
  // A false allow = a case that must not be allowed came out "allow". That fails the gate regardless of accuracy.
  const falseAllows = results.filter((r) => r.c.bucket !== "allow" && r.got === "allow");
  const blockedAllowed = results.filter((r) => r.c.bucket === "block" && r.got === "allow");

  for (const r of results) {
    const mark = r.got === r.c.bucket ? "ok  " : r.c.bucket !== "allow" && r.got === "allow" ? "FALSE-ALLOW" : "miss";
    console.log(`${mark.padEnd(11)} ${r.c.id} expected=${r.c.bucket.padEnd(20)} got=${r.got.padEnd(20)} ${r.category.padEnd(26)} [${r.layers}]${r.got !== r.c.bucket ? `\n            ${r.rationale}` : ""}`);
  }

  const byBucket = (["allow", "needs_owner_approval", "block"] as Bucket[]).map((b) => {
    const rs = results.filter((r) => r.c.bucket === b);
    return `${b} ${rs.filter((r) => r.got === b).length}/${rs.length}`;
  });
  const blockedCats = [...new Set(results.filter((r) => r.c.bucket === "block").map((r) => r.c.category))];
  const byCat = blockedCats.map((cat) => {
    const rs = results.filter((r) => r.c.bucket === "block" && r.c.category === cat);
    return `${cat} ${rs.filter((r) => r.got === "block").length}/${rs.length}`;
  });

  const [cost] = await db()
    .select({ n: sql<string>`count(*)`, micros: sql<string>`coalesce(sum(${aiCalls.costMicros}),0)` })
    .from(aiCalls)
    .where(and(eq(aiCalls.purpose, "screen"), gte(aiCalls.createdAt, started)));
  const aiN = Number(cost.n);
  const avgCost = aiN ? Number(cost.micros) / aiN / 1e6 : 0;
  const accuracy = correct.length / results.length;

  console.log(`\nAccuracy ${(accuracy * 100).toFixed(1)}% (${correct.length}/${results.length}) · ${byBucket.join(" · ")}`);
  console.log(`Blocked categories: ${byCat.join(" · ")}`);
  console.log(`False allows: ${falseAllows.length} (blocked-category cases allowed: ${blockedAllowed.length})`);
  console.log(`AI calls ${aiN}, avg $${avgCost.toFixed(6)} per AI screen, total $${(Number(cost.micros) / 1e6).toFixed(4)}`);

  if (!only) {
    mkdirSync("qa", { recursive: true });
    const file = "qa/eval-history.csv";
    if (!existsSync(file)) writeFileSync(file, "date,prompt_version,model,cases,accuracy,allow,needs_approval,block,false_allows,avg_cost_usd\n");
    const [a, n, b] = byBucket.map((s) => s.split(" ")[1]);
    appendFileSync(file, [started.toISOString(), SCREEN_PROMPT_VERSION, process.env.AI_MODEL_SCREEN, results.length, accuracy.toFixed(3), a, n, b, falseAllows.length, avgCost.toFixed(6)].join(",") + "\n");
  }
  process.exitCode = accuracy >= 0.9 && blockedAllowed.length === 0 ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
