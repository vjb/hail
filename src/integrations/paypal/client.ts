import { env, PAYPAL_API_BASE } from "@/lib/env";

// Thin typed client for the PayPal REST endpoints Hail uses (sandbox only).
// Shapes checked against PayPal's published OpenAPI specs (Orders v2, Payments v2,
// Payouts v1, Webhooks v1) on 2026-10-24.

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
    readonly debugId?: string,
  ) {
    super(message);
    this.name = "PayPalError";
  }
  /** PayPal's error `name`, e.g. DUPLICATE_REQUEST_ID, UNPROCESSABLE_ENTITY. */
  get errorName(): string | undefined {
    return (this.body as { name?: string } | undefined)?.name;
  }
}

type Fetch = typeof fetch;
let fetchImpl: Fetch = (...args) => fetch(...args);
/** Unit tests swap the HTTP boundary here. */
export function setPayPalFetch(f: Fetch) {
  fetchImpl = f;
  token = undefined;
}

let token: { value: string; expiresAt: number; scope: string } | undefined;

export async function getAccessToken(): Promise<{ value: string; scope: string }> {
  if (token && token.expiresAt > Date.now() + 60_000) return token;
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = env();
  const res = await fetchImpl(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = (await res.json()) as { access_token?: string; expires_in?: number; scope?: string };
  if (!res.ok || !body.access_token) throw new PayPalError("PayPal auth failed", res.status, body);
  token = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 300) * 1000, scope: body.scope ?? "" };
  return token;
}

async function call<T>(
  method: "GET" | "POST",
  path: string,
  opts: { body?: unknown; requestId?: string; prefer?: string } = {},
): Promise<T> {
  const t = await getAccessToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${t.value}`, "Content-Type": "application/json" };
  if (opts.requestId) headers["PayPal-Request-Id"] = opts.requestId;
  if (opts.prefer) headers["Prefer"] = opts.prefer;
  const res = await fetchImpl(`${PAYPAL_API_BASE}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const b = body as { message?: string; name?: string; debug_id?: string } | undefined;
    throw new PayPalError(
      `PayPal ${method} ${path} failed: ${res.status} ${b?.name ?? ""} ${b?.message ?? ""}`.trim(),
      res.status,
      body,
      b?.debug_id ?? res.headers.get("paypal-debug-id") ?? undefined,
    );
  }
  return body as T;
}

export const centsToValue = (cents: number): string => {
  if (!Number.isInteger(cents) || cents < 0) throw new Error(`Invalid cents amount: ${cents}`);
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
};

export const valueToCents = (value: string): number => {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!m) throw new Error(`Invalid money value: ${value}`);
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
};

type Link = { href: string; rel: string; method?: string };

export type Capture = { id: string; status: string; amount: { value: string; currency_code: string } };

export type Order = {
  id: string;
  status: string;
  links?: Link[];
  purchase_units?: Array<{ custom_id?: string; payments?: { captures?: Capture[] } }>;
};

/** POST /v2/checkout/orders — intent CAPTURE, USD. `requestId` is our idempotency key. */
export function createOrder(input: {
  amountCents: number;
  customId: string;
  description: string;
  requestId: string;
  returnUrl?: string;
  cancelUrl?: string;
}) {
  return call<Order>("POST", "/v2/checkout/orders", {
    requestId: input.requestId,
    prefer: "return=representation",
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.customId,
          custom_id: input.customId,
          description: input.description,
          amount: { currency_code: "USD", value: centsToValue(input.amountCents) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Hail",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            ...(input.returnUrl ? { return_url: input.returnUrl } : {}),
            ...(input.cancelUrl ? { cancel_url: input.cancelUrl } : {}),
          },
        },
      },
    },
  });
}

export const approvalLink = (o: Order) => o.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;

export const firstCapture = (o: Order): Capture | undefined => o.purchase_units?.[0]?.payments?.captures?.[0];

