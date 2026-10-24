import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Generated proof photos for e2e (real sample photos from the human replace these on Day 10).
export async function makePhoto(name: string, lines: string[], color = "#2a2d33") {
  const dir = path.resolve("e2e/artifacts/fixtures");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.jpg`);
  const text = lines.map((l, i) => `<text x="80" y="${200 + i * 110}" font-size="84" font-family="Arial" font-weight="700" fill="#f4f1ea">${l}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><rect width="1600" height="1200" fill="#8a8f98"/><rect x="40" y="60" width="1520" height="${140 + lines.length * 110}" rx="24" fill="${color}"/>${text}</svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toFile(file);
  return file;
}
