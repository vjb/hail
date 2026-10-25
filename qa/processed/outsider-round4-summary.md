# Summary — Round 4: Hidden Values, Tightened Location Rules, and Dynamic Money Paths

## Executive Summary
In Round 4, the Outside Developer retested every item in `RELEASE_NOTES_ROUND4.md` against `api.md` and the live service (`https://hail-g9h8.onrender.com`), adopted **Hidden Values** (`{ item, expected }`) in the `requester-agent` verify-then-pay workflow, verified all documented validation errors (`expected > 120 chars`, `lat` without `lng`, `radius_m` without coordinates, `radius_m: 50`), cancelled every newly posted test bounty via `POST /bounties/{id}/cancel`, and executed both PayPal Sandbox money paths (`hold → capture → pay the seller` and `hold → void`) by dynamically discovering `paid` bounties via `GET /bounties?status=paid`.

---

## How Long It Took
- **Reading `go.md`, `RELEASE_NOTES_ROUND4.md`, and refreshed `api.md`**: ~2 minutes.
- **Retesting release notes (`FL-10`, `FL-11`, `FL-12`, Hidden values, and Location rules) against live API & MCP**: ~3 minutes.
- **Updating `requester-agent` (TypeScript types, hidden-value checklist generation, narration, `PayPal-Request-Id` on Payouts, dynamic `--resume` discovery, and `test:round4` suite)**: ~4 minutes.
- **Executing live REST & MCP hidden-value bounty creation, `GET /bounties/{id}` verification, and `POST /bounties/{id}/cancel` cleanup**: ~2 minutes.
- **Running both live PayPal Sandbox money paths (`npm run resume:capture` and `npm run resume:void`) via `GET /bounties?status=paid` discovery**: ~3 minutes.
- **Total Round 4 duration**: **~14 minutes**.

---

## Release-Note Checks (`RELEASE_NOTES_ROUND4.md`)

| Finding / Item | Status | Evidence (Docs & Live API) |
|---|---|---|
| **FL-10**: `api.md` says to branch on `checklist_met` itself: an item with `passed: null` is not met. | **Confirmed** | **Docs**: `api.md` (lines 82–84) explicitly states: *"Each `checklist` entry has `passed` (`true`, `false`, or `null` when it couldn't be determined, for example after an owner approval of proof Hail couldn't check) and a short `reason`. If your next step spends money (for example paying a seller), act only when `checklist_met` is `true`. Branch on `checklist_met` itself, not on looking for `passed: false`: an item Hail couldn't confirm (`null`) is not a met item."*<br>**Live API**: `GET /bounties/bty_I1rWqFKrfu13pNeh` returns `result.checklist_met: false` with `checklist: [{"item":"North sign readable","passed":true,"reason":"Reads 2-hour parking 8am–6pm."},{"item":"South sign readable","passed":null,"reason":"Glare covers the bottom line."}]`. |
| **FL-11**: `api.md` states that `certificate_url` is a public page and needs no `Authorization` header. | **Confirmed** | **Docs**: `api.md` (line 77) states: *"Photo URLs need the same `Authorization` header as the rest of the API. `certificate_url` doesn't (see below)."* And line 115: *"Anyone with the link can open it: it's a public page that needs no `Authorization` header."*<br>**Live API**: Unauthenticated `GET` to `https://hail-g9h8.onrender.com/proof/bty_I1rWqFKrfu13pNeh.jvSyabBt1Sz7VsFxBL_OGp` (and `bty_hu7zRy05FerG3ilf.XGMpJHg7cV5szm7WpLicIe`) returns `HTTP 200` (`text/html; charset=utf-8`), while unauthenticated `GET` to `https://hail-g9h8.onrender.com/api/v1/photos/ph_5kfaay1HgoZZmPQo` returns `HTTP 401` (and `HTTP 200` with `Authorization: Bearer`). |
| **FL-12**: Not reproduced: the MCP `create_bounty` schema already has `spots` minimum 1 and maximum 1. | **Confirmed** | **Live MCP**: Calling `tools/list` on `https://hail-g9h8.onrender.com/api/mcp` returns `create_bounty.inputSchema.properties.spots` with `{"description":"Must be 1 for now","type":"integer","minimum":1,"maximum":1}`. |
| **New — Hidden values**: A checklist item can be `{ "item": "...", "expected": "..." }`. Workers never see `expected`, and Hail checks the photo against it. | **Confirmed** | **Docs**: Documented in `api.md` under *The bounty object → Hidden values* (line 111), *Create a bounty* (line 164), and *Tips for agents* (line 296).<br>**Live REST**: `POST /bounties` created `bty_lBniaypky32HMjJo` and `bty_PHc5bwGo8EREZABp`; `GET /bounties/{id}` returned `acceptance_checklist` containing `{"item":"Serial matches the listing","expected":"X1-009871"}`. Both were cancelled via `POST /bounties/{id}/cancel` (`status: "cancelled"`).<br>**Live MCP**: `create_bounty` created `bty_TUTyqF9hT97UD0W7` and `bty_gYUVzYX0NtTmUbwg`; `GET /bounties/{id}` returned `{"item":"Serial matches the listing","expected":"BRV-884210"}` / `{"item":"Serial matches the listing","expected":"X1-009871"}`. Both were cancelled via `POST /bounties/{id}/cancel` (`status: "cancelled"`). |
| **Location rules tightened**: `lat` and `lng` go together, and `radius_m` (100–50,000) only with both. | **Confirmed** | **Docs**: `api.md` (line 168) specifies: *"`address` (≤ 300 chars) and/or both `lat` (−90 to 90) and `lng` (−180 to 180); `lat` and `lng` are always sent together. Optional `radius_m`: 100–50,000 meters, only with `lat` and `lng`."*<br>**Live API**: All invalid combinations (`lat` without `lng`, `radius_m` without coordinates, `radius_m: 50`) are rejected with `HTTP 400 invalid_request` (see detailed validation table below). |

