# Hail API & Documentation Friction Log

Started: 2026-10-24T20:42:43-04:00

## What Was Clear (Keep These!)

- **Overview & Mental Model (`# Hail API`)**: The opening paragraphs immediately make the value proposition, sandbox context, and money-handling model clear (integers in US cents, owner pre-funds balance, funds held on creation).
- **Authentication & Rate Limits (`## Authentication`, `## Rate limits`)**: Very clear header format (`Authorization: Bearer hail_sk_...`) and transparent rate-limit rules, including the helpful detail that an MCP tool call may count twice toward the 120 req/min limit.
- **Status Lifecycle & Terminal States (`### Statuses`)**: Explicitly listing the terminal statuses (`paid`, `blocked`, `rejected_by_owner`, `expired`, `cancelled`) at the bottom of the status table makes writing a polling loop much easier and less error-prone.
- **Safety Screening & Content Policy (`## What you can and can't post`)**: Clear distinction between tasks that are **Always blocked** (e.g., 2FA/one-time verification codes, account creation, fake reviews) vs. **Needs the owner's approval first** (high rewards, entering private property, handling money, phone calls). Also clearly explains that blocked bounties return HTTP `201` with `status: "blocked"` and `screening.rationale` rather than a `4xx` error.
- **Error Response Format (`## Errors`)**: Concise JSON example and table mapping HTTP status codes (`400`, `401`, `402`, `403`, `404`, `409`, `429`, `500`) to machine-readable `error.code` values.
- **On-site Tasks & Geofencing (`The bounty object → On-site tasks`, `result.distance_m`)**: The newly added "On-site tasks" section and `result.distance_m` field in `api.md` clearly specify how location verification operates: setting `lat`/`lng` mandates physical presence within `radius_m` (defaulting to 150m, minimum 100m) with phone accuracy allowance up to 200m; address-only tasks skip coordinate enforcement; and `distance_m` reports the worker's distance in meters upon submission. This completely resolved FL-03.

---

## Friction Entries

### FL-01: `deliverables` object fields and constraints not formally specified in `POST /bounties` table
- **When**: Designing TypeScript types for `POST /bounties` and `create_bounty`.
- **Docs said**: Under `### Create a bounty`, the table says: `deliverables | array | yes | 1–5 items; type is photo, text or location`.
- **What happened**: The table does not list the object properties inside `deliverables` (e.g., whether `description` is required for all three types including `location`, or if there is a character limit on `description`). I had to infer `{ type, description }` from the `### The bounty object` example above.
- **Impact**: minor
- **Suggestion**: Document the schema of a deliverable item in the `Create a bounty` section (e.g. `{ type: "photo" | "text" | "location", description: string (≤ N chars) }`).

### FL-02: Ambiguity around `rejected` status lifecycle (non-terminal vs. reopening)
- **When**: Designing the polling loop and handling unhappy paths (`rejected`).
- **Docs said**: Under `### Statuses`, `rejected` is defined as `"Proof didn't meet the checklist. The bounty may reopen for another worker."` and is omitted from the `Terminal statuses` list (`paid`, `blocked`, `rejected_by_owner`, `expired`, `cancelled`).
- **What happened**: It is unclear why the docs say "may reopen" rather than "reopens", under what conditions a `rejected` bounty does *not* reopen, or whether an agent polling `GET /bounties/{id}` will observe `status: "rejected"` transiently before it returns to `"open"`, or if it stays `"rejected"` until another worker claims it or it expires.
- **Impact**: slowed me down
- **Suggestion**: Clarify whether `rejected` automatically transitions back to `open` (or stays `rejected` while still claimable), and under what conditions (e.g., max attempts reached) it stops reopening.

### FL-03: `location` input rules and `radius_m` defaults/limits are underspecified
- **When**: Preparing the `location` field for `POST /bounties`.
- **Docs said**: `location | object | no | address and/or lat/lng, optional radius_m` (with example `{ "address": "123 Main St, Springfield", "lat": 39.78, "lng": -89.65, "radius_m": 200 }`).
- **What happened**: Doesn't specify the default `radius_m` if omitted, valid min/max bounds for `radius_m`, or whether Hail geocodes `address` automatically if `lat`/`lng` are omitted (in the `curl` example, only `{"address":"123 Main St, Springfield"}` is passed, and live responses return `{"address":"123 Main St, Springfield"}` without `lat`/`lng`/`radius_m` when omitted).
- **Impact**: minor
- **Suggestion**: Note the default and min/max for `radius_m`, and state that `lat`, `lng`, and `radius_m` are omitted from `bounty.location` unless provided.
- **Resolution**: *Resolved in api.md update* — The newly added "On-site tasks" section and `result.distance_m` document the 150m default radius, 100m minimum, 200m GPS accuracy margin, and how address-only bounties skip geofencing.

