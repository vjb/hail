// Render cron job: asks the web service to run the sweeper. Needs APP_BASE_URL and SWEEP_SECRET.
const base = process.env.APP_BASE_URL;
const secret = process.env.SWEEP_SECRET;
if (!base || !secret) {
  console.error("APP_BASE_URL and SWEEP_SECRET must be set");
  process.exit(1);
}
const res = await fetch(new URL("/api/internal/sweep", base), { method: "POST", headers: { "x-sweep-secret": secret } });
console.log(`sweep ${res.status} ${await res.text()}`);
if (!res.ok) process.exit(1);
