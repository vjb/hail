import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  const md = await readFile(path.join(process.cwd(), "docs", "public", "api.md"), "utf8");
  return new Response(md, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