### FL-04: MCP `tools/list` JSON Schema uses `MAX_SAFE_INTEGER` instead of actual field bounds
- **When**: Inspecting the live MCP server tool definitions (`tools/list` on `/api/mcp`).
- **Docs said**: `reward_cents` is `100–20,000`, `expires_in_minutes` is `30–10,080`, `spots` must be `1`, and `list_bounties.limit` is `1–100`.
- **What happened**: In the MCP `inputSchema` for `create_bounty` and `list_bounties`, integer fields (`reward_cents`, `expires_in_minutes`, `spots`, `radius_m`, `limit`) all declare `"minimum": -9007199254740991, "maximum": 9007199254740991` instead of their actual domain constraints (and arrays/strings lack `minItems`/`maxItems`/`maxLength`). Agents relying on JSON Schema validation rather than prose descriptions won't know the real constraints until a runtime validation error occurs.
- **Impact**: minor
- **Suggestion**: Add `.min()` / `.max()` constraints to the Zod/JSON schema definitions in the MCP server so `inputSchema` matches the documented constraints.

### FL-05: MCP error handling omits HTTP status codes and `Retry-After` metadata
- **When**: Calling `get_bounty` via MCP (`tools/call`) with a non-existent ID (`bty_does_not_exist`) to verify error handling.
- **Docs said**: Under `## MCP server`: `"Tool results are the same JSON as the REST API."` Under `## Errors`, errors are mapped by HTTP status (`400`, `402`, `404`, `409`, `429`, `500`) and `429` references a `Retry-After` HTTP header.
- **What happened**: MCP `tools/call` returns HTTP `200` with `result.isError: true` and `result.content[0].text` set to `{"error":{"code":"not_found","message":"No such bounty."}}`. While the JSON payload matches REST, there is no HTTP status code or `Retry-After` header inside the MCP tool result payload.
- **Impact**: minor
- **Suggestion**: Note in `## MCP server` that tool errors return `isError: true` with the `{ error: { code, message } }` JSON serialized in `content[0].text`, and recommend branching on `error.code` rather than HTTP status.

### FL-06: `screening.decision` and `screening.category` enum values are not documented
- **When**: Writing TypeScript types and handling screening outcomes for `bounty.screening`.
- **Docs said**: The example bounty object shows `"screening": { "decision": "allow", "category": "item_inspection", "rationale": "..." }`, and the `blocked` status row says `"See screening.rationale."`
- **What happened**: Querying `GET /bounties` and posting live bounties (`bty_NsvtvFdBatZvxTzW` and `bty_eoxu98CfPnkcQqVd`) revealed that `screening.decision` takes values `"allow"`, `"needs_owner_approval"`, and `"block"`, and `screening.category` takes values like `"item_inspection"`, `"place_photo"`, and `"otp_solicitation"`. None of these enum values are listed in `api.md`.
- **Impact**: minor
- **Suggestion**: Document the possible values of `screening.decision` (`"allow" | "needs_owner_approval" | "block"`) in `### The bounty object`.

### FL-07: `spent_today_cents` increments on bounty creation (when funds are held), not when `paid`
- **When**: Checking `get_balance` before and after posting live bounty `bty_NsvtvFdBatZvxTzW` (`reward_cents: 2500`).
- **Docs said**: `{ "available_cents": 17500, "held_cents": 2500, "daily_cap_cents": 10000, "spent_today_cents": 2500 }`
- **What happened**: Immediately after `create_bounty` returned `status: "open"`, `available_cents` decreased by `2500`, `held_cents` increased by `2500`, and `spent_today_cents` increased from `0` to `2500`. Meanwhile, the blocked bounty (`bty_eoxu98CfPnkcQqVd`) did not change `available_cents`, `held_cents`, or `spent_today_cents`. This behavior makes complete sense for enforcing the key's daily cap at creation time, though the field name `spent_today_cents` could be read as "paid out today" unless compared closely with the example numbers.
- **Impact**: minor
- **Suggestion**: Add a short note in `### Check the balance` clarifying that `spent_today_cents` tracks funds committed (held or paid) today by this API key against `daily_cap_cents`, and is refunded if a bounty is cancelled or expires.

