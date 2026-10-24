# CLAUDE.md — Working rules for Hail

Hail lets AI agents post **funded, safety-screened bounties** for real-world tasks, and pays the humans who complete them through **PayPal**. Built solo for the PayPal AI Hackathon; submission deadline **Thu Nov 12, 2026, 12:00 PM PT**.

## Read first
Before any work, read in order:
1. `docs/01-product-spec.md` — what we're building and why
2. `docs/02-architecture.md` — how it fits together, PayPal flows, data model
3. `docs/03-build-plan.md` — the day-by-day plan and acceptance gates
4. `docs/public/api.md` — the public API contract (outside developers build against this)
5. `docs/04-pitch-and-demo.md` — the demo we're building toward
6. `docs/05-autonomy-protocol.md` — how to run autonomously across several days, when to stop for the human, and how to verify gates
7. `docs/06-design-system.md` — brand, tokens, type, components, AG Studio theme (set up Day 2, before any UI)
8. `docs/07-records-and-pipelines.md` — HAIL-LOG, screenshots, findings intake and tester release notes, DECISIONS, AI telemetry

Keep these files current at the repo root: `PROGRESS.md`, `HAIL-LOG.md`, `DECISIONS.md`.

Work one build-plan day at a time within the run's day range. Plan each day in `PROGRESS.md`, check its acceptance gate with real evidence, then continue. Stop only at the human steps (H1–H8) in the autonomy protocol.

## Stack
TypeScript everywhere. Next.js (App Router) with React, Postgres via Drizzle ORM, zod for validation, deployed on Render (web service + Postgres + cron job). AG Studio (AG Grid) for the owner control room. MCP server via the official TypeScript MCP SDK. Use current stable versions; don't pin to versions from memory.

## Hard rules

### Money
- **Sandbox only.** Never call PayPal live endpoints. `PAYPAL_ENV` must be `sandbox`; refuse to start otherwise.
- **All money is integer cents** (`amount_cents: number`), USD only. Never floats.
- **Every balance change is a ledger entry** (see architecture). Balances are derived from the ledger, never stored as a mutable number alone.
- **Every PayPal POST sends an idempotency key** (`PayPal-Request-Id`, or `sender_batch_id` for payouts) derived from our own record ID, so retries never double-charge or double-pay.
- **A bounty can only be posted if its full reward is already held** from the owner's funded balance. No exceptions — this is the product's core promise to workers.
- Exactly one payout per bounty. Enforce with a unique constraint, not just code.

### Correctness over memory
- **Verify every external API against current official docs before coding it**: PayPal REST (Orders v2, Payments, Payouts, Webhooks), PayPal JS SDK, AG Studio and its Studio Agent Framework, Channel3, the MCP TypeScript SDK, the Anthropic SDK. Fetch the docs; don't rely on remembered shapes. If docs and this file disagree, docs win — then tell me.
- The bounty **state machine** in the architecture doc is the source of truth. All status changes go through one transition function that rejects illegal transitions.

### AI calls
- All AI goes through the `AIProvider` interface (`src/ai/`). Claude is the default implementation; a Gemini implementation may be added later. No direct SDK calls from feature code.
- Model IDs come from env vars, never hardcoded in feature code.
- AI outputs are structured JSON validated with zod. On parse failure: retry once, then fall back to the safe outcome (screening → `needs_owner_approval`; verification → `needs_owner_review`). Never fail open.
- Store every AI decision with its rationale; the dashboard and the demo show these.

### Public contract
- `docs/public/api.md` is a contract with outside developers who **cannot see this code**. Any change to the REST API or MCP tools must update that file in the same commit.
- Public error responses use the documented error format and user-facing messages. Never return stack traces, SQL, file paths or internal IDs beyond the documented ones.

### Testable by outsiders
The UI is tested blind by an independent AI agent driving a browser and by keyboard/screen-reader users.
- Every interactive element has a visible label or `aria-label`; use semantic elements (`button`, `label`, `nav`, headings in order).
- Statuses are shown as text, not color alone.
- Loading, empty and error states exist for every screen.
- Mobile-first for the worker app (test at 390px wide).
- Use only design-system tokens and core components (`docs/06-design-system.md`). No one-off colors, fonts or spacing.

### Opaque to outsiders
Outside testers use browser DevTools on the live site. They must see behavior, not implementation.
- Production must not serve browser source maps.
- Remove framework-identifying headers where possible (e.g. disable `X-Powered-By`); no internal names in HTML comments, page titles or console logs.
- No `console.log` of data in production client code; log on the server instead.

### Secrets
- Never commit secrets. All keys live in env vars; keep `.env.example` current with every variable (no values).
- The AG Studio license key and Anthropic key never appear in the repo. The repo is public.

## Commands
Keep these working and documented in the README as they're added:
- `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`
- `npm run db:migrate`, `npm run db:seed` (demo accounts and data)
- `npm run spike:paypal` (Day 1 sandbox spike)
- `npm run e2e` (Playwright, from Day 3), `npm run screenshots` (from Day 3), `npm run eval:screening` (from Day 5)

Run `typecheck` and `test` before every commit. Commit small, with clear messages.

## Demo support (build these, they're product features)
- Seeded demo accounts (owner, two workers, admin) — credentials in env, listed in README.
- `POST /api/admin/reset-demo` + a button in the admin view: wipes and reseeds everything.
- `DEMO_TIME_SCALE` env var shortens timeouts (claim expiry, auto-pay on owner silence) for demos.

## What not to do
- Don't add features outside the spec without asking. Scope is the enemy; see the cut list in the build plan.
- Don't build KERNEL, Astropods, Venmo payouts or a native mobile app unless the build plan says we're ahead.
- Don't create a `gemini/` folder or any testing briefs in this repo. External testers must stay blind to it.
