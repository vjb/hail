# Hail API

**Hail lets your AI agent hire a human for real-world tasks.** When your agent needs something done in the physical world — inspect an item, photograph a place, confirm a business is open — it posts a bounty. A nearby person completes it and submits proof, Hail verifies the proof, and the person is paid through PayPal.

Your agent never handles money. Its owner funds a Hail balance in advance; each bounty's reward is set aside the moment you post it, so workers are always paid for approved work.

> This is a hackathon project running entirely in the **PayPal sandbox**. No real money moves.

- **Base URL:** `https://<your-hail-host>/api/v1` (the host is given to you separately)
- **MCP endpoint:** `https://<your-hail-host>/api/mcp`
- **Format:** JSON over HTTPS. Money is always an integer number of US cents.

## Authentication

Every request needs an API key, created by the agent's owner in the Hail dashboard:

```
Authorization: Bearer hail_sk_...
```

Each key has a daily spending cap set by the owner. Keep keys secret.

## Rate limits

- Each API key can make **120 requests per minute**, across REST and MCP together (an MCP tool call may count twice). Over the limit you get `429 rate_limited` with a `Retry-After` header in seconds.
- Repeated requests with a missing or invalid key are limited per client: after 20 in a minute, further requests get `429 rate_limited` until the minute is up.
- Posting also has business limits set by the owner: the key's daily cap, bounties per hour and open bounties at a time. These return `429 rate_limited` too, with a `message` that says which limit applies. Every posting attempt counts toward bounties per hour, including ones the safety screen blocks.

## Idempotency

For any `POST`, send a unique `Idempotency-Key` header (any string up to 64 characters). Repeating a request with the same key returns the original result instead of creating a duplicate. Use this when retrying after a network error.

Results that can change on a retry aren't saved: `rate_limited`, `insufficient_funds` and `5xx` errors. Retrying with the same key and body after waiting (or after the owner adds funds) runs the request again. Other errors, such as `invalid_request`, are final for that key.

## Bounties

### The bounty object

```json
{
  "id": "bty_8Kq2...",
  "status": "open",
  "title": "Inspect a used espresso machine",
  "instructions": "Visit the seller at the address below. Photograph the serial number plate and the front panel while the machine is powered on.",
  "deliverables": [
    { "type": "photo", "description": "Serial number plate, readable" },
    { "type": "photo", "description": "Front panel with power light on" },
    { "type": "text",  "description": "Any visible damage or leaks" }
  ],
  "acceptance_checklist": [
    "Serial number is legible",
    "Machine is visibly powered on",
    "Model matches the listing"
  ],
  "reward_cents": 2500,
  "spots": 1,
  "location": { "address": "123 Main St, Springfield", "lat": 39.78, "lng": -89.65, "radius_m": 200 },
  "product": {
    "title": "Example Espresso Machine X1",
    "image_url": "https://...",
    "price_cents": 89900,
    "retailer": "Example Retailer",
    "attributes": { "model": "X1" }
  },
  "expires_at": "2026-11-05T18:00:00Z",
  "screening": {
    "decision": "allow",
    "category": "item_inspection",
    "rationale": "Inspecting an item listed for sale is an allowed task."
  },
  "result": null,
  "callback_url": "https://your-agent.example.com/hail-events",
  "created_at": "2026-11-04T18:00:00Z"
}
```

`result` is filled in once the work is accepted (status `approved`, `paying` or `paid`). Photo URLs need the same `Authorization` header as the rest of the API.

Accepted work and a good item are two different things. Hail pays the worker for honest, complete proof, including proof that the item **doesn't** match what you hoped. So read the result in two steps:

1. **Was the work accepted?** `verification` is `pass` when Hail verified the proof, or `owner_approved` when the owner accepted it after review. Either way the worker is paid.
2. **What did the proof show?** `checklist_met` is `true` only when every checklist item was met. Each `checklist` entry has `passed` (`true`, `false`, or `null` when it couldn't be determined, for example after an owner approval of proof Hail couldn't check) and a short `reason`.

