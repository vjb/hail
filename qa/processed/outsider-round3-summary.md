# Summary — Round 3: Verify, Then Pay

## Executive Summary
In Round 3, the Outside Developer updated the `requester-agent` project to learn how to **spend money safely**:
1. It holds the buyer's money ($120.00 USD / 12,000 cents) via **PayPal Orders v2** with `intent: AUTHORIZE`.
2. The buyer approves the hold once in their sandbox browser.
3. The agent authorizes the order, locking the funds in escrow.
4. It hails a nearby human via **Hail MCP Server** (`create_bounty`) to inspect the target espresso machine on-site.
5. It monitors verification progress and acts on money **strictly based on Hail's documented `result.checklist_met`**:
   - **`checklist_met === true`**: Captures the authorization, then transfers the purchase payment to `SELLER_PAYPAL_EMAIL` via PayPal Payouts API (`POST /v1/payments/payouts`), logging `"Verified. Paying the seller."`
   - **`checklist_met === false`**: Immediately voids the authorization, logging `"Serial doesn't match the listing. Voiding the payment."` and `"The worker still got paid for honest work; that's expected."`
   - **Terminal unhappy paths (`blocked`, `expired`, `cancelled`, `rejected_by_owner`)**: Immediately voids the authorization with $0 charged to the buyer.
6. Prints a structured receipt detailing the hold, Hail inspection results, certificate URL, and financial movement.

---

## How Long Setup Took
- **Reading `RELEASE_NOTES_ROUND3.md`, updated `api.md`, and `BRIEF_ROUND3.md`**: ~5 minutes.
- **PayPal Sandbox OAuth & Orders v2/Payouts API validation**: ~8 minutes.
- **Implementing PayPal Client, updating Types, Config, and Workflow**: ~12 minutes.
- **Live verification against live Hail service and PayPal sandbox (Capture path & Void path via `--resume`)**: ~10 minutes.
- **Total Round 3 implementation & verification time**: ~35 minutes.

---

## What Worked Well

### 1. PayPal Orders v2 Sandbox Integration (Direct REST vs Agent Toolkit)
- **Tool Choice**: We chose **direct REST** over `@paypal/agent-toolkit`.
- **Why**: 
  - Direct REST with native `fetch` requires zero additional external dependencies and zero build churn.
  - Gives complete and granular control over mandatory headers like `PayPal-Request-Id` on every `POST`, ensuring absolute idempotency and preventing double-charges.
  - Provides direct visibility into PayPal error objects (`NAME`, `MESSAGE`, `DETAILS`), token lifetimes, and HTTP status codes.
- **Workflow**:
  - `POST /v2/checkout/orders` with `intent: "AUTHORIZE"` and `amount: { currency_code: "USD", value: "120.00" }` cleanly created order holds.
  - `POST /v2/checkout/orders/{id}/authorize` successfully generated authorizations (`status: "CREATED"`) with 29-day expirations.
  - `POST /v2/payments/authorizations/{id}/capture` captured held funds seamlessly into the agent account.
  - `POST /v1/payments/payouts` disbursed the purchase funds to the seller (`sb-is02s53470435@business.example.com`) with instant batch status confirmation.
  - `POST /v2/payments/authorizations/{id}/void` returned `204 No Content` and released the hold immediately.

### 2. Strict Financial Gating via `result.checklist_met`
- The separation between **worker acceptance** (`verification: "pass"` or `"owner_approved"`) and **item compliance** (`result.checklist_met: boolean`) works remarkably well.
- The worker is rightfully compensated for their honest physical trip and photo proof regardless of whether the item matches the seller's claims.
- The agent protects the buyer's balance by gating `captureAuthorization` solely on `result.checklist_met === true`.

### 3. Shareable Proof Certificate (`result.certificate_url`)
- The certificate link (e.g. `https://hail-g9h8.onrender.com/proof/bty_...`) provides an unauthenticated, public view containing itemized checklist outcomes and cryptographic SHA-256 hashes of each submitted photo.
- This allows the agent to attach tamper-proof verification receipts directly to its purchase or void records.

