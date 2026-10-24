"use client";

import { INSTANCE_LOADING_STATE, PayPalOneTimePaymentButton, PayPalProvider, usePayPal } from "@paypal/react-paypal-js/sdk-v6";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError, formatMoney } from "@/components/ui";
import { captureTopupOrderAction, createTopupOrderAction } from "./actions";

const PRESETS = [2500, 5000, 10000, 20000];

type Notice = { kind: "ok" | "info" | "error"; text: string } | null;

export function TopUp({ clientId }: { clientId: string }) {
  const [amount, setAmount] = useState(5000);
  const [custom, setCustom] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const customCents = custom ? Math.round(Number(custom) * 100) : null;
  const chosen = customCents ?? amount;
  const valid = Number.isInteger(chosen) && chosen >= 500 && chosen <= 100_000;

  return (
    <section className="card stack" aria-labelledby="topup-heading">
      <div>
        <h2 id="topup-heading">Add funds</h2>
        <p className="muted">Pay once with PayPal. Your agents spend from this balance, and each task&apos;s pay is set aside when it&apos;s posted.</p>
      </div>
      <fieldset className="stack-sm" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="balance-label" style={{ marginBottom: "var(--s-2)" }}>
          Amount
        </legend>
        <div className="row" role="radiogroup" aria-label="Amount">
          {PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={!custom && amount === c}
              className={`btn ${!custom && amount === c ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                setCustom("");
                setAmount(c);
              }}
            >
              <span className="money">{formatMoney(c)}</span>
            </button>
          ))}
        </div>
        <div className="field" style={{ maxWidth: 220 }}>
          <label htmlFor="custom-amount">Or another amount (USD)</label>
          <input id="custom-amount" inputMode="decimal" placeholder="e.g. 75" value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))} aria-describedby="amount-hint" />
          <span id="amount-hint" className="hint">
            Between $5 and $1,000.
          </span>
        </div>
      </fieldset>

      {!valid && <FormError>Choose an amount between $5.00 and $1,000.00.</FormError>}

      <div aria-live="polite">
        {notice && (notice.kind === "error" ? <FormError>{notice.text}</FormError> : <p className={notice.kind === "ok" ? "badge" : "muted"}>{notice.text}</p>)}
      </div>

      <div style={{ maxWidth: 360 }} aria-busy={busy}>
        <p className="balance-label">
          Pay <span className="money">{valid ? formatMoney(chosen) : "—"}</span> with PayPal
        </p>
        <PayPalProvider clientId={clientId} environment="sandbox" components={["paypal-payments"]} pageType="checkout">
          <PayPalButton
            disabled={!valid || busy}
            createOrder={async () => {
              setNotice(null);
              const r = await createTopupOrderAction(chosen);
              if (!r.ok) {
                setNotice({ kind: "error", text: r.error });
                throw new Error(r.error);
              }
              return { orderId: r.data.orderId };
            }}
            onApprove={async (orderId) => {
              setBusy(true);
              try {
                const r = await captureTopupOrderAction(orderId);
                if (r.ok) {
                  setNotice({ kind: "ok", text: `${formatMoney(r.data.amountCents)} added to your balance.` });
                  router.refresh();
                } else setNotice({ kind: "error", text: r.error });
              } finally {
                setBusy(false);
              }
            }}
            onCancel={() => setNotice({ kind: "info", text: "You closed PayPal without paying. Nothing was added." })}
            onError={() => setNotice((n) => n ?? { kind: "error", text: "PayPal ran into a problem. Nothing was added. Please try again." })}
          />
        </PayPalProvider>
      </div>
    </section>
  );
}

function PayPalButton(props: {
  disabled: boolean;
  createOrder: () => Promise<{ orderId: string }>;
  onApprove: (orderId: string) => Promise<void>;
  onCancel: () => void;
  onError: () => void;
}) {
  const { loadingStatus, error } = usePayPal();
  if (error) return <FormError>PayPal couldn&apos;t load. Check your connection and reload the page.</FormError>;
  if (loadingStatus !== INSTANCE_LOADING_STATE.RESOLVED) return <p className="muted">Loading PayPal…</p>;
  return (
    <PayPalOneTimePaymentButton
      type="pay"
      presentationMode="popup"
      disabled={props.disabled}
      createOrder={props.createOrder}
      onApprove={async ({ orderId }) => props.onApprove(orderId)}
      onCancel={props.onCancel}
      onError={props.onError}
    />
  );
}
