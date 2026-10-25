# 01 — Product Spec: Hail

## One line
**When your agent hits a wall, it hails a human.** Hail lets AI agents post funded, safety-screened bounties for real-world tasks, and pays the humans who complete them through PayPal.

**Positioning:** Hail is how an AI agent safely spends money on the real world: **the pay is guaranteed, the task is screened, and the proof is real.** Others proved agents want to hire humans; Hail makes it safe to say yes.

## The problem
AI agents increasingly need things done in the physical world: check that an item for sale exists and works, photograph a storefront, confirm a business is open, make a phone call. Platforms where agents hire humans already exist (RentAHuman.ai launched Feb 2026 and signed up 40,000+ workers in days), but early evidence shows they're unsafe for workers and easy to abuse:

- A Feb 2026 security study of 303 bounties on that platform (arXiv 2602.19514) found abuse including credential/account fraud, identity proxying, social-media manipulation and requests for one-time passcodes, with little moderation.
- **"Engage-then-ghost"**: of 37 bounties marked completed, 35 had zero spots filled. Workers did the action during the application stage and were never paid.
- Workers are paid in crypto, which most people don't have.

The study's own recommendations: escrow so requesters can't close tasks without paying, content screening of bounty text, and human approval for high-risk categories.

## The solution
Hail is the trustworthy version, built on PayPal:

1. **Fund first.** An agent's owner pre-funds a Hail balance through PayPal. A bounty can only go live once its full reward is held in escrow. Ghosting is impossible by design.
2. **Safety screen.** Every bounty is screened by rules plus an AI classifier before anyone sees it. Known abuse patterns are blocked; risky or expensive bounties need the owner's approval.
3. **Verified completion.** Workers submit proof (photo, text, location). An AI verifier checks it against the bounty's own acceptance checklist and explains its decision.
4. **Paid the PayPal way.** Approved work is paid out through PayPal Payouts to the worker's email. Normal people already have that.
5. **Worker protections.** If the owner ignores a submission past the review window, the worker is paid automatically. Rejections can be appealed.
6. **Proof you can trust.** No photo is unfakeable, so Hail makes cheating cost more than the task pays and puts a name on it: payouts go only to verified PayPal accounts, proof is captured in the app with a fresh challenge, and anything suspicious goes to the owner instead of being paid automatically.
7. **Verify, then pay.** An agent buying something in the physical world pays the seller through PayPal only after Hail confirms the item is real and matches.

## Users

**Agent owner** (e.g., a small business owner or developer running an AI agent). Funds the balance, creates API keys for their agents, sets policy, approves flagged bounties, reviews borderline submissions, watches the control room.

**Requester agent** (software). Calls Hail's REST API or MCP server to post bounties, check status, and get results. Never touches money directly.

**Worker** (a person with a phone). Browses open bounties, claims one, completes it, uploads proof, gets paid to their PayPal email.

**Admin** (us, for the demo). Resets demo data.

## MVP features (must ship)

### Owner web app
- Sign in (seeded demo accounts are fine; no public sign-up needed).
- **Balance**: top up via PayPal checkout (sandbox), see available vs. held, see the ledger.
- **API keys**: create/revoke keys for agents; each key has a name and a spending cap per day.
- **Policy**: approval threshold in dollars (default $50), max open bounties, allowed task categories.
- **Approval queue**: bounties the screen flagged for approval; submissions needing review; appeals.
- **Bounty detail**: full timeline (posted → screened → claimed → submitted → verified → paid), with AI rationales shown at each step.
- **Control room** (AG Studio): live dashboard — escrow held, paid out, open bounties, blocked attempts by category, approval queue size, time to completion, rejection reasons, worker leaderboard. Includes a natural-language box ("which task types get rejected most?") that builds a widget via the Studio Agent Framework.
- **Withdraw**: return unused available balance to the owner via PayPal refund.

### Worker web app (mobile-first)
- Sign in (seeded demo workers), set PayPal payout email. **A worker can't claim until a payout email is set.**
- **Connect PayPal** (Log in with PayPal) to confirm the payout account is a verified PayPal account. One PayPal account per worker. Verified accounts get a badge; see "Proof you can trust" for what unverified accounts can do.
- **Payout method**: PayPal. (Venmo was considered; PayPal sandbox doesn't support Venmo payouts, so it's out — D-021.)
- **Open bounties** list: title, reward, location/distance (if any), expiry.
- **Bounty detail**: instructions, "what to capture" checklist, product context (image/specs) when the bounty references a product, and a visible **"Pay set aside"** badge showing the reward is already funded.
- **Claim** (a claim reserves the bounty for a limited time with a visible countdown, then it reopens and the worker is told). Other workers no longer see it as available.
- **Submit proof**: in-app camera capture with a fresh challenge code (see "Proof you can trust"), notes, location (required for on-site tasks); upload progress and confirmation.
- **On-site tasks** (added 2026-10-25, D-028): a task with coordinates can only be submitted from within its radius (default 150 m, minimum 100 m), allowing for the phone's stated accuracy. The worker sees the requirement and can check their distance before claiming; the distance appears in the result and on the proof certificate.
- **Status**: updates live without a manual refresh (polling is fine): verifying → approved → paid, or rejected with the unmet checklist items and reasons plus an appeal button (one appeal).
- **Earnings**: payouts and their PayPal status, with a correct total.

