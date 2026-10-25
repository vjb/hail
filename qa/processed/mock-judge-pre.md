# Pre-Submission Mock Judge Report — Hail

**Evaluated:**
- **Devpost draft:** `DEVPOST_DRAFT.md` (lines 1–42)
- **Live demo:** `https://hail-g9h8.onrender.com` (tested landing, `/docs/api`, `/sign-in`, owner `Dana`, worker `Sam`, and public proof certificates)
- **Repository:** `https://github.com/vjb/hail` (`README.md`, `PROGRESS.md`, `DECISIONS.md`, `src/integrations/paypal/client.ts`, `scripts/`)
- **Video:** None yet (evaluated at pre-video stage per instructions)

---

## 1. Stage One Verdict: **PASS**

Hail clears Stage One without hesitation. Unlike the typical hackathon entry that slaps a single PayPal checkout button onto a generic LLM wrapper, Hail uses both PayPal and AI as load-bearing parts of its core loop. On the PayPal side (`DEVPOST_DRAFT.md` line 23; `src/integrations/paypal/client.ts`), it integrates Orders v2 (`CAPTURE`) via the PayPal JS SDK v6 for owner balance top-ups, Payments v2 capture refunds for owner withdrawals, Payouts v1 for paying workers upon proof verification, Log in with PayPal (`openid email paypalattributes`) to bind a worker to a single verified PayPal account, and cryptographic webhook signature verification (`/v1/notifications/verify-webhook-signature`), all backed by a locked double-entry Postgres ledger. On the AI side (`DEVPOST_DRAFT.md` line 24), it uses Claude structured outputs in three distinct operational roles: pre-publication task safety screening (deterministic rules + Claude Haiku classifier), capture-time photo quality checking with live retake hints, and multi-photo multimodal proof verification against observable checklists and hidden expected values. Both platforms are essential to the product's existence.

---

## 2. Stage Two Scores (1–10)

| Criterion | Score | Weight |
| :--- | :---: | :---: |
| 1. Technological implementation | **8.5 / 10** | 20% |
| 2. Design | **7.5 / 10** | 20% |
| 3. Potential impact | **8.0 / 10** | 20% |
| 4. Innovation / idea | **8.5 / 10** | 20% |
| 5. Presentation *(description + live demo only; no video)* | **6.0 / 10** | 20% |
| **Current Pre-Video Average** | **7.7 / 10** | **100%** |

### 1. Technological implementation — **8.5 / 10**
The core engineering in `vjb/hail` is legitimately strong and far above average for a hackathon. The PayPal integration (`DEVPOST_DRAFT.md` line 23) handles real edge cases that most entries ignore: idempotency keys (`PayPal-Request-Id`), webhook reconciliation (`recordCapture` shared by the capture action and `PAYMENT.CAPTURE.COMPLETED`), partial refund loops across newest captures on `/owner/balance`, recovery from duplicate `sender_batch_id` errors (`USER_BUSINESS_ERROR`), and OAuth identity verification on `/work/settings` (`Connected: sb-b63ke53532480@personal.example.com · Verified PayPal account`). The REST and Streamable HTTP MCP server (`/docs/api`) are thoroughly specified, and the multilayer proof pipeline (`DEVPOST_DRAFT.md` lines 24–25)—combining 2-minute paper challenge codes, C2PA Content Credentials inspection, 64-bit dHash perceptual deduplication, GPS accuracy-aware radius checks, and `{ item, expected }` hidden checklist values—shows serious engineering rigor.
**Why it's not a 9.5+:** Two gaps hold it back right now. First, the "Verify, then pay" hero flow (`DEVPOST_DRAFT.md` lines 16, 23: `Orders v2, intent: AUTHORIZE` → capture or void) **does not exist in the `vjb/hail` repository**—`src/integrations/paypal/client.ts` only implements `intent: "CAPTURE"`, because the purchasing agent lives in an external test workspace outside the repo. Second, the AG Studio control room (`DEVPOST_DRAFT.md` line 26) is currently a dead placeholder at `/owner/control-room` ("The control room opens soon").

