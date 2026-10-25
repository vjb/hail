# 03 — Build Plan (19 days)

**Deadline:** Thu Nov 12, 2026, 12:00 PM PT (3:00 PM ET). **Our target:** submitted by 12:00 PM ET that day.
US clocks change Nov 1; after that, Pacific is UTC−8.

Assumes evenings on weekdays and longer sessions on weekends. Each day has an **acceptance gate**: don't start the next day until it passes. If a day slips, take from the cut list, never from the gates.

| Day | Date | Focus | Gemini |
|---|---|---|---|
| 1 | Sun Oct 25 | Sandbox spike + scaffold | Competitor benchmark (role 6) |
| 2 | Mon Oct 26 | DB, ledger, auth, seed, design system | Benchmark report in |
| 3 | Tue Oct 27 | Top-up (PayPal checkout) + balance UI | — |
| 4 | Wed Oct 28 | Bounty service, state machine, public REST (create/get/list/cancel) | — |
| 5 | Thu Oct 29 | Safety screen (rules + AI) + owner approval queue | — |
| 6 | Fri Oct 30 | Worker app: browse, claim, submit proof | — |
| 7 | Sat Oct 31 | Verifier + payouts → **happy path end to end**; deploy to Render; MCP server | Role 1 starts |
| 8 | Sun Nov 1 | Sweeper, timers, appeals, callbacks, withdraw | Role 2 starts |
| 9 | Mon Nov 2 | AG Studio control room: data endpoints + core widgets | 1, 2 running |
| 10 | Tue Nov 3 | Studio Agent Framework ops agent; demo reset; findings intake | **UAT 1, design lab 1, five-second test 1** |
| 11 | Wed Nov 4 | Fix UAT + red-team findings | 2 running |
| 12 | Thu Nov 5 | Channel3 enrichment; red-team fixes | Role 2 final report |
| 13 | Fri Nov 6 | Custom widgets, theming, worker UI polish | — |
| 14 | Sat Nov 7 | Hardening: rate limits, webhook verification, error states | **Design lab round 2** |
| 15 | Sun Nov 8 | **Feature freeze.** Integrate Gemini's requester agent into the demo; dry-run the script | — |
| 16 | Mon Nov 9 | Fixes from dry run; storyboard frames | **UAT 2, five-second test 2, frame review** |
| 17 | Tue Nov 10 | UAT fixes; record draft video; write Devpost draft | **Mock judge** |
| 18 | Wed Nov 11 | Apply judge feedback; final video; README | — |
| 19 | Thu Nov 12 | Final checks; **submit by noon ET** | — |

---

## Day 1 — Sandbox spike + scaffold (the go/no-go day)
Everything depends on PayPal sandbox behaving as the architecture assumes. Prove it before building.

- `scripts/spike-paypal.ts` that, against the sandbox:
  1. Gets an OAuth token.
  2. Creates an order (CAPTURE), prints the approval link; after manual approval with the sandbox personal account, captures it.
  3. Partially refunds that capture.
  4. Sends a $1.00 payout to the sandbox personal account email; polls the batch until it succeeds.
  5. Uses idempotency keys on every POST and shows that repeating a call doesn't duplicate it.
- Register a sandbox webhook URL (a temporary tunnel or the Render URL) and confirm events arrive and verify.
- Scaffold the Next.js + TypeScript + Drizzle app; `typecheck`, `lint`, `test` scripts; `.env.example`.
- Activate the AG Studio trial; clone the AG Grid + PayPal boilerplate somewhere outside the repo to read.
- Get the Channel3 key and make one test search.
- Create `PROGRESS.md`, `HAIL-LOG.md` and `DECISIONS.md` at the repo root (formats in `07-records-and-pipelines.md`); log every human step from the very first key request.

**Gate:** steps 1–5 all succeed and are logged. Write findings (anything that differs from `02-architecture.md`) into that doc. **If Payouts doesn't work in sandbox,** stop and tell the human; fallback is simulating payouts with a clearly labeled sandbox stub while asking on the PayPal Discord.

## Day 2 — DB, ledger, auth, seed
- Drizzle schema for all tables; migrations.
- Ledger service with balance derivation, transactional holds/releases, unique idempotency keys. Unit tests for every ledger event in the architecture table, plus a race test (two concurrent holds exceeding balance → one fails).
- Session auth, roles, seed script (owner, 2 workers, admin, a default policy, an API key).
- **Design system** per `06-design-system.md`: tokens (light/dark), fonts, logo SVG, core components, owner and worker app shells. Read the human's competitor benchmark from `qa/inbox/` if it has arrived and note patterns adopted in `DECISIONS.md`.