---

## Documented Validation Checks (Live API Evidence)

Each invalid payload was tested against the live API (`https://hail-g9h8.onrender.com/api/v1/bounties` and `/api/mcp`) and refused with the documented `invalid_request` error:

| Validation Case | Payload Tested | HTTP / MCP Status | Live Error Response |
|---|---|---|---|
| `expected` > 120 chars | `acceptance_checklist: [{ "item": "Serial matches the listing", "expected": "X".repeat(121) }]` | REST `400` / MCP `isError: true` | `{"error":{"code":"invalid_request","message":"acceptance_checklist[].expected must be 120 characters or fewer"}}` |
| `lat` without `lng` | `location: { "address": "123 Main St", "lat": 39.78 }` | REST `400` / MCP `isError: true` | `{"error":{"code":"invalid_request","message":"location.lat and location.lng must be sent together"}}` |
| `radius_m` without coordinates | `location: { "address": "123 Main St", "radius_m": 200 }` | REST `400` | `{"error":{"code":"invalid_request","message":"location.radius_m only applies with lat and lng"}}` |
| `radius_m: 50` (< 100 m) | `location: { "address": "123 Main St", "lat": 39.78, "lng": -89.65, "radius_m": 50 }` | REST `400` / MCP `isError: true` | `{"error":{"code":"invalid_request","message":"location.radius_m must be between 100 and 50000"}}` |

---

## Hidden-Value Bounties Posted, Verified, and Cancelled

Every bounty created during Round 4 testing was verified with `GET /bounties/{id}` and then immediately cancelled with `POST /bounties/{id}/cancel` so no open bounties were left behind:

1. **REST Hidden-Value Check 1 (`bty_lBniaypky32HMjJo`)**:
   - Created via `POST /api/v1/bounties` (`HTTP 201`, `status: "open"`).
   - `GET /api/v1/bounties/bty_lBniaypky32HMjJo` confirmed `acceptance_checklist`: `["Serial number is legible","Machine is visibly powered on",{"item":"Serial matches the listing","expected":"X1-009871"}]`.
   - Cancelled via `POST /api/v1/bounties/bty_lBniaypky32HMjJo/cancel` → `HTTP 200`, `status: "cancelled"`.
2. **MCP Hidden-Value Check 1 (`bty_TUTyqF9hT97UD0W7`)**:
   - Created via MCP `create_bounty` (`isError: false`, `status: "open"`).
   - `GET /api/v1/bounties/bty_TUTyqF9hT97UD0W7` confirmed `acceptance_checklist`: `["Serial number is legible","Machine is visibly powered on",{"item":"Serial matches the listing","expected":"BRV-884210"}]`.
   - Cancelled via `POST /api/v1/bounties/bty_TUTyqF9hT97UD0W7/cancel` → `HTTP 200`, `status: "cancelled"`.
3. **Agent CLI REST Flow (`bty_PHc5bwGo8EREZABp`)**:
   - Created via `npm start -- --transport rest --skip-paypal --cancel-after-post`.
   - Narrated: `"The worker can't see the serial we expect; Hail checks the photo against it."`
   - Confirmed `GET /bounties/bty_PHc5bwGo8EREZABp` returned `{ "item": "Serial matches the listing", "expected": "X1-009871" }`.
   - Cancelled via `POST /bounties/bty_PHc5bwGo8EREZABp/cancel` → `status: "cancelled"`.
4. **Agent CLI MCP Flow (`bty_gYUVzYX0NtTmUbwg`)**:
   - Created via `npm start -- --transport mcp --skip-paypal --cancel-after-post`.
   - Narrated: `"The worker can't see the serial we expect; Hail checks the photo against it."`
   - Confirmed `GET /bounties/bty_gYUVzYX0NtTmUbwg` returned `{ "item": "Serial matches the listing", "expected": "X1-009871" }`.
   - Cancelled via `POST /bounties/bty_gYUVzYX0NtTmUbwg/cancel` → `status: "cancelled"`.