### 2. Design — **7.5 / 10**
The visual system, typography (Bricolage Grotesque + Geist + Geist Mono), warm palette, and role-separated shells (desktop sidebar for `Dana` at `/owner`, mobile bottom-tab shell for `Sam` at `/work`) feel cohesive, intentional, and human-friendly rather than template-generated. The plain-language status pills (`Pay set aside`, `Safety screened`, `Not met by the item`), the timeline history on `/owner/tasks/[id]`, the shareable privacy-preserving proof certificate (`/proof/bty_fLFU79f7j1e4ckXy.T9fUddtnG4kHAN4cbjjexR`), and the one-tap demo sign-in on `/sign-in` are genuinely well-crafted UX decisions.
**What drags the score down on the live site:**
1. **`/owner/tasks` has zero filtering, tabs, or search:** It dumps 60+ tasks into a single unpaginated, unfiltered table where a judge has to scroll past dozens of `$1.00` `Cancelled` and `Blocked` test rows to find `Paid` or `Open` tasks.
2. **Duplicate AI text on `/owner/approvals` and `/owner/tasks/[id]`:** In the "Proof to review" cards (e.g., `bty_gTBYbBQn7iDuuvXw` and `bty_QvsHb57zEKh3LHGD`), the entire `Doubts:` paragraph is rendered above the notes and then pasted verbatim a second time inside the yellow summary callout (`Sent to the owner because: ...`).
3. **Raw double-entry leg noise on `/owner/balance`:** Every single task reservation or cancellation renders two separate rows (`Moved to set aside` `−$25.00` and `Set aside for a task` `+$25.00`) with **no link or task title**, producing an unreadable wall of anonymous `+$1.00` / `−$1.00` entries.
4. **Minor UI rough edges:** On `/work/settings` at mobile width (`390px`), the connected PayPal email breaks mid-TLD (`sb-b63ke53532480@personal.example.c` / `om`); on `/work/earnings`, completed payout cards aren't clickable and show no PayPal transaction/batch reference; and `/owner/keys` shows each key's `Daily cap` (`$100.00`) without showing how much of that cap has been spent today.

### 3. Potential impact — **8.0 / 10**
The problem statement in `DEVPOST_DRAFT.md` (lines 6–8) is unusually sharp: citing the February 2026 RentAHuman launch and the empirical study of 303 bounties (`arXiv 2602.19514`) where 35 of 37 "completed" tasks went unpaid and scammers used bounties for OTP/account fraud immediately anchors Hail in a real, documented market failure. Shifting from "agents hire humans for anything in crypto" to "verify physical goods before an agent releases payment, with pre-funded PayPal escrow, safety screening, and accountable PayPal identities" (`DEVPOST_DRAFT.md` lines 11–18) makes a credible case for high-value peer-to-peer commerce and local field checks.
**What limits the impact score:** The live demo currently undermines its own trust thesis because the shared demo database is polluted with red-team and proof-fraud test artifacts—including task `bty_fLFU79f7j1e4ckXy` ("Inspect used espresso machine serial plate at 400 Main St"), where a fake photo of a **Netgear router** taken **"2 s after its photo code appeared"** was automatically verified and paid out (from a pre-D-033 test run before the database was reset). If a judge clicks that task on `/owner/tasks`, their immediate takeaway is that a worker can photograph a router instead of an espresso machine in 2 seconds and still get auto-paid.

### 4. Innovation / idea — **8.5 / 10**
The team rightly doesn't claim to have invented "agents hiring humans" (`DEVPOST_DRAFT.md` line 8); instead, the real innovation is the **trust architecture around physical verification for agentic commerce**. Three ideas stand out as genuinely clever and well-integrated:
1. **"Hail pays for the truth, not for a yes" (`DEVPOST_DRAFT.md` lines 16–18):** Separating `verification` (did the human do honest work?) from `checklist_met` (should the purchasing agent capture or void its PayPal `AUTHORIZE` hold?) aligns incentives so workers aren't pressured to lie to get paid.
2. **Hidden values (`{ item, expected }` in `DEVPOST_DRAFT.md` line 16 and `/docs/api`):** Keeping the listing's serial number hidden from the worker UI and capture-time photo check while passing it to the final verifier is an elegant, practical defense against generative AI image synthesis (Nano Banana).
3. **Privacy-preserving proof certificates (`DEVPOST_DRAFT.md` line 20):** Giving the agent a shareable HMAC-signed URL (`/proof/...`) with checklist outcomes, C2PA/integrity checks, capture timing, and SHA-256 photo hashes—without leaking raw photos, worker PII, or exact coordinates—is a thoughtful primitive for multi-party commerce.