export function getOrder(orderId: string) {
  return call<Order>("GET", `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
}

export function captureOrder(orderId: string, requestId: string) {
  return call<Order>("POST", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    requestId,
    prefer: "return=representation",
    body: {},
  });
}

export type Refund = { id: string; status: string; amount?: { value: string; currency_code: string } };

export function refundCapture(captureId: string, amountCents: number, requestId: string, note?: string) {
  return call<Refund>("POST", `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
    requestId,
    prefer: "return=representation",
    body: { amount: { currency_code: "USD", value: centsToValue(amountCents) }, ...(note ? { note_to_payer: note } : {}) },
  });
}

export type PayoutBatch = {
  batch_header: {
    payout_batch_id: string;
    batch_status: string;
    sender_batch_header: { sender_batch_id: string };
  };
  items?: Array<{
    payout_item_id: string;
    transaction_status?: string;
    transaction_id?: string;
    payout_item: { sender_item_id?: string; receiver: string };
  }>;
};

/** POST /v1/payments/payouts — one item. `senderBatchId` is the idempotency key (PayPal rejects reuse for 30 days). */
export function createPayout(input: {
  senderBatchId: string;
  senderItemId: string;
  receiverEmail: string;
  amountCents: number;
  note: string;
  subject: string;
}) {
  return call<PayoutBatch>("POST", "/v1/payments/payouts", {
    requestId: input.senderBatchId,
    body: {
      sender_batch_header: { sender_batch_id: input.senderBatchId, email_subject: input.subject, recipient_type: "EMAIL" },
      items: [
        {
          recipient_type: "EMAIL",
          receiver: input.receiverEmail,
          amount: { currency: "USD", value: centsToValue(input.amountCents) },
          note: input.note,
          sender_item_id: input.senderItemId,
        },
      ],
    },
  });
}

export function getPayoutBatch(batchId: string) {
  return call<PayoutBatch>("GET", `/v1/payments/payouts/${encodeURIComponent(batchId)}`);
}

export type Webhook = { id: string; url: string; event_types: Array<{ name: string }> };

export function listWebhooks() {
  return call<{ webhooks: Webhook[] }>("GET", "/v1/notifications/webhooks");
}

export function createWebhook(url: string, eventTypes: string[]) {
  return call<Webhook>("POST", "/v1/notifications/webhooks", {
    body: { url, event_types: eventTypes.map((name) => ({ name })) },
  });
}

export const WEBHOOK_EVENT_TYPES = [
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.REFUNDED",
  "PAYMENT.PAYOUTS-ITEM.SUCCEEDED",
  "PAYMENT.PAYOUTS-ITEM.FAILED",
  "PAYMENT.PAYOUTS-ITEM.UNCLAIMED",
  "PAYMENT.PAYOUTS-ITEM.RETURNED",
  "PAYMENT.PAYOUTS-ITEM.BLOCKED",
  "PAYMENT.PAYOUTSBATCH.SUCCESS",
  "PAYMENT.PAYOUTSBATCH.DENIED",
];

/** POST /v1/notifications/verify-webhook-signature. Header names per PayPal's spec. */
export async function verifyWebhookSignature(headers: Headers, rawBody: string, webhookId: string): Promise<boolean> {
  const h = (n: string) => headers.get(n) ?? "";
  if (!h("paypal-transmission-id") || !h("paypal-transmission-sig") || !webhookId) return false;
  const res = await call<{ verification_status: "SUCCESS" | "FAILURE" }>(
    "POST",
    "/v1/notifications/verify-webhook-signature",
    {
      body: {
        auth_algo: h("paypal-auth-algo"),
        cert_url: h("paypal-cert-url"),
        transmission_id: h("paypal-transmission-id"),
        transmission_sig: h("paypal-transmission-sig"),
        transmission_time: h("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      },
    },
  );
  return res.verification_status === "SUCCESS";
}
