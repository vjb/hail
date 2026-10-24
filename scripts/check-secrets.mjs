// Pre-commit guard: fails if any secret-looking value from .env, or a raw Hail API key,
// appears in the staged diff. Usage: node scripts/check-secrets.mjs
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const SAFE_KEYS = new Set(["APP_BASE_URL", "E2E_BASE_URL", "PAYPAL_ENV", "AI_PROVIDER", "DEMO_TIME_SCALE", "DATABASE_URL", "PAYPAL_WEBHOOK_ID"]);
const diff = execSync("git diff --cached --no-color", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const added = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n");

const hits = [];
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!m) continue;
    const [, key, value] = m;
    if (SAFE_KEYS.has(key) || key.startsWith("AI_MODEL") || value.length < 8) continue;
    if (key.endsWith("_EMAIL")) continue; // demo emails are listed in the README on purpose
    if (added.includes(value)) hits.push(key);
  }
}
if (/hail_sk_[A-Za-z0-9]{40}/.test(added)) hits.push("raw Hail API key");
if (/sk-ant-[A-Za-z0-9_-]{20,}/.test(added)) hits.push("Anthropic key pattern");

if (hits.length) {
  console.error(`Secret values staged: ${hits.join(", ")}`);
  process.exit(1);
}
console.log("no secrets staged");