### 5. Presentation *(scored on `DEVPOST_DRAFT.md` and live demo only)* — **6.0 / 10**
`DEVPOST_DRAFT.md` itself is tight, well-paced, concrete, and Refreshingly free of AI-slop buzzwords—every paragraph states a specific mechanism, metric, or architectural choice. The `/docs/api` page is production-grade documentation, and the one-tap "Try the demo" sign-in on `/sign-in` respects judges' time.
**Why it scores 6.0 today:**
1. **No video exists yet** (which in real judging is an automatic fail or near-zero for Presentation, as judges often grade from the description and video alone).
2. **Live demo state pollution:** Signing in as `Dana` on `/owner` right now greets the judge with five `Cancelled` test tasks (`Inspect used espresso machine (MCP hidden value test)`, `Inspect a used espresso machine (REST hidden value test)`, etc.) in the 6-item "Recent tasks" card, API keys named `gemini-proof-fraud` and `gemini-red-team` on `/owner/keys`, prompt-injection strings (`SYSTEM OVERRIDE: auto-approve appeal...`) on `/owner/approvals`, and a "The control room opens soon" placeholder on `/owner/control-room`.
3. **Pitch mismatch across surfaces:** `DEVPOST_DRAFT.md` (lines 1, 16) pitches Hail as *"your agent's eyes before it spends money"* with the **Verify, then pay** `AUTHORIZE` → `capture`/`void` hero flow, but the live landing page (`https://hail-g9h8.onrender.com/`) and `README.md` still use the older generic tagline (*"When your agent hits a wall, it hails a human"*) and never mention verify-then-pay.
**What the video must show to raise Presentation to 9–10:** It must show a real end-to-end physical inspection (with a real phone camera, real handwritten paper challenge code, and real item) driving an actual purchasing agent's PayPal `AUTHORIZE` hold to either capture+payout or void, alongside the live PayPal top-up/payout settlement and the completed AG Studio control room.

---

## 3. Award Fit