**Gate:** ledger tests pass; seeded users can sign in to role-appropriate empty pages that already use the design system shells; every token pair passes AA contrast (automated check).

## Day 3 — Top-up + balance
- PayPal JS SDK button on the owner Balance page; create/capture server routes; ledger credit.
- Balance page: available, held, ledger table; empty and error states.
- PayPal webhook route with signature verification and idempotent processing.

- **Playwright e2e suite** per `05-autonomy-protocol.md`, including automated PayPal sandbox approval. First tests: sign-in per role and top-up.
- **Screenshot pipeline** (`npm run screenshots`) per `07-records-and-pipelines.md`, starting with the screens that exist; extend the manifest every day.

**Gate:** owner tops up $200 in the browser with the sandbox personal account; balance shows $200 available; webhook recorded; refreshing or replaying the webhook doesn't double-credit. The top-up e2e test passes without human clicks (or is skipped with H3 raised if PayPal shows a captcha).

## Day 4 — Bounties + public REST
- State machine with exhaustive transition tests (every legal transition, a sample of illegal ones rejected).
- `POST/GET /api/v1/bounties`, `GET /api/v1/bounties/:id`, `POST /api/v1/bounties/:id/cancel`, `GET /api/v1/balance` exactly per `docs/public/api.md`, with API-key auth, idempotency keys, documented errors.
- Screening is a stub that always allows (real one tomorrow).

**Gate:** with curl, an API key posts a $25 bounty; $25 moves from available to held; cancel releases it; insufficient funds returns the documented error.

## Day 5 — Safety screen + approvals
- Rules layer + AI classifier via `AIProvider`; stricter outcome wins; store both layers' results.
- Owner policy (threshold, max open, categories) enforced; rate limits per key.
- Owner approval queue: approve → `open`; reject → released.
- Test set in `tests/screening/`: at least 15 allowed, 15 blocked (covering all 7 blocked categories), 5 needs-approval cases, and 3 prompt-injection attempts. Track pass rate.
- **AI telemetry** (`ai_calls` table, cost estimates) and `npm run eval:screening` writing `qa/eval-history.csv`.

**Gate:** ≥ 90% of the screening test set lands in the right bucket; zero blocked-category cases come out `allow`.

## Day 6 — Worker app
- Mobile-first pages: open bounties, detail with "what to capture" checklist, claim (with timer), submit proof (camera/file input, notes, optional location), status, earnings, PayPal email setting.
- Photo resize + storage.

**Gate:** at 390px wide, a seeded worker claims a bounty and submits two photos; the bounty shows `verifying`. All controls reachable by keyboard and labeled.

## Day 7 — Verify + pay + deploy + MCP (milestone: happy path)
- Verifier via `AIProvider`; pass → `approved` → payout → `paid`; fail → `rejected`; uncertain → `needs_owner_review`.
- Owner review UI for uncertain submissions.
- `render.yaml` Blueprint (web, Postgres, cron); human connects the repo once (H4). Deploy; point webhooks at Render; run the e2e suite against the Render URL.
- MCP server at `/api/mcp` with the documented tools.
- Make `docs/public/api.md` accurate for what's live. **Hand it to the human for Gemini role 1.**

**Gate (the big one):** on the Render URL — owner tops up; an agent (curl or MCP client) posts a bounty; worker on a real phone claims, photographs, submits; verifier passes it; payout shows succeeded and the sandbox personal account receives it. Recorded on video as a backup.

## Day 8 — Timers, appeals, callbacks, withdraw
- Sweeper cron; claim expiry; bounty expiry with release; review-window auto-approve; appeals.
- Outbound `callback_url` events with retries.
- Withdraw via partial refunds.
- `DEMO_TIME_SCALE`.

**Gate:** with a time scale of 60, an ignored review auto-pays the worker within the scaled window; an expired bounty releases funds; withdraw returns money to the sandbox personal account.

## Day 9 — Control room, part 1
- Internal dashboard endpoints; AG Studio integrated in the owner app with the core widgets listed in the architecture.

**Gate:** control room shows live numbers matching the ledger after a full happy-path run.