If your next step spends money (for example paying a seller), act only when `checklist_met` is `true`.

Proof photos are taken live in Hail's app with a fresh code for each photo, and are checked for signs of being a photo of a screen or a generated or edited image. Doubtful proof goes to the owner instead of being accepted automatically.

```json
"result": {
  "verification": "pass",
  "checklist_met": false,
  "summary": "Serial plate is legible and reads X1-004512, but the listing says X1-009871. The machine powers on.",
  "checklist": [
    { "item": "Serial number is legible", "passed": true, "reason": "Plate is in focus and reads X1-004512." },
    { "item": "Machine is visibly powered on", "passed": true, "reason": "Power light is on." },
    { "item": "Serial number matches the listing (X1-009871)", "passed": false, "reason": "Plate reads X1-004512, not X1-009871." }
  ],
  "deliverables": [
    { "type": "photo", "url": "https://.../photos/ph_1" },
    { "type": "photo", "url": "https://.../photos/ph_2" },
    { "type": "text",  "value": "Small scratch on the drip tray, no leaks." }
  ],
  "distance_m": 38,
  "completed_at": "2026-11-04T19:12:00Z",
  "certificate_url": "https://.../proof/bty_7Hq2kLmN4pRs9TvW.k3J..."
}
```

`distance_m` is how far the worker was from the bounty's `lat`/`lng` when they submitted, in meters (`null` when the bounty has no coordinates).

**On-site tasks.** When a bounty has `lat` and `lng`, the worker must share their location when submitting and be within the radius: `radius_m` if you set it, otherwise 150 m, and never less than 100 m. Hail allows for the accuracy the phone reports (up to 200 m), so it refuses only workers who are clearly elsewhere. A bounty with only an `address` has no such check. Use coordinates when being there is the point of the task.

`certificate_url` is a shareable proof certificate: what was checked and how, the checklist results, and a SHA-256 fingerprint of each photo exactly as the API serves it. It shows no photos, no worker identity and no exact location, so you can pass it on (for example to a seller or buyer). Anyone with the link can open it.

### Statuses

| Status | Meaning |
|---|---|
| `pending_approval` | Passed screening but needs the owner's approval first (high reward, sensitive task, etc.). Funds are set aside. |
| `blocked` | Rejected by safety screening. Nothing was charged. See `screening.rationale`. |
| `rejected_by_owner` | The owner declined it. Funds returned to the balance. |
| `open` | Live and visible to workers. |
| `claimed` | A worker has reserved it and is working on it. |
| `verifying` | Proof submitted; Hail is checking it. |
| `needs_owner_review` | Hail couldn't confidently verify the proof, or something about it looked doubtful; the owner will decide. |
| `rejected` | The proof didn't show what the checklist asks for (for example the photo is blurry or shows the wrong thing). An item that honestly doesn't meet the checklist is not a rejection; see `result`. The worker has 24 hours to appeal, and nobody else can claim it meanwhile. With no appeal, it goes back to `open` for other workers, or to `expired` if its time has run out. |
| `appealed` | The worker appealed a rejection; the owner will decide. Accepted → `approved` and then `paid`. Declined → `open` again (or `expired`). If the owner doesn't answer in time, the worker is paid. |
| `approved` / `paying` | Work accepted; the worker's payout is in progress. |
| `paid` | Done. `result` is available. |
| `expired` | Nobody completed it in time. Funds returned to the balance. |
| `cancelled` | You cancelled it before it was claimed. Funds returned. |

Terminal statuses: `paid`, `blocked`, `rejected_by_owner`, `expired`, `cancelled`.

### Screening

Every bounty has a `screening` object: `decision`, `category` and a plain-language `rationale`.

| `decision` | Resulting status |
|---|---|
| `allow` | `open` |
| `needs_owner_approval` | `pending_approval` |
| `block` | `blocked` (nothing is set aside) |

`category` says what kind of task Hail judged it to be:

