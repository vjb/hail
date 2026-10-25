# Decisions

## D-001 — AG Studio trial activated on Day 8, not Day 1 (2026-10-24)
Context: The AG Studio trial lasts 45 days. Activated on Day 1 it would end around Dec 9, before judging ends on Dec 15. The control room work starts on Day 9.
Decision: The human activates the trial on Sun Nov 1, so it runs to about Dec 16.
Alternatives considered: Activate on Day 1 and ask AG Grid for an extension.
Consequences: AG Studio docs reading and boilerplate review happen on Day 8–9. Still worth asking AG Grid on Discord about the trial length.
Devpost: —

## D-002 — Next.js 16 with Cache Components off (2026-10-24)
Context: `create-next-app@16.4.3` enables `cacheComponents` and `partialPrefetching` by default. Nearly every Hail page is per-user and reads the database or the session.
Decision: Turn both off. Pages render dynamically per request, which is simpler to reason about for money screens.
Alternatives considered: Keep Cache Components and wrap all dynamic data in Suspense.
Consequences: No static shell caching. That's fine at hackathon scale.
Devpost: —

## D-003 — TypeScript 5.x, not 7.x (2026-10-24)
Context: npm's latest TypeScript is 7.0 (the native port). `create-next-app` installs `typescript@^5`, and Next's type plugin and typescript-eslint target 5.x.
Decision: Stay on TypeScript 5.x, the version Next scaffolds.
Consequences: Revisit after the hackathon.
Devpost: —

## D-004 — Duplicate payout requests are rejected, not replayed (2026-10-24)
Context: The architecture assumed `sender_batch_id` makes payout retries safe. The Day 1 spike shows that reusing a `sender_batch_id` within 30 days returns **HTTP 400 `USER_BUSINESS_ERROR`**, not the original batch. Orders, captures and refunds do replay the original result for a repeated `PayPal-Request-Id`.
Decision: The payout service stores `payout_<bounty_id>` and the batch ID before and after the call. On a retry that gets `USER_BUSINESS_ERROR`, it treats the payout as already sent and recovers the batch from its own record, or from the HATEOAS link in the error. It never sends with a new ID.
Consequences: `02-architecture.md` (Payout) updated. Exactly-one-payout is still enforced by the `payouts.bounty_id` unique constraint.
Devpost: learned

## D-005 — Webhook simulator events verify (2026-10-24)
Context: We expected simulated events to fail signature verification. Events sent by `POST /v1/notifications/simulate-event` with our `webhook_id` came through the ngrok tunnel and **verified SUCCESS**. Real events from the spike's transactions hadn't been generated after 10+ minutes (sandbox delay).
Decision: Use the simulator for repeatable webhook tests. Confirm real-transaction events on Day 3's top-up gate.
Consequences: Webhook registration and URL changes are done through the API (`npm run webhook:register`), not the dashboard, so H2 isn't needed.
Devpost: learned

## D-006 — Automated sandbox checkout approval uses installed Chrome (2026-10-24)
Context: The Day 1 spike and the Day 3 e2e test must approve PayPal checkout as the sandbox buyer.
Decision: Playwright drives the system Chrome (`channel: "chrome"`) and logs in with `E2E_PAYPAL_BUYER_*`. It worked headless on the first try, with no captcha.
Consequences: No Playwright browser download is needed locally. CI or Render e2e will need `npx playwright install chromium`.
Devpost: built-with

## D-007 — Anthropic key expires Dec 31, 2026 (2026-10-24)
Context: The console's default key lifetime is 30 days (Nov 23), which ends before judging does.
Decision: Key `hail-dev` with a custom expiry of 2026-12-31. Spend is capped by $20 of prepaid credit with auto-reload off.
Devpost: —

## D-008 — Benchmark suggestions that change scope are held for the human (2026-10-24)
Context: The first-impressions benchmark (`qa/inbox/2026-10-24-firstlook-benchmark.md`) recommends checking each photo on-site with an immediate retake instead of reject→appeal, a map view, and "agent context" on each task.
Decision: Adopt the presentation patterns that fit the spec now: pay and the "Pay set aside" badge on every card, a safety-screened badge, a before-you-claim effort summary, a claim countdown, the 5-step timeline, and plain respectful copy. Hold **retake-before-final-submit** as an H6 question, since it changes the verification flow. No map view (out of scope).
Consequences: Raised to the human in PROGRESS.md.
Devpost: challenge

## D-009 — PayPal JS SDK v6 through `@paypal/react-paypal-js/sdk-v6` (2026-10-24)
Context: The architecture said "PayPal JS SDK, current version from docs". The current SDK is v6 (`PayPalProvider` with `environment="sandbox"`, `PayPalOneTimePaymentButton` with `createOrder`/`onApprove`/`onCancel`). It renders a `<paypal-button>` web component and opens the checkout in a popup.
Decision: Use v6 with `clientId` and `presentationMode="popup"`. Server actions create and capture the order. Orders created for the SDK flow send no `payment_source.experience_context`; the redirect URLs are only used by the spike.
Consequences: The e2e test drives the real popup. The sandbox checkout's final button is labeled "Pay".
Devpost: built-with