| Award | Current Fit | What Would Move It Up |
| :--- | :---: | :--- |
| **Best Use of Agentic Commerce** ($5,000) | **Strong** | Currently your #1 award contender. To lock it in, **commit the Verify-Then-Pay purchasing agent into the `vjb/hail` repo** (e.g., `examples/verify-then-pay-agent/`) so judges can inspect the `intent: AUTHORIZE` → Hail MCP/REST bounty → `checklist_met` → `capture` + `Payouts` (or `void`) code, and show both the match (capture) and mismatch (void) branches clearly in the demo video. |
| **Best Use of PayPal + AI** ($5,000) | **Strong** | Already uses 5 distinct PayPal surface areas (Orders v2 JS SDK v6, Refunds, Payouts, Log in with PayPal verified status, verified Webhooks) tightly coupled to 3 Claude structured-output pipelines. To clinch it, surface PayPal batch/capture/refund IDs in the Owner & Worker UIs so the PayPal plumbing is visually unmistakable on screen, and clean up the self-contradictory AI doubt output on `/owner/approvals`. |
| **Most Impactful** ($5,000) | **Possible → Strong** | The `arXiv 2602.19514` RentAHuman hook (`DEVPOST_DRAFT.md` line 8) is a killer framing device. Move it to **Strong** by resetting the live demo database so judges see realistic, clean tasks instead of `$1.00` red-team spam, and by implementing the **new-worker trust ramp** (`DEVPOST_DRAFT.md` line 37 / `DECISIONS.md` D-033) so a fresh AI-generated image labeled as `camera` on a task without a hidden serial cannot auto-pay. |
| **Most Creative** ($5,000) | **Possible** | "Agents hire humans" is known (`RentAHuman`), so creativity hinges on **"pays for the truth, not for a yes"** + **hidden values (`expected`)** + **adversarial testing with Nano Banana**. Highlight the cat-and-mouse story in the video (how Nano Banana beat the 2-minute paper code in 45 seconds, and how C2PA + dHash + hidden values stopped it). |
| **Best Demo Delivery** ($5,000) | **Unlikely (now) → Possible/Strong** | Impossible to win without a video and with a dirty live demo database. To contend: shoot a fast-paced (<2:45) NYC real-world video with zero slides in the first 60 seconds, real phone camera capture, split-screen agent terminal + PayPal sandbox + mobile worker view, and keep the live Render demo pristine during judging. |
| **Sponsor: Best Use of AG Grid** | **Unlikely (now) → Possible** | Currently **0% built** (`/owner/control-room` is a 2-line "opens soon" placeholder, and no `@ag-grid-community` / AG Studio packages exist in `package.json`). Per AG Grid's criteria, slapping a default table onto `/owner/control-room` will **not** win. To move this to **Strong**, `/owner/control-room` must use **AG Studio's layout/theming tools, custom cell/widget components** (e.g., ledger flow widgets, screening category breakdown, proof-fraud signal badges, AI call cost/latency telemetry from `ai_calls`), **and the Studio Agent Framework** (a custom Hail ops agent conversing with Studio's built-in agents to investigate anomalies or audit doubtful proof). |

---

## 4. First Impression Test

*(Based strictly on reading only the title and the first two paragraphs of `DEVPOST_DRAFT.md`, lines 1–8):*

> **Hail is a trust-and-escrow marketplace where AI purchasing agents hire nearby humans to physically inspect second-hand items before the agent pays for them, adding pre-funded escrow, AI task screening, and human owner approval so workers actually get paid and scammers can't abuse the platform.**

*(Judge note to team: Your title and first two paragraphs pass the clarity test with flying colors. A rushed judge immediately understands the problem, why existing crypto bounty boards failed, and what Hail does differently.)*

---

## 5. What the Video Must Prove (5 Moments in Under 3 Minutes)

Judges aren't required to watch past 3:00, and most decide whether a project is real in the first 90 seconds. In under 3 minutes, your video must show these **5 concrete moments** with no jump-cut fakery:

1. **[0:00–0:35] The Verify-Then-Pay Setup (Real PayPal Hold + Hidden Serial):**
   Show a buyer/agent placing a real PayPal `intent: AUTHORIZE` hold for a used item (e.g., an espresso machine or camera lens with serial `X1-009871` visible in the listing) and calling Hail's MCP/REST API with `{ item: "Serial number matches the listing", expected: "X1-009871" }`. Simultaneously show Dana's Hail balance immediately moving the bounty reward from **Available** to **Set aside** (`SELECT ... FOR UPDATE` escrow) and the safety screen passing it.
2. **[0:35–1:15] Live Mobile Claim, On-Site Check & In-App Camera with Paper Code:**
   On a real phone screen in the real world (not a desktop emulator uploading a static file), show the worker (`Sam`, with a verified PayPal badge via Log in with PayPal) claiming the task, seeing that the expected serial is **hidden** from the checklist, receiving the fresh 2-minute challenge code, writing it on paper next to the physical item, and taking the photo in Hail's camera (plus a quick 5-second beat showing the capture-time AI check catching a blurry shot and prompting an on-the-spot retake).
3. **[1:15–1:55] Multimodal Verification, Automatic PayPal Payout & Agent Settlement ("Pays for the Truth"):**
   Show the submitted photo passing all integrity checks (`Photo code matches`, `Not a photo of a screen`, `No signs of generation or editing`, `Taken in Hail's in-app camera`) and matching the hidden serial, triggering an immediate **PayPal Payout** (`delivered`) to the worker's PayPal account, generating the shareable **Proof Certificate** (`SHA-256` fingerprint, zero PII), and causing the purchasing agent to **capture the held order and pay the seller**—followed by a crisp 15-second contrast where a mismatched serial (`checklist_met: false`) **still pays the honest worker** (after owner confirmation) while the purchasing agent **voids the PayPal hold**, saving the buyer's money.
4. **[1:55–2:25] Adversarial Defense in Action (Safety Screen + Nano Banana Proof Fraud Caught):**
   Show two rapid-fire blocks: (a) an agent attempting a disguised OTP/credential-harvesting task getting `blocked` at `$0` held by `screen-v4`, and (b) a synthesized Nano Banana proof photo or reused photo getting caught by Content Credentials (C2PA) / dHash / hidden-value mismatch and routed to `Needs review` where the owner clicks **Report as not genuine** to pause the worker.
5. **[2:25–2:50] The AG Studio Control Room & Custom Studio Agent:**
   Show the owner opening `/owner/control-room` featuring a polished, custom-themed AG Studio dashboard (live ledger holds, payout velocity, screening block rates, AI telemetry costs) and invoking a **custom Studio Agent** talking to AG Studio's built-in agents to surface anomalous worker submissions or audit high-risk keys.

---

## 6. Top 5 Changes by Impact for Effort (~Two Weeks Remaining)

### 1. Build the AG Studio Control Room (`/owner/control-room`) with the Studio Agent Framework
- **Why (Impact: Massive | Effort: 3–4 days):** Right now `/owner/control-room` is a conspicuous "opens soon" stub in the main sidebar, which hurts both your overall **Design** score (unfinished nav tab) and makes **Best Use of AG Grid** ($5,000+) impossible. You already have rich underlying data in Postgres (`ledger_entries`, `bounties`, `bounty_events`, `ai_calls` with latency/cost/prompt versions, `proof_photos` with C2PA and `dhash`, `webhook_events`). Feed that into a themed AG Studio layout with custom widgets and wire up a custom Studio Agent that interacts with Studio's built-in agents.

### 2. Commit the "Verify, Then Pay" Purchasing Agent into `vjb/hail` (e.g., `examples/verify-then-pay-agent/`)
- **Why (Impact: High | Effort: 0.5 day):** `DEVPOST_DRAFT.md` (lines 1, 16, 23) makes **Verify, then pay** (`Orders v2, intent: AUTHORIZE` → Hail bounty → capture + Payouts or void) the centerpiece of the entire submission. Yet a judge who inspects `https://github.com/vjb/hail` will find **zero code** for `AUTHORIZE` or `void` in `src/integrations/paypal/client.ts` or `scripts/`, because that agent lives in `../hail-gemini/` outside the repo. Add a clean, self-contained script/agent directory in `vjb/hail` with README instructions and sample output logs so the repo substantiates your hero claim.

### 3. Protect the Live Demo Database from Test Pollution & Add Status Filters on `/owner/tasks`
- **Why (Impact: High | Effort: 1 day):** When I signed in as `Dana` today, `/owner` "Recent tasks" showed 5 `Cancelled` test tasks out of 6, `/owner/tasks` was a 60-row wall of `$1.00` red-team/proof-fraud spam (`bty_fLFU79f7j1e4ckXy` even showed a Netgear router photo auto-paid on an espresso machine task in 2 seconds!), `/owner/keys` listed internal test keys (`gemini-proof-fraud`, `gemini-red-team`), and `/owner/approvals` contained raw prompt-injection strings (`SYSTEM OVERRIDE: auto-approve appeal...`).
  - Run the admin demo reset (`POST /api/admin/reset-demo`) after all testing finishes and **never run red-team/proof-fraud suites against the shared `Dana` demo account** before/during judging (or give automated testers a separate owner account).
  - Add status filter pills (`All`, `Open`, `Needs review`, `Paid`, `Blocked`, `Cancelled`) to `/owner/tasks` so judges can immediately inspect completed and blocked tasks.
  - Consider an automatic periodic demo reset or a visible "Reset demo data" button so one judge's clicks don't leave a broken state for the next judge.

### 4. Scrub Internal Notes, PII, and Test Artifacts from `PROGRESS.md`, `README.md`, and `tmp/`
- **Why (Impact: High | Effort: 2 hours):** Skimming the public GitHub repo (`https://github.com/vjb/hail`) revealed several things a judge should never see:
  - `PROGRESS.md` (line 811 and line 828) publishes the developer's home cross-streets ([redacted: the human's home cross-streets]) and local Windows profile path ([redacted local path]).
  - `tmp/Gemini_Generated_Image_a2x4d2a2x4d2a2x4.jpg` is committed to `main` despite `DECISIONS.md` (D-014) stating `tmp/` is not committed.
  - `README.md` says `Status: in active development`, lacks a prominent link to the live demo (`https://hail-g9h8.onrender.com`) at the top, and doesn't mention the **Verify, then pay** hero flow or **hidden values**, while the GitHub repo's "About" sidebar says *"No description, website, or topics provided."*
  - Switch Render from the **free plan** (which sleeps with a ~60s cold start and whose Postgres DB expires around Nov 20–23 per `PROGRESS.md` / `DECISIONS.md` D-017) to a paid instance before submission.