### FL-08: Bounty object does not return a direct worker/web UI URL (`worker_url` / `dashboard_url`)
- **When**: Getting a direct link to open and complete the created bounty (`bty_NsvtvFdBatZvxTzW`) on a phone.
- **Docs said**: `### The bounty object` lists `id`, `status`, `title`, etc., with no web URL field, and `api.md` does not mention the worker web route (`/sign-in?as=worker`).
- **What happened**: Guessing `/bounties/{id}` or `/tasks/{id}` returns `404`; inspecting the root HTML on the host revealed `/sign-in?as=worker` and `/sign-in?as=owner`.
- **Impact**: minor
- **Suggestion**: Include a `url` (or `worker_url`) field on the bounty object and/or mention the worker entry URL (`https://<host>/sign-in?as=worker`) in the docs for sandbox testing.

### FL-09: PayPal sandbox authorization hold vs. Payouts two-step transfer architecture
- **When**: Implementing Step 1 (Hold payment) and Step 4 (Capture & Pay Seller) with PayPal's Orders v2 and Payouts APIs.
- **Docs said**: In `BRIEF_ROUND3.md`: "Hold the money in your own account and pay the seller afterwards: a payment held in the seller's name can't be cancelled by you."
- **What happened**: Under PayPal's Orders v2 API, an authorization created with `intent: AUTHORIZE` holds funds on behalf of the merchant credentials associated with the app (`PAYPAL_CLIENT_ID`). When `capture` is invoked on that authorization, the funds settle exclusively into the agent's PayPal merchant balance. PayPal's Orders API cannot capture directly to an arbitrary third-party seller account (`SELLER_PAYPAL_EMAIL`). To actually transfer funds to the seller, the agent must perform a secondary call using PayPal's Payouts API (`POST /v1/payments/payouts`). If an outside developer expects `capture` to route money to `SELLER_PAYPAL_EMAIL` directly, they will encounter confusion until they realize Payouts is required.
- **Impact**: slowed me down
- **Suggestion**: In `BRIEF_ROUND3.md`, explicitly explain the two-step settlement flow: (1) `POST /v2/payments/authorizations/{id}/capture` captures the hold into the agent account, and (2) `POST /v1/payments/payouts` disburses the purchase amount to `SELLER_PAYPAL_EMAIL`.

### FL-10: Nullable `passed: null` checklist items make `checklist_met: false` without explicit failure
- **When**: Inspecting Hail verification result for live bounty `bty_I1rWqFKrfu13pNeh` ("Photograph the parking signs on Oak Ave").
- **Docs said**: Under `The bounty object → result`: "`checklist_met` is true only when every item was met; each checklist entry now has `reason`, and `passed` can be `null`."
- **What happened**: In `bty_I1rWqFKrfu13pNeh`, one item had `passed: true` and the second had `passed: null` with reason `"Glare covers the bottom line."` The resulting `checklist_met` was `false`. An AI agent inspecting this must recognize that `checklist_met === false` encompasses both explicit rejections (`passed: false`, e.g. serial mismatch) and indeterminate proof (`passed: null`, e.g. glare, blur, obscured angle). If an agent only looks for `c.passed === false`, it will miss indeterminate items and might erroneously proceed with payment.
- **Impact**: minor
- **Suggestion**: Emphasize in `api.md` that agents should strictly branch on the boolean `result.checklist_met`, and note that `passed: null` indicates inconclusive proof rather than verified compliance.

### FL-11: Ambiguity on authentication requirement for `result.certificate_url`
- **When**: Fetching and verifying the proof certificate link returned in `bounty.result.certificate_url`.
- **Docs said**: The sentence immediately preceding the result description states: `"Photo URLs need the same Authorization header as the rest of the API."` Followed shortly by: "`certificate_url` is a shareable proof certificate... Anyone with the link can open it."
- **What happened**: It was initially ambiguous whether programmatic clients fetching `certificate_url` (e.g. for archiving or downstream validation) must supply `Authorization: Bearer <token>` like photo URLs. Live testing confirmed that `certificate_url` returns public HTML (`HTTP 200`) without any authorization header, while photo URLs strictly require the Bearer token.
- **Impact**: minor
- **Suggestion**: Clearly separate the photo URL authentication note from the `certificate_url` documentation, and explicitly state that `certificate_url` is publicly accessible without credentials.

### FL-12: MCP `create_bounty` schema does not reflect domain bounds on `spots`
- **When**: Inspecting MCP tool parameters and validation behavior for `create_bounty`.
- **Docs said**: Under `POST /bounties`: `spots | integer | no | Must be 1 for now (one person per bounty).`
- **What happened**: The MCP server tool schema defines `spots` with generic integer bounds (`-9007199254740991` to `9007199254740991`) without a `maximum: 1` or `enum: [1]` constraint. Passing `spots: 2` over MCP returns an error payload from REST validation rather than being caught by client-side JSON Schema validation.
- **Impact**: minor
- **Suggestion**: Add `"maximum": 1` or `"const": 1` to the MCP tool schema for `spots`.




