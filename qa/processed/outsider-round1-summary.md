# Summary — Outside Developer Experience with Hail

## How Long Setup Took
- **Zero to first successful API/MCP call (`get_balance` & `list_bounties`)**: ~4 minutes after reading `BRIEF.md` and `api.md`.
- **Zero to full end-to-end requester agent (`Channel3` -> `claude-haiku-5-5` -> `Hail MCP create_bounty` + blocked policy demo + unhappy-path test suite)**: ~16 minutes total.

## What Worked Well
1. **Hail MCP Server (`/api/mcp`)**:
   - Stateless Streamable HTTP worked immediately with standard JSON-RPC `initialize`, `tools/list`, and `tools/call` requests authenticated via `Authorization: Bearer hail_sk_...`.
   - All five MCP tools (`get_balance`, `create_bounty`, `get_bounty`, `list_bounties`, `cancel_bounty`) behaved consistently with the REST API documentation.
2. **Product Enrichment (`product_query`) & Channel3**:
   - Passing `product_query` to `create_bounty` automatically populated `bounty.product` (`title`, `retailer`, `image_url`, `price_cents`, `attributes`) so workers on their phones see exactly what item to inspect.
3. **Safety Screening (`open` vs `pending_approval` vs `blocked`)**:
   - Our legitimate espresso machine showroom inspection bounty (`$25.00`) passed safety screening (`screening.decision: "allow"`, `category: "item_inspection"`) and went straight to `open`.
   - Our demo against-policy bounty (`npm run demo:blocked`, asking someone to receive a 6-digit SMS verification code) was immediately caught (`status: "blocked"`, `screening.decision: "block"`, `category: "otp_solicitation"`) with `$0.00` charged or held from the balance.
4. **Clear Lifecycle & Error Model**:
   - Integer cents for all monetary fields (`reward_cents`, `available_cents`, `held_cents`, `daily_cap_cents`, `spent_today_cents`) avoided floating-point ambiguity.
   - Explicit terminal statuses (`paid`, `blocked`, `rejected_by_owner`, `expired`, `cancelled`) made the polling + webhook loop straightforward to write.

## What Didn't Work / Friction Points
See [`FRICTION_LOG.md`](./FRICTION_LOG.md) for full details. In brief:
- **MCP Tool Input Schemas (`FL-04`)**: The live `tools/list` JSON Schema uses `-9007199254740991` / `9007199254740991` (`MAX_SAFE_INTEGER`) for integer bounds on `reward_cents`, `expires_in_minutes`, `spots`, and `limit` rather than the actual domain bounds (`100–20000`, `30–10080`, `1`, `1–100`).
- **MCP Error Wrapping (`FL-05`)**: `api.md` says MCP tool results are the same JSON as REST, and the Errors section maps errors by HTTP status (`400`, `402`, `404`, `429`, `500`) and `Retry-After` headers. Over MCP, errors return HTTP `200` with `result.isError: true` and no HTTP status or `Retry-After` metadata inside the JSON error object.
- **Undocumented Screening Enums (`FL-06`)**: `screening.decision` values (`"allow"`, `"needs_owner_approval"`, `"block"`) and `screening.category` values are only discoverable by inspecting live responses.
- **Ambiguity on `rejected` Reopening (`FL-02`)**: `api.md` states a `rejected` bounty "may reopen for another worker" and omits `rejected` from terminal statuses, without explaining when it reopens vs. stays `rejected`.

## Top 3 Documentation Improvements
1. **Document `screening.decision` enum values and `deliverables` item schema in `Create a bounty`**:
   - Explicitly list `"allow" | "needs_owner_approval" | "block"` for `screening.decision`, and specify `{ type: "photo" | "text" | "location", description: string }` in the `POST /bounties` request table.
2. **Clarify MCP Error Format & `429` Backoff in `## MCP server`**:
   - Explain that MCP tool errors return `isError: true` with `{ "error": { "code": "...", "message": "..." } }` serialized in `content[0].text`, and advise MCP clients to branch on `error.code` (and distinguish owner cap `rate_limited` messages from per-minute rate limits).
3. **Clarify the `rejected` Status Transition**:
   - Explain whether `rejected` automatically transitions back to `open` (or remains claimable while in `rejected`), and under what condition a bounty stops reopening.