## Day 10 — Ops agent + demo reset
- Studio Agent Framework: Hail ops agent answers data questions and has Studio's agents build or edit widgets.
- Admin reset-demo endpoint + button; seed includes realistic history (a few paid, one blocked, one in review).
- Prepare the UAT environment: seeded credentials, sample proof photos (from Gemini), reset working.
- Set up findings intake (`qa/inbox/`, tracker, release-notes folder) per `07-records-and-pipelines.md`.
- Fresh screenshot set for the human's **design lab** round 1 and the **five-second test**.

**Gate:** typing "which task types get rejected most?" produces a correct widget. Reset returns the app to a known state in under 10 seconds. **Human starts UAT round 1.**

## Days 11–12 — Findings and Channel3
- Triage all findings in `qa/inbox/` (UAT, red team, outside-developer friction log, design lab, first impressions): fix all critical/high, most medium. Write tester release notes.
- Every red-team bypass becomes a test case in `tests/screening/` before it's fixed.
- Channel3 enrichment at posting; product card on worker detail; product reference passed to verifier.

**Gate:** all critical/high findings closed; screening test set ≥ 95% with the red-team cases included; a product-linked bounty shows its product card.

## Days 13–14 — Polish and hardening
- Custom AG Studio widgets and Hail theme; worker UI polish; empty/loading/error states everywhere.
- Webhook verification, rate limits and auth checks reviewed; no internal details in public errors.
- README: setup, env vars, seeded accounts, architecture summary, how judges can run it, license.

- Confirm production serves no browser source maps and no identifying headers (see CLAUDE.md, "Opaque to outsiders").
- Fresh screenshots for **design lab** round 2 (the human runs it on Day 14–15).

**Gate:** a fresh clone + README instructions runs locally; the hosted demo works end to end from a logged-out browser.

## Day 15 — Feature freeze + demo integration
- Run Gemini's requester agent against production; script the demo scenario (espresso machine inspection) end to end.
- Full dry run of `04-pitch-and-demo.md` with a timer.

**Gate:** the full demo runs twice in a row without manual fixes.

## Days 16–19 — Test, record, submit
- Day 16: UAT round 2 and five-second test round 2; fix what they find. Export storyboard frames (screenshots in demo-script order) for the human's video frame review.
- Day 17: record draft video (under 3:00); Devpost draft from `DECISIONS.md` tags; mock judge.
- Day 18: apply judge feedback; final video on YouTube (public); final README; compile `docs/devpost-notes.md`; final HAIL-LOG and AI-cost totals for the pitch.
- Day 19: submission checklist (below); submit by noon ET.

## Submission checklist
- [ ] Public GitHub repo with an open-source license visible in the About section
- [ ] README with setup/run instructions and seeded test credentials (sandbox only)
- [ ] Hosted demo URL working, logged-out test path verified
- [ ] YouTube video, public, under 3 minutes, no copyrighted music or third-party trademarks without permission
- [ ] Devpost text: features, how PayPal and AI are used, tools/models used and how
- [ ] Sponsor prize selected: Best Use of AG Grid (uses AG Studio + Studio Agent Framework)
- [ ] Demo stays live and free through Dec 15, 2026 (end of judging)
- [ ] AG Studio trial still valid through judging (or confirm with AG Grid on Discord)
- [ ] Undo test-period changes on the live site:
  - [ ] Admin → **Reset demo data**. This restores the owner policy defaults (20 open tasks, 30 new tasks per key per hour), which were raised to 100 / 300 on Oct 24 for Gemini testing. It also removes the Gemini API keys and test bounties.
  - [ ] Revoke the `hail-requester-agent` key in the Claude Console (or let it expire Nov 23)
  - [ ] Render on paid plans before the free database expires (~Nov 23; D-017)

## Cut list (in order, if behind)
1. Withdraw (show balance only)
2. Outbound callbacks (agents poll instead)
3. Appeals (keep owner review + auto-pay on silence)
4. Channel3 enrichment (keep the scenario, drop the product card)
5. Worker leaderboard and secondary widgets

**Never cut:** fund-first escrow, safety screen, verification, real sandbox payouts, the ops-agent widget, MCP/REST, the 3-minute video.

## Stretch (only if ahead after Day 14)
PayPal Agent Toolkit tools for the ops agent; Venmo payouts; KERNEL browser attempt before escalating to a human; Gemini `AIProvider` implementation with side-by-side comparison.