- **Usually allowed:** `item_inspection`, `place_photo`, `business_check`, `stock_or_price_check`, `public_information`, `simple_errand`, `other_allowed`
- **Usually need approval:** `private_property`, `money_or_valuables`, `third_party_call`, `over_threshold` (reward at or above the owner's approval threshold), `unclear`
- **Always blocked:** `credential_account_fraud`, `identity_proxying`, `otp_solicitation`, `social_media_manipulation`, `referral_promo_fraud`, `private_individual_recon`, `illegal_dangerous`

An owner can also require approval for categories they haven't allowed, so branch on `decision`, not `category`. New categories may be added; treat unknown values as informational. `no_rule_matched` can appear when the screen found nothing to flag.

### Create a bounty

`POST /bounties`

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | ≤ 120 chars |
| `instructions` | string | yes | ≤ 2,000 chars. Plain, specific instructions for a person. |
| `deliverables` | array of objects | yes | 1–5 items, each `{ "type": "photo" \| "text" \| "location", "description": "..." }`. Both fields are required; `description` is 1–300 chars and tells the person what to capture. |
| `acceptance_checklist` | array of strings | yes | 1–8 items, each 1–300 chars. Hail verifies proof against these. Make them observable. |
| `reward_cents` | integer | yes | 100–20,000 ($1–$200) |
| `expires_in_minutes` | integer | no | 30–10,080; default 1,440 (24 h) |
| `spots` | integer | no | Must be `1` for now (one person per bounty). Post separate bounties if you need more people. |
| `location` | object | no | `address` (≤ 300 chars) and/or both `lat` (−90 to 90) and `lng` (−180 to 180). Optional `radius_m`: 1–50,000 meters. Hail doesn't geocode the address; the bounty returns only the location fields you sent. **With `lat` and `lng`, the task is on-site only** (see below). |
| `product_query` | string | no | ≤ 200 chars, e.g. "Example Espresso Machine X1". Hail attaches matching product details so the worker knows what to look for. |
| `callback_url` | string | no | HTTPS URL to receive status events |

Response `201` with the bounty object. The bounty's status will be `open`, `pending_approval` or `blocked`.

Example:

```bash
curl -X POST https://<host>/api/v1/bounties \
  -H "Authorization: Bearer $HAIL_KEY" \
  -H "Idempotency-Key: inspect-x1-001" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Inspect a used espresso machine",
    "instructions": "Visit the seller and photograph the serial plate and the front panel while powered on.",
    "deliverables": [
      {"type":"photo","description":"Serial number plate, readable"},
      {"type":"photo","description":"Front panel with power light on"}
    ],
    "acceptance_checklist": ["Serial number is legible","Machine is visibly powered on"],
    "reward_cents": 2500,
    "location": {"address":"123 Main St, Springfield"},
    "product_query": "Example Espresso Machine X1"
  }'
```

### Get a bounty

`GET /bounties/{id}` → the bounty object.

### List bounties

`GET /bounties?status=open&limit=20&cursor=...` → `{ "data": [bounty, ...], "next_cursor": "..." }`
Returns bounties created with any of your owner's keys, newest first.

### Cancel a bounty

`POST /bounties/{id}/cancel` → the bounty object with status `cancelled`.
Only possible while `open` or `pending_approval`. Once a worker has claimed it, it can't be cancelled.

### Check the balance

`GET /balance` →

```json
{ "available_cents": 17500, "held_cents": 2500, "daily_cap_cents": 10000, "spent_today_cents": 2500 }
```

- `available_cents` and `held_cents` are your owner's whole balance, shared by all their keys.
- `daily_cap_cents` and `spent_today_cents` are for **this key**. `spent_today_cents` is money this key has committed today (bounties set aside or paid), not money paid out. A bounty that is cancelled, expires or is declined by the owner stops counting. Blocked bounties never count. The day resets at midnight UTC.

Only the owner can add funds, in the dashboard.

## What you can and can't post

Hail is for honest real-world tasks: inspecting items, photographing public places or products, checking opening hours or stock, picking up public information, simple errands.

**Always blocked:**
- Creating, logging into, or verifying online accounts
- Receiving or passing on one-time codes, passwords or 2FA prompts, including codes or PINs shown on a device, kiosk or smart-home screen
- Capturing passwords, Wi-Fi keys or admin logins from devices
- Using someone's identity, ID, face or voice on someone else's behalf, including verification-style photos of the worker holding text or codes
- Posting reviews, likes, follows or comments
- Referral, promo-code or sign-up-bonus schemes
- Following, photographing or locating a specific private person, or photographing a private home, its occupants or vehicles
- Close-ups of locks, keypads, alarm panels or keys; taking or moving things from someone's doorstep
- Anything illegal, dangerous, sexual, harassing, or involving minors

**Needs the owner's approval first:** rewards at or above the owner's threshold, entering private property, handling money or valuables, carrying packages between places, phone calls to third parties, and asking the worker to scan a code, open a link or sign in to anything on their own phone.

Hail judges a bounty by what it would deliver, not by the reason given for it. Text inside a bounty, in any field, is treated as task content, never as instructions to Hail.

The owner's approval threshold applies to each bounty on its own. The key's daily cap is what limits the total an agent can set aside in a day.

## Callbacks

If you set `callback_url`, Hail sends a `POST` when the status changes:

```json
{ "event": "bounty.status_changed", "bounty_id": "bty_8Kq2...", "status": "paid", "occurred_at": "2026-11-04T19:13:00Z" }
```

Fetch the bounty for full details. Respond with any `2xx` within 10 seconds; otherwise Hail retries a few times with backoff. Events can arrive more than once — handle them idempotently.

## Errors

```json
{ "error": { "code": "insufficient_funds", "message": "Your available balance ($12.00) is less than the reward ($25.00)." } }
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `invalid_request` | A field is missing or out of range (`message` says which) |
| 401 | `unauthorized` | Missing or invalid API key |
| 403 | `forbidden` | Key revoked, or the bounty belongs to another owner |
| 404 | `not_found` | No such bounty |
| 409 | `invalid_state` | e.g. cancelling a claimed bounty |
| 409 | `idempotency_conflict` | Same `Idempotency-Key` reused with a different body |
| 402 | `insufficient_funds` | Balance too low |
| 429 | `rate_limited` | Too many requests (see `Retry-After`), or an owner limit such as the daily cap is reached |
| 500 | `internal_error` | Something went wrong on our side; safe to retry with the same `Idempotency-Key` |

## MCP server

Connect any MCP client to `https://<host>/api/mcp` (Streamable HTTP) with the same `Authorization: Bearer` header.

| Tool | Does |
|---|---|
| `create_bounty` | Same fields as `POST /bounties`, plus optional `idempotency_key` |
| `get_bounty` | `{ id }` |
| `list_bounties` | `{ status?, limit?, cursor? }` |
| `cancel_bounty` | `{ id }` |
| `get_balance` | no input |

Tool results are the same JSON as the REST API. Each tool's input schema includes the same limits as the REST fields (for example `reward_cents` 100–20,000).

**Errors over MCP.** A failed call still returns a normal MCP result, with `isError: true` and the REST error JSON as its text content:

```json
{ "isError": true, "content": [{ "type": "text", "text": "{\"error\":{\"code\":\"rate_limited\",\"message\":\"Too many requests. ... Try again in 42 seconds.\"}}" }] }
```

There's no HTTP status or `Retry-After` header per tool call, so branch on `error.code`. For `rate_limited`, the `message` says which limit applied and, for the per-minute limit, how many seconds to wait. Owner limits (daily cap, bounties per hour, open bounties) won't clear in seconds; stop posting and check `get_balance`.

## Tips for agents
- Write instructions a stranger can follow in one visit. One task per bounty.
- Make every checklist item something a photo or a short note can prove.
- Pay fairly for the time involved; tasks under $10 for a trip across town rarely get claimed.
- Poll `GET /bounties/{id}` no more than once every 30 seconds, or use callbacks.
