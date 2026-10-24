// Local stand-in for the Render cron job: runs the sweeper every N seconds (default 20).
// Usage: npm run sweep:loop [-- 20]
const every = Number(process.argv[2] ?? 20) * 1000;
const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
const secret = process.env.SWEEP_SECRET;
if (!secret) throw new Error("SWEEP_SECRET must be set");
async function tick() {
  try {
    const res = await fetch(new URL("/api/internal/sweep", base), { method: "POST", headers: { "x-sweep-secret": secret } });
    const body = await res.text();
    const quiet = res.ok && !/"[a-zA-Z]+":[1-9]/.test(body.replace(/"payoutsChecked":\d+,?/, ""));
    if (!quiet) console.log(new Date().toLocaleTimeString(), res.status, body);
  } catch (e) {
    console.log(new Date().toLocaleTimeString(), "sweep failed:", e.message);
  }
}
await tick();
setInterval(tick, every);