---

## Live PayPal Sandbox Money Paths (`GET /bounties?status=paid` Discovery)

Without completing any bounties or signing in as a worker, `--resume` now queries `GET /bounties?status=paid` dynamically (no hardcoded bounty IDs) and runs both settlement paths against the PayPal Sandbox:

### Path 1: Hold → Capture → Pay the Seller (`npm run resume:capture`)
- **PayPal Order Created (`intent: AUTHORIZE`)**: `7U9899481S046790R` ($120.00 USD / 12,000 cents)
- **PayPal Buyer Approval**: Approved by `sb-b63ke53532480@personal.example.com`
- **PayPal Authorization ID**: `3VU08529P82899322` (expires `2026-11-23T16:45:58Z`)
- **Dynamic Discovery (`GET /bounties?status=paid`)**: Found 13 `paid` bounties (`9` with `checklist_met: true`, `4` with `checklist_met: false`); selected `bty_7Q5dcCbBDTNLvlR7` (`status: "paid"`, `checklist_met: true`)
- **Proof Certificate**: `https://hail-g9h8.onrender.com/proof/bty_7Q5dcCbBDTNLvlR7.86B6cO8qrUUQ38Zrp7qkUC`
- **Decision & Narration**:
  - `The worker can't see the serial we expect; Hail checks the photo against it.`
  - `Verified. Paying the seller.`
  - `PayPal Authorization Captured! Capture ID: 3RC49309UK126813X (Status: COMPLETED)`
  - `Seller Payout Initiated! Payout Batch ID: 4QZ5HNFTABTNN (Status: PENDING)`
- **Outcome**: `CAPTURED_AND_PAID` ($120.00 captured and disbursed to `sb-is02s53470435@business.example.com`).

### Path 2: Hold → Void (`npm run resume:void`)
- **PayPal Order Created (`intent: AUTHORIZE`)**: `2W241965AP178413E` ($120.00 USD / 12,000 cents)
- **PayPal Buyer Approval**: Approved by `sb-b63ke53532480@personal.example.com`
- **PayPal Authorization ID**: `6HN94281XJ0924249` (expires `2026-11-23T16:47:41Z`)
- **Dynamic Discovery (`GET /bounties?status=paid`)**: Selected `bty_fLFU79f7j1e4ckXy` ("Inspect used espresso machine serial plate at 400 Main St", `status: "paid"`, `checklist_met: false` — plate reads `SN-884210` instead of expected `BX-55190`)
- **Proof Certificate**: `https://hail-g9h8.onrender.com/proof/bty_fLFU79f7j1e4ckXy.T9fUddtnG4kHAN4cbjjexR`
- **Decision & Narration**:
  - `The worker can't see the serial we expect; Hail checks the photo against it.`
  - `Serial doesn't match the listing. Voiding the payment.`
  - `The worker still got paid for honest work; that's expected.`
  - `PayPal Authorization Voided! $0 charged to buyer.`
- **Outcome**: `VOIDED` via `POST /v2/payments/authorizations/6HN94281XJ0924249/void` (`HTTP 204`, $0.00 charged to buyer).

---

## What Worked vs. What Didn't (New Friction in Round 4)

### What Worked Well
1. **Hidden Values (`{ item, expected }`)**: Works seamlessly across both REST (`POST /bounties`) and MCP (`create_bounty`), and round-trips cleanly in `GET /bounties/{id}` while keeping `result.checklist[].item` as plain item text.
2. **Tightened Location Validation**: Error messages for `lat`/`lng` pairing and `radius_m` bounds (`100–50,000`) are clear, descriptive, and identical across REST and MCP.
3. **Documentation Clarity (`FL-10`, `FL-11`, `FL-12`)**: All three Round 3 findings were addressed cleanly in `api.md` and verified on the live server.

### What Didn't Work / Friction Logged (`FRICTION_LOG.md`)
- **`FL-13`: `acceptance_checklist` object schema makes `expected` optional (`required: ["item"]`) and silently coerces objects without `expected` to plain strings**:
  - In MCP `tools/list`, `acceptance_checklist.items.anyOf[1]` lists `"required": ["item"]` instead of `["item", "expected"]`. Sending `{ "item": "Serial matches the listing" }` without `expected` (e.g. if `expected` is `undefined` or mistyped) returns `201` (`bty_FBT1W61Yqhs3dCb7`) and silently turns the object into a plain string `"Serial matches the listing"` rather than rejecting with `400 invalid_request`.
- **`FL-14`: Shape of `"type": "location"` entries in `result.deliverables[]` is undocumented in `api.md`**:
  - Live `paid` bounties with on-site coordinates (`bty_hu7zRy05FerG3ilf`, `bty_C5NCNOCNrUJQhKys`, `bty_2yTMfY2KotbVUNv3`) include `{ "type": "location", "lat": ..., "lng": ... }` in `result.deliverables`, whereas `api.md` only documents `url` (for `photo`) and `value` (for `text`).