## D-010 — `custom_id` is the top-up ID, not the owner ID (2026-10-24)
Context: The architecture suggested `custom_id = owner_id`. Reconciliation needs to find the exact top-up.
Decision: `custom_id` = `reference_id` = our top-up ID. The owner comes from the `topups` row. Webhooks match on `supplementary_data.related_ids.order_id`.
Devpost: —

## D-011 — The capture route credits; webhooks reconcile (2026-10-24)
Context: Real sandbox webhooks arrive late. The $200 top-up's `PAYMENT.CAPTURE.COMPLETED` was delivered about 10 minutes after capture, and the Day 1 spike's events never appeared in the event list.
Decision: The server's capture call is the primary credit path. The webhook calls the same `recordCapture`, keyed on the capture ID, so whichever arrives first credits and the other is a no-op. Verified events are stored once, keyed on PayPal's event ID.
Consequences: The UI never waits on webhooks for top-ups. Payout status (Day 7) will also poll the batch from the sweeper rather than wait on webhooks.
Devpost: learned

## D-012 — One spot per bounty for now [HH-007] (2026-10-24)
Context: `api.md` allowed `spots` 1–10, but "exactly one payout per bounty" (a hard rule, enforced by a unique constraint) and the per-bounty state machine make multi-spot a much bigger build.
Decision (human, H6): the API accepts only `spots: 1`. Anything else returns `invalid_request` with "Post separate bounties for more people." The ">3 spots needs approval" rule is removed.
Consequences: `docs/public/api.md` updated in the same commit. Revisit after the hackathon.
Devpost: challenge

## D-013 — Per-photo check with retake before final submit [HH-007] (2026-10-24)
Context: The benchmark's strongest finding is that workers hate delayed, all-or-nothing rejections after they've left the location.
Decision (human, H6): while a worker is still claiming, each uploaded photo gets a quick AI check against the checklist. On a problem the worker sees a specific retake prompt, and the claim timer extends. Final submit still runs the full verification; fail → appeal stays as the backstop.
Consequences: Day 6–7 work: a per-photo `AIProvider` check, a claim-extension rule, and retake UI. Small extra AI cost per photo (tracked in `ai_calls`).
Devpost: challenge

## D-014 — Illustrations [HH-007] (2026-10-24)
Decision (human):
- The flat robot-and-human illustration becomes a hand-built inline SVG in the landing hero, using design tokens so it works in light and dark.
- The dusk street scene (Gemini-generated) is the README hero only, compressed into `docs/assets/`.
Consequences: Originals stay in `tmp/` (not committed).
Devpost: built-with

## D-015 — Screening design: rules first, Haiku 5.5 classifier, structured outputs (2026-10-24)
Context: Screening runs on every post, so it must be cheap, fast and never fail open.
Decision:
- Deterministic rules run first. If they block, no AI call is made.
- Otherwise `AI_MODEL_SCREEN` (Claude Haiku 5.5, effort medium) classifies through structured outputs into a fixed category enum.
- The stricter result wins. Confidence below 0.7 → owner approval. Any AI failure or refusal → owner approval.
- Bounty text is sent as JSON inside `<bounty>` tags, with explicit "data, not instructions" framing. Prompt versions are stored with every decision.
Alternatives considered: an AI-only classifier (slower and costlier, a single point of failure); a larger model (about 20× the cost for no measured gain on the set).
Consequences: about $0.00012 per screened task. The labeled set gates every prompt change through `npm run eval:screening`.
Devpost: built-with

## D-016 — Callback delivery rules and appeal windows (2026-10-24)
Context: `callback_url` is supplied by outside agents (untrusted). Appeals and timers needed concrete rules the spec left open.
Decision:
- **Callbacks:** only public `https` hosts. Rejected at post time with `invalid_request`, and re-checked at send time against DNS. Private, loopback, link-local and metadata IPs, `localhost`/`.internal`/`.local` names and URLs with credentials are refused. Redirects aren't followed. 10 s timeout. Retries back off at 1 m, 5 m, 15 m, 1 h, 3 h (6 attempts). Payload exactly as in `api.md`.
- **Appeals:** one per rejected submission, by the worker who submitted, within the appeal window (24 h, scaled). No appeal → reopened. Owner accepts → paid. Owner declines → reopened, or expired if past expiry. Owner silence past the review window → paid.
- The **review window** counts from the moment the bounty entered `needs_owner_review` or `appealed` (its last status change).
- **Withdraw:** debit Available first, then partial-refund the newest captures (key `withdraw_<id>_<topup>`). Anything PayPal refuses is credited back as a reversal.
Consequences: Callbacks carry no signature (not in the public contract). Agents should treat callbacks as hints and fetch the bounty, which `api.md` already says.
Devpost: challenge