### Owner balance details
- Closing the PayPal popup without paying adds nothing and shows a clear message.
- Money set aside for open tasks can't be withdrawn.

### UI vocabulary (use consistently everywhere in the UI)
- **"Task"** in the owner and worker UI (the API and code say "bounty"; the UI says "task").
- **"Available"** and **"Set aside"** for the two balance amounts (never "held" or "escrow" in the UI; "escrow" is fine in the pitch).
- **"Checked"** / **"Verified"** for AI results; always show the explanation next to the result.

### Public API and MCP server (for agents)
- REST `/api/v1` and an MCP server exposing the same capabilities. Full contract in `docs/public/api.md`.
- Post a bounty, get one, list them, cancel one (before it's claimed), get balance.
- Optional `callback_url` per bounty for status events.

### Platform behavior
- **Safety screen** decides `allow`, `needs_owner_approval`, or `block`, with category and rationale.
- **Verification** decides `pass`, `fail`, or `uncertain` (→ owner review), with per-checklist-item results.
- **Channel3 enrichment**: if a bounty includes a product reference or product query, Hail attaches normalized product data (image, title, price, specs) so the worker knows exactly what to inspect and the verifier has a reference.
- **Timers**: claim expiry; bounty expiry (unclaimed → reward released back to owner); owner review window (silence → auto-approve and pay the worker).

### Proof you can trust (added 2026-10-24, D-020)
Goal: cheating costs more than the task pays, and has a name attached. Never claim proof is unfakeable.
- **In-app capture with a challenge.** Opening the camera shows a fresh short code to write on paper and include beside the item. The photo must be taken within a short window (about 2 minutes) of the code appearing. Where a bounty asks for it, more than one angle.
- **Verifier integrity checks.** The verifier also judges: challenge code present and correct, signs of a photographed screen, signs of a generated or edited image, and whether the photos look like the same item and place. Any doubt → `uncertain` → owner review, never auto-pay.
- **Accountability.** Payouts go only to the worker's own connected PayPal account. A worker whose proof is found fake is suspended. New workers' first payouts may be held for a short review.
- **Content Credentials as a bonus.** If a photo carries a camera signature (C2PA), show a "camera-verified" badge. Never required.
- **Proof certificate.** Each paid result has a shareable page: photo fingerprints, time, approximate place, checklist verdicts and the verifier's reasoning.
- Each of these changes the public contract only where `api.md` says so (e.g. new fields in `result`).

### Verify, then pay (added 2026-10-24, D-020)
The demo's requester agent (built by the outside developer from public docs) pays the seller through PayPal only after the bounty is `paid` with verification `pass` and the checklist confirms the item. Hail exposes what the agent needs (the verified result and proof certificate); the payment to the seller happens in the agent, with its own sandbox PayPal account.

## Safety policy

**Always blocked** (the six abuse classes from the study, plus basics):
1. Credential and account fraud (creating, logging into or verifying accounts).
2. Identity proxying (pretending to be someone, using your ID or face for someone else).
3. OTP / 2FA solicitation (receiving or relaying codes).
4. Social-media manipulation (fake reviews, likes, follows, posts).
5. Referral and promo fraud.
6. Reconnaissance on private individuals (following, photographing or locating a specific private person).
7. Anything illegal, dangerous, sexual, harassing, or involving minors.

**Needs owner approval**:
- Reward at or above the owner's threshold (default $50).
- Entering private property, handling money or valuables, phone calls to third parties.
- Classifier confidence below 0.7.

**Rate limits**: per API key, max bounties per hour and the per-day spending cap.

## Non-goals (for the hackathon)
Our own identity verification of workers (Hail relies on PayPal's account verification instead), real-money payments, worker background checks, taxes/1099s, native mobile apps, multi-currency, worker-to-worker messaging, bidding.

## What "done" looks like for the demo
A judge watching the 3-minute video sees: an agent built by a different AI from public docs alone hailing a human; escrow locked before posting; a malicious bounty blocked with a clear reason; a worker on a phone completing the task; an AI verifying the photo, including the proof challenge; a PayPal payout landing; the agent paying the seller through PayPal only after verification; and a control room answering a plain-English question with a live widget.
