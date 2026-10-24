import { defineConfig, devices } from "@playwright/test";

// E2E runs against E2E_BASE_URL (local dev server by default, or the Render URL).
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  outputDir: "e2e/artifacts",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    // Uses the installed Chrome locally; CI can switch to bundled Chromium.
    channel: process.env.PW_CHANNEL ?? "chrome",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL ?? "chrome", viewport: { width: 1440, height: 900 } } },
  ],
});
