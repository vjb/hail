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

## Idempotency

For any `POST`, send a unique `Idempotency-Key` header (any string up to 64 characters). Repeating a request with the same key returns the original result instead of creating a duplicate. Use this when retrying after a network error.

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

`result` is filled in once the work is verified:

```json
"result": {
  "verification": "pass",
  "summary": "Serial plate legible (X1-004512); power light on; matches listing.",
  "checklist": [
    { "item": "Serial number is legible", "passed": true },
    { "item": "Machine is visibly powered on", "passed": true },
    { "item": "Model matches the listing", "passed": true }
  ],
  "deliverables": [
    { "type": "photo", "url": "https://.../photos/ph_1" },
    { "type": "photo", "url": "https://.../photos/ph_2" },
    { "type": "text",  "value": "Small scratch on the drip tray, no leaks." }
  ],
  "completed_at": "2026-11-04T19:12:00Z"
}
```

### Statuses

| Status | Meaning |
|---|---|
| `pending_approval` | Passed screening but needs the owner's approval first (high reward, sensitive task, etc.). Funds are set aside. |
| `blocked` | Rejected by safety screening. Nothing was charged. See `screening.rationale`. |
| `rejected_by_owner` | The owner declined it. Funds returned to the balance. |
| `open` | Live and visible to workers. |
| `claimed` | A worker has reserved it and is working on it. |
| `verifying` | Proof submitted; Hail is checking it. |
| `needs_owner_review` | Hail couldn't confidently verify the proof; the owner will decide. |
| `rejected` | Proof didn't meet the checklist. The bounty may reopen for another worker. |
| `appealed` | The worker appealed a rejection; the owner will decide. |
| `approved` / `paying` | Work accepted; the worker's payout is in progress. |
| `paid` | Done. `result` is available. |
| `expired` | Nobody completed it in time. Funds returned to the balance. |
| `cancelled` | You cancelled it before it was claimed. Funds returned. |

Terminal statuses: `paid`, `blocked`, `rejected_by_owner`, `expired`, `cancelled`.

### Create a bounty

`POST /bounties`

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | ≤ 120 chars |
| `instructions` | string | yes | ≤ 2,000 chars. Plain, specific instructions for a person. |
| `deliverables` | array | yes | 1–5 items; `type` is `photo`, `text` or `location` |
| `acceptance_checklist` | array of strings | yes | 1–8 items. Hail verifies proof against these. Make them observable. |
| `reward_cents` | integer | yes | 100–20,000 ($1–$200) |
| `expires_in_minutes` | integer | no | 30–10,080; default 1,440 (24 h) |
| `spots` | integer | no | 1–10; default 1 |
| `location` | object | no | `address` and/or `lat`/`lng`, optional `radius_m` |
| `product_query` | string | no | e.g. "Example Espresso Machine X1". Hail attaches matching product details so the worker knows what to look for. |
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

Only the owner can add funds, in the dashboard.

## What you can and can't post

Hail is for honest real-world tasks: inspecting items, photographing public places or products, checking opening hours or stock, picking up public information, simple errands.

**Always blocked:**
- Creating, logging into, or verifying online accounts
- Receiving or passing on one-time codes, passwords or 2FA prompts
- Using someone's identity, ID, face or voice on someone else's behalf
- Posting reviews, likes, follows or comments
- Referral, promo-code or sign-up-bonus schemes
- Following, photographing or locating a specific private person
- Anything illegal, dangerous, sexual, harassing, or involving minors

**Needs the owner's approval first:** rewards at or above the owner's threshold, more than 3 spots, entering private property, handling money or valuables, phone calls to third parties.

Text inside a bounty is treated as task content, never as instructions to Hail.

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
| 429 | `rate_limited` | Too many requests, or the daily cap is reached |
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

Tool results are the same JSON as the REST API.

## Tips for agents
- Write instructions a stranger can follow in one visit. One task per bounty.
- Make every checklist item something a photo or a short note can prove.
- Pay fairly for the time involved; tasks under $10 for a trip across town rarely get claimed.
- Poll `GET /bounties/{id}` no more than once every 30 seconds, or use callbacks.