### 4. Resumption Support (`--resume <bounty_id>`)
- The `--resume` flag enables instantaneous, deterministic testing and demo recordings for both the capture and void paths on demand:
  - `npm run resume:capture` -> Resumes `bty_3X0z0CEq2ddtCH7j` (`checklist_met: true`), authorizes $120.00, captures the hold, and initiates the seller payout.
  - `npm run resume:void` -> Resumes `bty_I1rWqFKrfu13pNeh` (`checklist_met: false`), authorizes $120.00, identifies the unmet checklist criterion, and voids the hold.

---

## What Didn't Work / Friction Points
See [`FRICTION_LOG.md`](./FRICTION_LOG.md) for full entries. Summary of Round 3 friction:

1. **PayPal Hold vs Payouts Two-Step Architecture (`FL-09`)**:
   - `capture` on an authorization hold settles funds into the agent's merchant balance; it cannot capture directly into `SELLER_PAYPAL_EMAIL`. Paying the seller requires a second API call to PayPal Payouts (`POST /v1/payments/payouts`).
2. **Nullable `passed: null` Checklist Items (`FL-10`)**:
   - Live bounty `bty_I1rWqFKrfu13pNeh` contains `passed: null` with reason `"Glare covers the bottom line."` This causes `checklist_met` to be `false` even though no item explicitly returned `passed: false`. Agents must branch on `checklist_met` rather than checking for explicit `passed === false`.
3. **Authentication Ambiguity on `certificate_url` (`FL-11`)**:
   - `api.md` states photo URLs require `Authorization: Bearer`, leading to initial uncertainty whether `certificate_url` also required credentials. Testing proved `certificate_url` is a public HTML page accessible without headers.
4. **MCP `spots` Bound Schema (`FL-12`)**:
   - MCP `create_bounty` tool schema does not constrain `spots: 1`, leaving client-side schema validators unaware of the single-spot constraint until runtime.

---

## Live Verification Records

### Live Run 1: Void Path (`npm run resume:void`)
- **Order ID**: `9UC41769V0498940T` ($120.00 USD held)
- **Authorization ID**: `4AA87987KB250261W`
- **Bounty Resumed**: `bty_I1rWqFKrfu13pNeh`
- **Hail Result**: `status: "paid"`, `checklist_met: false`
- **Reason**: Unmet item ("South sign readable [INDETERMINATE]: Glare covers the bottom line.")
- **Decision & Narration**:
  - `Serial doesn't match the listing. Voiding the payment.`
  - `The worker still got paid for honest work; that's expected.`
  - `PayPal Authorization Voided! $0 charged to buyer.`
- **Result**: Successfully voided via `POST /v2/payments/authorizations/4AA87987KB250261W/void` (`HTTP 204`).

### Live Run 2: Capture & Seller Payout Path (`npm run resume:capture`)
- **Order ID**: `73L16682UP854325U` ($120.00 USD held)
- **Authorization ID**: `83K812033D205752L`
- **Bounty Resumed**: `bty_3X0z0CEq2ddtCH7j`
- **Hail Result**: `status: "paid"`, `checklist_met: true`
- **Proof Certificate**: `https://hail-g9h8.onrender.com/proof/bty_3X0z0CEq2ddtCH7j.Hde11cWniYqVqQglL8ILOB`
- **Decision & Narration**:
  - `Verified. Paying the seller.`
  - `PayPal Authorization Captured! Capture ID: 9NH18659WK846262U (Status: COMPLETED)`
  - `Seller Payout Initiated! Payout Batch ID: YDCSEKR2KWABJ (Status: PENDING)`
- **Result**: Successfully captured hold and disbursed $120.00 to `sb-is02s53470435@business.example.com`.

---

## api.md Update: "On-site tasks" & `result.distance_m`
- **On-site Geofencing**: Setting `lat` and `lng` on a bounty marks it as an on-site task requiring the worker to share location at submission time and be within `radius_m` (defaulting to 150m, minimum 100m, allowing up to 200m device GPS inaccuracy).
- **Address-only Tasks**: Tasks specifying only `address` skip coordinate enforcement.
- **`result.distance_m`**: Returns integer meters from the target coordinates (or `null` when no coordinates are set). The agent's TypeScript types (`types.ts`) and verification receipt display (`bounty-workflow.ts`) have been updated to support `distance_m`.
