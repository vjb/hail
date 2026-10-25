/**
 * Reuse check eval (same-photo-v1): proof-fraud round 2's edited copies of one earlier photo must be
 * matched to it; unrelated photos and fresh shots of the same kind of place or object must not be.
 * Usage: npm run eval:reuse
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ai } from "../src/ai";
import { SAME_PHOTO_PROMPT_VERSION } from "../src/ai/prompts/same-photo";
import { closeDb } from "../src/db/client";

const load = async (p: string) =>
  (
    await sharp(readFileSync(path.resolve(p)))
      .rotate()
      .resize(1000, 1000, { fit: "inside" })
      .jpeg({ quality: 85 })
      .toBuffer()
  ).toString("base64");
const R = (n: string) => `tests/proof/reuse/${n}.jpg`;
const BASE = R("pf-017");
const FILLER = [
  "src/db/demo-photos/bike-frame.jpg",
  "src/db/demo-photos/parking-north.jpg",
  "e2e/photos/good-2.jpg",
];

type Case = { id: string; photo: string; earlier: string[]; match: boolean };
const attacks = [
  "pf-025",
  "pf-026",
  "pf-031",
  "pf-033",
  "pf-034",
  "pf-035",
  "pf-036",
  "pf-037",
  "pf-038",
];
const CASES: Case[] = [
  // The base sits at a different position each time, among unrelated earlier photos.
  ...attacks.map((a, i) => ({
    id: a.toUpperCase(),
    photo: R(a),
    earlier: [...FILLER.slice(0, i % 4), BASE, ...FILLER.slice(i % 4)],
    match: true,
  })),
  {
    id: "N-fresh-scene",
    photo: R("pf-024"),
    earlier: [BASE, ...FILLER],
    match: false,
  },
  {
    id: "N-other-object",
    photo: R("pf-016"),
    earlier: [BASE, ...FILLER],
    match: false,
  },
  {
    id: "N-same-bike-new-shot",
    photo: "tests/proof/generated/bike-whole-code.jpg",
    earlier: [
      "tests/proof/generated/bike-serial-code.jpg",
      "src/db/demo-photos/bike-tires.jpg",
      BASE,
    ],
    match: false,
  },
  {
    id: "N-same-bike-tires",
    photo: "src/db/demo-photos/bike-tires.jpg",
    earlier: [
      "src/db/demo-photos/bike-frame.jpg",
      "tests/proof/generated/bike-serial-code.jpg",
      BASE,
    ],
    match: false,
  },
  {
    id: "N-same-square",
    photo: "tests/proof/generated/times-square-code.jpg",
    earlier: [
      "e2e/photos/good-3.jpg",
      "docs/assets/hail-street-hero.jpg",
      BASE,
    ],
    match: false,
  },
  {
    id: "N-same-lot-new-shot",
    photo: "src/db/demo-photos/parking-south.jpg",
    earlier: ["src/db/demo-photos/parking-north.jpg", BASE],
    match: false,
  },
  {
    id: "N-shelf-price",
    photo: "src/db/demo-photos/oat-price.jpg",
    earlier: [
      "src/db/demo-photos/bakery-hours.jpg",
      BASE,
      "e2e/photos/good-3.jpg",
    ],
    match: false,
  },
  {
    id: "N-street",
    photo: "e2e/photos/good-1.jpg",
    earlier: [
      "docs/assets/hail-street-hero.jpg",
      "e2e/photos/good-3.jpg",
      BASE,
    ],
    match: false,
  },
];

async function main() {
  let right = 0;
  for (const c of CASES) {
    const r = await ai().comparePhotos({
      photos: [await load(c.photo)],
      earlier: await Promise.all(c.earlier.map(load)),
    });
    if (!r.ok) {
      console.log(`${c.id}: ERROR ${r.error}`);
      continue;
    }
    const got = r.value.matches.length > 0;
    const ok =
      got === c.match &&
      (!got || c.earlier[r.value.matches[0].earlier - 1] === BASE || !c.match);
    if (ok) right++;
    console.log(
      `${ok ? "ok  " : "MISS"} ${c.id}: expected ${c.match ? "match" : "none"}, got ${got ? `match earlier ${r.value.matches.map((m) => m.earlier).join(",")}: ${r.value.matches[0].shared_details.slice(0, 140)}` : "none"}`,
    );
  }
  console.log(`\n${SAME_PHOTO_PROMPT_VERSION}: ${right}/${CASES.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