## D-017 — Render on free plans until a card is added (2026-10-24)
Context: Render requires a payment method for paid instances, and the human wants to deploy without a card for now.
Decision: `render.yaml` uses free plans for the web service and Postgres. Free plans have no pre-deploy command, so migrations and the idempotent seed run in `startCommand`. They have no cron jobs, so a GitHub Actions schedule (`.github/workflows/sweep.yml`, every 5 minutes) calls `/api/internal/sweep` with the sweep secret, which also keeps the web service awake.
Consequences: Timers fire up to ~5 minutes late (GitHub schedules can lag further). A cold start takes about a minute. **The free database expires 30 days after creation (~Nov 23)**, so before judging (through Dec 15) the human adds a card and we switch back to paid plans, `preDeployCommand` and the Render cron, as the comment in `render.yaml` describes.

## D-018 — Request rate limits in process memory (2026-10-24)
Context: Day 13–14 hardening. Only business limits existed (daily cap, bounties per hour, open bounties). Sign-in, bad API keys and AI-backed photo checks had no throttle, and `api.md` already promised 429 for "too many requests".
Decision: A fixed-window limiter in process memory (`src/lib/rate-limit.ts`). 120 requests/min per API key (REST and MCP), 20 bad-key requests/min per IP, 10 failed sign-ins per email and 50 per IP per 15 min (a success clears the email's count), 40 photo uploads per worker per 15 min. 429s carry `Retry-After`. Documented in `api.md`.
Consequences: Hail runs a single web instance, so memory is enough. A restart forgets the counts, which only loosens limits briefly. IP comes from the first `X-Forwarded-For` entry, which is best effort; the per-email and per-key limits don't depend on it. If we ever run several instances, move the windows to Postgres.

## D-019 — Red team round 1: judge the deliverable; what stays by design (2026-10-24)
Context: Gemini's red team got 15 harmful bounties past the screen (of 65 policy attempts) by attaching a plausible reason ("dead-pixel test", "arborist survey", "mirror inspection") to a deliverable that was itself the harm. It also found a daily-cap race and an idempotency bug.
Decision:
- Screening prompt `screen-v3`: judge what the poster receives, not the stated reason. Block deliverables that capture on-screen codes or PINs, verification-style selfies, device credentials (asked for by any name, or from devices in use), views of a specific private home, or close-ups of locks and keypads, plus taking things from doorsteps. Approval for couriering items, for having the worker open links or scan codes on their own phone, and for full labels of used routers for sale. Rationales no longer say what would have changed the decision. Every bypass is in the eval set (`R1-*`) with three guard cases that must stay allowed. Eval: 84.4% → 100% (67/67), zero false allows.
- The daily cap is re-checked under the owner lock at hold time (RT-087). The balance was never at risk: the hold already locked and re-checked it.
- `rate_limited` and `insufficient_funds` free the Idempotency-Key like 5xx errors do (RT-051).
- By design, documented in `api.md`: the approval threshold is per bounty, and the daily cap limits the total (RT-020). Wide photos of busy public places stay allowed, like the food-truck queue case (RT-079). Rearranging store merchandise stays at owner approval (RT-080). Blocked attempts count toward bounties per hour, because each one costs a screening call (quota finding).
Consequences: Some legitimate tasks near these lines will need owner approval. The guard cases watch for over-blocking. The labels are Hail's policy, not the red team's: RT-083's request was a router for sale (approval), not a live office gateway as the summary said.

## D-020 — Positioning and three additions: proof you can trust, verify then pay, Venmo (2026-10-24) [HH: approved by the human]
Context: "Agents hire humans" isn't new (RentAHuman, Feb 2026). Hail's edge is trust. One gap: our verifier accepted AI-generated sample photos as real, so a worker could fake proof today.
Decision:
- Positioning: "the pay is guaranteed, the task is screened, and the proof is real." Address RentAHuman directly in the pitch.
- Proof you can trust: no photo is unfakeable on the web, so the goal is that cheating costs more than the task pays and has a name attached. In-app capture with a fresh challenge code and time window, verifier integrity checks that send any doubt to owner review, payouts only to a connected, verified PayPal account (Log in with PayPal's account verification status), one PayPal account per worker, suspension and a first-payout hold. Content Credentials only as a bonus badge. A shareable proof certificate.
- Verify, then pay: the requester agent pays the seller through PayPal only after a verified pass. It lives in the outside developer's agent, keeping Hail's scope small.
- Venmo payouts, if a sandbox spike shows they settle.
- Not now: Virtuals ACP on Base (PYUSD isn't confirmed on Base, it needs a testnet and real crypto plumbing, and there's no matching prize). Roadmap slide only.
Consequences: The spec's non-goal changes from "identity verification" to "our own identity verification": Hail relies on PayPal's. The "Ahead of schedule" section of the build plan holds the work and its gate.

