// Runs in each test worker: point the app's DB client at the test database and give it test config.
const base = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/hail";
const url = new URL(base);
url.pathname = `/${url.pathname.slice(1) || "hail"}_test`;

Object.assign(process.env, {
  DATABASE_URL: url.toString(),
  APP_BASE_URL: "http://localhost:3000",
  SESSION_SECRET: "test-session-secret-test-session-secret-0000",
  SWEEP_SECRET: "test-sweep-secret-test-sweep-secret-00000000",
  PAYPAL_ENV: "sandbox",
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || "test-client",
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || "test-secret",
  AI_MODEL_SCREEN: "test-model",
  AI_MODEL_VERIFY: "test-model",
  AI_MODEL_OPS: "test-model",
  DEMO_TIME_SCALE: "1",
});