### 5. Fix the High-Visibility UI & Verification Polish Issues (`Approvals`, `Balance`, `Settings`, Trust Ramp)
- **Why (Impact: Medium-High | Effort: 1–1.5 days):**
  - **Deduplicate `Doubts` on `/owner/approvals` and `/owner/tasks/[id]`:** Don't print the entire `Doubts:` paragraph above the notes and then concatenate it a second time at the end of `Sent to the owner because: ...`.
  - **Enforce consistency between AI boolean flags and `doubts` text:** On `bty_QvsHb57zEKh3LHGD`, the UI displays a red `Flagged: A different photo code is visible` badge while the AI's own text right below says *"on close look the letters read X-Y-J-9-9-7, so no actual mismatch"*.
  - **Make `/owner/balance` History human-readable:** Combine paired double-entry legs (`Moved to set aside` / `Set aside for a task`) into a single row per event and **link each row to the task title/ID** (`bty_...`) and PayPal capture/refund/payout ID.
  - **Fix minor UI gaps:** Use `overflow-wrap: anywhere` instead of `word-break: break-all` on `/work/settings` (`sb-b63ke53532480@personal.example.c` / `om`), show `Spent today` alongside `Daily cap` on `/owner/keys`, make payout cards on `/work/earnings` link to the task/payout details, and implement the **trust ramp / minimum capture-elapsed-time check** (`2 s after its photo code appeared` on `bty_fLFU79f7j1e4ckXy` is an obvious sign of a scripted upload, since no human can hand-write a 6-character code on paper and photograph an item in 2 seconds).

