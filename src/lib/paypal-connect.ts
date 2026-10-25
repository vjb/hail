import { env } from "@/lib/env";

/** Short-lived cookie holding the worker's one-time Connect PayPal state. */
export const STATE_COOKIE = "hail_pp_state";

/** Where PayPal sends the worker back. Must match the Return URL set on the sandbox app. */
export const connectCallbackUrl = () => `${env().APP_BASE_URL.replace(/\/$/, "")}/work/paypal/callback`;
