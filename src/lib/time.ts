// Timers scaled by DEMO_TIME_SCALE so demos can show expiry and auto-pay quickly.
const scale = () => {
  const s = Number(process.env.DEMO_TIME_SCALE ?? "1");
  return Number.isFinite(s) && s > 0 ? s : 1;
};

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

/** Default windows from the architecture, before scaling. */
export const WINDOWS = {
  claim: 60 * MINUTE,
  claimRetakeExtension: 10 * MINUTE,
  review: 24 * HOUR,
  appeal: 24 * HOUR,
} as const;

export const scaled = (ms: number) => Math.max(1000, Math.round(ms / scale()));

export const fromNow = (ms: number) => new Date(Date.now() + scaled(ms));
