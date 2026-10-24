import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { centsToValue, createOrder, createPayout, PayPalError, setPayPalFetch, valueToCents } from "./client";

describe("money conversion", () => {
  it("formats integer cents as PayPal values", () => {
    expect(centsToValue(0)).toBe("0.00");
    expect(centsToValue(5)).toBe("0.05");
    expect(centsToValue(2500)).toBe("25.00");
    expect(centsToValue(1999)).toBe("19.99");
  });
  it("rejects non-integer and negative cents", () => {
    expect(() => centsToValue(1.5)).toThrow();
    expect(() => centsToValue(-1)).toThrow();
  });
  it("parses PayPal values into cents without floats", () => {
    expect(valueToCents("20.00")).toBe(2000);
    expect(valueToCents("0.1")).toBe(10);
    expect(valueToCents("19.99")).toBe(1999);
    expect(valueToCents("7")).toBe(700);
    expect(() => valueToCents("1.234")).toThrow();
  });
});

describe("PayPal HTTP boundary", () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  beforeEach(() => {
    Object.assign(process.env, {
      APP_BASE_URL: "http://localhost:3000",
      SESSION_SECRET: "x".repeat(32),
      SWEEP_SECRET: "y".repeat(32),
      DATABASE_URL: "postgres://x",
      PAYPAL_ENV: "sandbox",
      PAYPAL_CLIENT_ID: "id",
      PAYPAL_CLIENT_SECRET: "secret",
      AI_MODEL_SCREEN: "m",
      AI_MODEL_VERIFY: "m",
      AI_MODEL_OPS: "m",
    });
    calls.length = 0;
    setPayPalFetch(async (input, init) => {
      const url = String(input);
      calls.push({ url, init: init ?? {} });
      if (url.endsWith("/v1/oauth2/token")) return Response.json({ access_token: "tok", expires_in: 3600, scope: "x" });
      if (url.endsWith("/v1/payments/payouts")) return Response.json({ name: "USER_BUSINESS_ERROR", message: "dup" }, { status: 400 });
      return Response.json({ id: "ORDER1", status: "CREATED" }, { status: 201 });
    });
  });
  afterEach(() => setPayPalFetch((...a) => fetch(...a)));

  it("sends the idempotency key and only talks to the sandbox", async () => {
    await createOrder({ amountCents: 2500, customId: "own_1", description: "d", requestId: "topup_abc" });
    const order = calls.find((c) => c.url.endsWith("/v2/checkout/orders"))!;
    expect(order.url.startsWith("https://api-m.sandbox.paypal.com/")).toBe(true);
    expect((order.init.headers as Record<string, string>)["PayPal-Request-Id"]).toBe("topup_abc");
    const body = JSON.parse(String(order.init.body));
    expect(body.purchase_units[0].amount).toEqual({ currency_code: "USD", value: "25.00" });
    expect(calls.every((c) => c.url.startsWith("https://api-m.sandbox.paypal.com/"))).toBe(true);
  });

  it("surfaces PayPal error names", async () => {
    const err = await createPayout({
      senderBatchId: "payout_b1",
      senderItemId: "b1",
      receiverEmail: "w@example.com",
      amountCents: 100,
      note: "n",
      subject: "s",
    }).catch((e) => e);
    expect(err).toBeInstanceOf(PayPalError);
    expect(err.errorName).toBe("USER_BUSINESS_ERROR");
  });
});