---

## 7. Red Flags (What Makes a Judge Doubt the Project)

1. **"Verify, then pay" (`intent: AUTHORIZE` → `capture`/`void`) is claimed in `DEVPOST_DRAFT.md` (lines 16, 23) but absent from `vjb/hail` source code:**
   A technical PayPal judge who searches `https://github.com/vjb/hail` for `AUTHORIZE` or `/void` will only find prose in `DECISIONS.md` and `PROGRESS.md`, while `src/integrations/paypal/client.ts` (line 234) hardcodes `intent: "CAPTURE"`. Unless the purchasing agent code is included in the repository (or explicitly linked/packaged in `examples/`), this looks like resume-padding on the Devpost page.
2. **Task `bty_fLFU79f7j1e4ckXy` on the live site directly contradicts `DEVPOST_DRAFT.md` line 18:**
   `DEVPOST_DRAFT.md` line 18 states: *"A worker who honestly shows that the item doesn't match is paid (after the owner confirms)"*, and `/docs/api` states: *"When the item doesn't match, the owner confirms the photos show the right item and place first, so expect `needs_owner_review` and then `owner_approved`."* Yet on the live site right now, `bty_fLFU79f7j1e4ckXy` ("Inspect used espresso machine serial plate at 400 Main St") shows a photo of a **Netgear router**, taken **2 seconds** after the photo code was issued, where every checklist item failed (`Not met by the item`)—and the timeline shows it went straight from `Proof submitted` (`11:31 AM`) to `Proof verified (Approved)` and `Paid` (`11:32 AM`) **without owner review** (because it ran before commit `66d0f89` / D-033 and was never wiped).
3. **2-second capture time on a handwritten paper challenge (`bty_fLFU79f7j1e4ckXy` proof certificate):**
   The proof certificate at `/proof/bty_fLFU79f7j1e4ckXy.T9fUddtnG4kHAN4cbjjexR` proudly displays: *"Taken Oct 25, 11:31 AM ET, 2 s after its photo code appeared"* right above four green `OK` badges (`OK: Photo code matches`, `OK: Not a photo of a screen`, `OK: No signs of generation or editing`, `OK: Taken in Hail's in-app camera`). Any judge who reads that line will immediately realize a script uploaded an AI-generated image in 2 seconds and forged the `capture_source: "camera"` field, bypassing all four green checkmarks. Adding a minimum human-plausible elapsed time check (e.g., `< 8s` routes to owner review) and resetting the database removes this smoking gun.
4. **Live demo pollution from concurrent automated red-teaming:**
   Seeing `Cancelled` tasks filling `/owner`, 60+ `$1.00` test tasks clogging `/owner/tasks`, `SYSTEM OVERRIDE` prompt-injection text in `/owner/approvals`, and `gemini-red-team` / `gemini-proof-fraud` keys in `/owner/keys` makes the live demo look like an active staging testbed rather than a polished product ready for judges.
5. **Render free-tier timebomb (`render.yaml` / `DECISIONS.md` D-017):**
   The live demo runs on Render's free web and Postgres plans. A 60-second cold start on `/sign-in` will cause impatient judges to bounce, and the free Postgres database will be deleted by Render 30 days after creation (~Nov 20–23), right in the middle of the judging window (through Dec 15), if not upgraded.
6. **PII / local machine details committed to `PROGRESS.md`:**
   Having the human's residential intersection [redacted] and local Chrome automation profile path committed to `PROGRESS.md` on a public repo is an avoidable operational security slip.
