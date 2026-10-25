import path from "node:path";
import type { Page } from "@playwright/test";

// Sample proof photos (HH-010): a fictional "Brevo EX-200" espresso machine. Checked against the
// real verifier: good-* pass and bad-* fail.
//   good-1 readable serial plate · good-2 front panel, power light on · good-3 whole machine
//   bad-1 blurry, unreadable plate · bad-2 wrong machine (drip coffee maker) · bad-3 machine off
export type SamplePhoto = "good-1" | "good-2" | "good-3" | "bad-1" | "bad-2" | "bad-3";

export function samplePhoto(name: SamplePhoto) {
  return path.resolve("e2e/photos", `${name}.jpg`);
}

/**
 * Takes a proof photo the way a worker does: "Take photo" gets a fresh code (the test browser has no
 * camera, so the page offers the phone's camera instead), then the file goes up under that code.
 * Returns the code shown on screen.
 */
export async function takePhoto(page: Page, label: string, file: string) {
  const card = page.locator(".card").filter({ has: page.locator("label", { hasText: label }) });
  await card.getByRole("button", { name: /^(Take photo|Retake photo|Get a new code)$/ }).click();
  const code = (await card.locator(".challenge-code").textContent({ timeout: 15_000 }))!.trim();
  await page.getByLabel(label, { exact: true }).setInputFiles(file);
  return code;
}
