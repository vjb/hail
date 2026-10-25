import path from "node:path";

// Sample proof photos (HH-010): a fictional "Brevo EX-200" espresso machine. Checked against the
// real verifier: good-* pass and bad-* fail.
//   good-1 readable serial plate · good-2 front panel, power light on · good-3 whole machine
//   bad-1 blurry, unreadable plate · bad-2 wrong machine (drip coffee maker) · bad-3 machine off
export type SamplePhoto = "good-1" | "good-2" | "good-3" | "bad-1" | "bad-2" | "bad-3";

export function samplePhoto(name: SamplePhoto) {
  return path.resolve("e2e/photos", `${name}.jpg`);
}
