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
