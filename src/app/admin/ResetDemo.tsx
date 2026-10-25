"use client";

import { useState } from "react";
import { FormError } from "@/components/ui";

export function ResetDemo() {
  const [sure, setSure] = useState(false);
  const [state, setState] = useState<{ busy?: boolean; ok?: string; error?: string }>({});
  return (
    <div className="stack-sm">
      <label className="row" style={{ gap: "var(--s-2)", flexWrap: "nowrap", alignItems: "flex-start" }}>
        <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} style={{ width: 20, height: 20, flex: "none", marginTop: 2 }} />
        I understand this deletes all tasks, balances, keys and payouts, and restores the demo story.
      </label>
      <div>
        <button
          type="button"
          className="btn btn-danger"
          disabled={!sure || state.busy}
          onClick={async () => {
            setState({ busy: true });
            try {
              const res = await fetch("/api/admin/reset-demo", { method: "POST" });
              const body = await res.json().catch(() => ({}));
              setState(res.ok ? { ok: `Demo reset in ${(body.ms / 1000).toFixed(1)} s. Everyone needs to sign in again.` } : { error: "The reset didn't finish. Try again." });
              setSure(false);
            } catch {
              setState({ error: "The reset didn't finish. Try again." });
            }
          }}
        >
          {state.busy ? "Resetting…" : "Reset demo data"}
        </button>
      </div>
      <div aria-live="polite">
        {state.ok && <p className="badge">{state.ok}</p>}
        {state.error && <FormError>{state.error}</FormError>}
      </div>
    </div>
  );
}
