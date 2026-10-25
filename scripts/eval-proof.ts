/**
 * Runs the labeled proof set (tests/proof/cases.ts) through the real verifier (verify-v2) and reports
 * accuracy and auto-paid fakes (the gate: zero). Cases whose real photos aren't in
 * tests/proof/photos/ yet are listed as waiting. Appends one row to qa/proof-eval-history.csv.
 * Usage: npm run eval:proof [-- --only G]
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ai } from "../src/ai";
import { VERIFY_PROMPT_VERSION } from "../src/ai/prompts/verification";
import { interpret } from "../src/domain/verify/verify";
import { normalizePhoto } from "../src/domain/work/work";
import { CASES, type ProofCase } from "../tests/proof/cases";

const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

const e2ePhoto = (name: string) => readFileSync(path.resolve("e2e/photos", `${name}.jpg`));
const realPath = (name: string) => path.resolve("tests/proof/photos", `${name}.jpg`);

/** The sample photo displayed on a monitor: dark bezel, visible pixel grid and moiré. */
async function onScreen(src: Buffer) {
  const inner = await sharp(src).resize(1200, 900, { fit: "cover" }).modulate({ brightness: 1.15 }).toBuffer();
  const grid = Buffer.from(
    `<svg width="1200" height="900" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="p" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="1" height="3" fill="#000" fill-opacity="0.18"/></pattern><pattern id="m" width="23" height="23" patternUnits="userSpaceOnUse" patternTransform="rotate(17)"><rect width="11" height="23" fill="#7af" fill-opacity="0.07"/></pattern></defs><rect width="1200" height="900" fill="url(#p)"/><rect width="1200" height="900" fill="url(#m)"/></svg>`,
  );
  const screen = await sharp(inner).composite([{ input: grid }]).toBuffer();
  return sharp({ create: { width: 1400, height: 1100, channels: 3, background: "#151515" } })
    .composite([{ input: screen, left: 100, top: 90 }])
    .jpeg({ quality: 85 })
    .toBuffer();
}

/** The requested code pasted onto the photo digitally, as a cheater might. */
async function overlay(src: Buffer, code: string) {
  const img = sharp(src).resize(1400, 1050, { fit: "cover" });
  const label = Buffer.from(
    `<svg width="360" height="140" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="352" height="132" rx="6" fill="#fbfaf4" stroke="#ccc"/><text x="180" y="92" font-family="Segoe Print, Comic Sans MS, cursive" font-size="58" text-anchor="middle" fill="#1d2b8f">${code}</text></svg>`,
  );
  return img.composite([{ input: label, left: 980, top: 860 }]).jpeg({ quality: 88 }).toBuffer();
}

async function load(src: string, code: string | null): Promise<Buffer | null> {
  const [kind, a, b] = src.split(":");
  if (kind === "e2e") return e2ePhoto(a);
  if (kind === "real") return existsSync(realPath(a)) ? readFileSync(realPath(a)) : null;
  if (kind === "synth" && a === "screen") return onScreen(e2ePhoto(b));
  if (kind === "synth" && a === "overlay") return overlay(e2ePhoto(b), code ?? "KTR-482");
  throw new Error(`Unknown photo source ${src}`);
}

type Row = { c: ProofCase; got: string; met: boolean | null; ok: boolean; autoPaidFake: boolean; detail: string };

async function run(c: ProofCase): Promise<Row | "waiting"> {
  const buffers = await Promise.all(c.photos.map((p) => load(p.src, p.code)));
  if (buffers.some((x) => !x)) return "waiting";
  const norm = await Promise.all(buffers.map((x) => normalizePhoto(x!)));
  const r = await ai().verifyProof({
    bounty: { title: c.title, instructions: c.instructions, acceptanceChecklist: c.checklist, product: null },
    photos: c.photos.map((p, i) => ({ label: p.label, base64: norm[i].bytes.toString("base64"), challengeCode: p.code })),
    notes: null,
    distanceMeters: null,
  });
  if (!r.ok) return { c, got: "uncertain", met: null, ok: c.expect === "no_autopay", autoPaidFake: false, detail: `AI error: ${r.error}` };
  const v = interpret(r.value, c.checklist, c.photos.map((p) => ({ code: p.code, source: "camera" })));
  const met = v.items.every((x) => x.passed === true);
  const ok =
    c.expect === "pay" ? v.result === "pass" && met : c.expect === "pay_unmet" ? v.result === "pass" && !met : c.expect === "reject" ? v.result === "fail" : v.result !== "pass";
  const autoPaidFake = (c.expect === "no_autopay" || c.expect === "reject") && v.result === "pass";
  const checks = (v.proofChecks?.photos ?? []).map((p) => `code=${p.code}${p.screen ? " SCREEN" : ""}${p.generatedOrEdited ? " GEN/EDIT" : ""}`).join(" | ");
  const items = v.items.map((x) => (x.passed === true ? "P" : x.passed === false ? (x.cause === "item" ? "I" : "F") : "?")).join("");
  return { c, got: v.result, met, ok, autoPaidFake, detail: `items=${items} ${checks}${v.doubts.length ? `\n            doubts: ${v.doubts.join(" ")}` : ""}` };
}

async function main() {
  const cases = only ? CASES.filter((c) => c.id.startsWith(only)) : CASES;
  const out = await Promise.all(cases.map(async (c) => ({ c, r: await run(c) })));
  const rows = out.filter((x): x is { c: ProofCase; r: Row } => x.r !== "waiting").map((x) => x.r);
  const waiting = out.filter((x) => x.r === "waiting").map((x) => x.c.id);
  for (const r of rows) {
    const mark = r.autoPaidFake ? "AUTO-PAID-FAKE" : r.ok ? "ok" : "miss";
    console.log(`${mark.padEnd(14)} ${r.c.id.padEnd(3)} expected=${r.c.expect.padEnd(10)} got=${r.got.padEnd(9)} ${r.c.note}\n            ${r.detail}`);
  }
  const correct = rows.filter((r) => r.ok).length;
  const fakes = rows.filter((r) => r.autoPaidFake).length;
  const pct = rows.length ? Math.round((correct / rows.length) * 1000) / 10 : 0;
  console.log(`\nProof eval (${VERIFY_PROMPT_VERSION}): ${correct}/${rows.length} correct (${pct}%), auto-paid fakes: ${fakes}.`);
  if (waiting.length) console.log(`Waiting for real photos in tests/proof/photos/: ${waiting.join(", ")}`);
  if (!existsSync("qa")) mkdirSync("qa");
  const csv = "qa/eval-history.csv";
  if (!existsSync(csv)) writeFileSync(csv, "at,eval,prompt_version,cases,correct,pct,false_allows_or_fakes,notes\n");
  appendFileSync(csv, `${new Date().toISOString()},proof,${VERIFY_PROMPT_VERSION},${rows.length},${correct},${pct},${fakes},${waiting.length ? `waiting:${waiting.join(" ")}` : ""}\n`);
  process.exit(fakes === 0 ? 0 : 1);
}

main();
