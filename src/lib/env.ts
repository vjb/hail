import { z } from "zod";

// Server-only configuration. Parsed lazily so `next build` works without secrets,
// but any code path that touches config fails fast with a clear message.
const schema = z.object({
  APP_BASE_URL: z.url(),
  SESSION_SECRET: z.string().min(32),
  SWEEP_SECRET: z.string().min(32),
  DEMO_TIME_SCALE: z.coerce.number().positive().default(1),
  // One-tap demo sign-in buttons (owner and the two workers, never admin). Set to false to hide them.
  DEMO_QUICK_SIGNIN: z.enum(["true", "false"]).default("true").transform((v) => v === "true"),
  DATABASE_URL: z.string().min(1),
  PAYPAL_ENV: z.literal("sandbox", { error: "PAYPAL_ENV must be 'sandbox'. Hail never talks to PayPal live." }),
  PAYPAL_CLIENT_ID: z.string().min(1),
  PAYPAL_CLIENT_SECRET: z.string().min(1),
  PAYPAL_WEBHOOK_ID: z.string().optional().default(""),
  // Connect PayPal (Log in with PayPal). Off until the feature is enabled on the sandbox app.
  PAYPAL_LOGIN_ENABLED: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  AI_PROVIDER: z.enum(["claude"]).default("claude"),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  AI_MODEL_SCREEN: z.string().min(1),
  AI_MODEL_VERIFY: z.string().min(1),
  AI_MODEL_OPS: z.string().min(1),
  CHANNEL3_API_KEY: z.string().optional().default(""),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid server configuration: ${problems}`);
  }
  cached = parsed.data;
  return cached;
}

/** Refuse to run against anything but the PayPal sandbox. Called at server start. */
export function assertSandbox(): void {
  if (process.env.PAYPAL_ENV !== "sandbox") {
    throw new Error("PAYPAL_ENV must be 'sandbox'. Hail never talks to PayPal live.");
  }
}

export const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";
