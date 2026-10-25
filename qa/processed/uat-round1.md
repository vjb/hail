# UAT Report — Hail — Round 1

- Date: October 25, 2026
- App URL tested: https://hail-g9h8.onrender.com (Live Render deployment)
- Screens tested: desktop (1280px) / phone (390px)

## Findings

### UAT-1-01: Product reference photo is missing from task detail page
- **Severity:** Medium
- **Type:** Interface/UX
- **Persona:** Priya
- **Related criteria:** AC-20
- **Steps to reproduce:**
  1. Sign in as Worker 1 (Sam / Priya).
  2. In the task list, tap "Inspect a used espresso machine".
  3. Look at the section "Product reference (from Channel3)".
- **Expected:** The task detail page should display the product image alongside product title and retailer details so the worker knows what the item looks like before traveling.
- **Actual:** Only the text title "Barista Express Espresso Machine" and retailer link "macys.com · $499.95" appear; no product image is rendered.
- **Screenshot:** uat-r1-s02-task-detail-mobile.png
- **Suggestion (optional):** Render the thumbnail or image provided by Channel3 directly above or beside the product reference title.

### UAT-1-02: Control room page is not yet available
- **Severity:** Medium
- **Type:** Interface/UX
- **Persona:** Dana
- **Related criteria:** AC-15, AC-16, AC-17, AC-18
- **Steps to reproduce:**
  1. Sign in as Owner (Dana).
  2. Click "Control room" in the navigation bar.
- **Expected:** A live dashboard showing money set aside, payouts, status breakdowns, blocked reason charts, and a plain-English question input.
- **Actual:** The page displays placeholder text: "The control room opens soon. Live numbers for money set aside, payouts, blocked attempts and more."
- **Screenshot:** uat-r1-s05-control-room.png
- **Suggestion (optional):** Deploy the control room metrics dashboard and natural-language query component.

### UAT-1-03: Real-length timers prevent verifying automatic timeouts within standard test window
- **Severity:** Low
- **Type:** Interface/UX
- **Persona:** Priya / Dana
- **Related criteria:** AC-22, AC-28
- **Steps to reproduce:**
  1. As a worker, claim a task and observe the 60-minute countdown timer.
  2. As an owner, review a submitted appeal with a 24-hour review window.
- **Expected:** In automated or fast-paced testing, there is no debug fast-forward or mock clock control to test auto-release or auto-approval triggers without waiting 1 hour or 24 hours.
- **Actual:** Real wall-clock countdowns run as designed; automatic release and auto-payout criteria are blocked by real-length timers.
- **Screenshot:** uat-r1-s02-task-detail-mobile.png, uat-r1-s03-rejection-feedback-mobile.png
- **Suggestion (optional):** Provide a sandbox time-dilation toggle or test endpoints for UAT environments to advance task reservation and review windows.

### UAT-1-04: Camera live hardware capture deferred for manual device execution
- **Severity:** Low
- **Type:** Interface/UX
- **Persona:** Priya / Kai
- **Related criteria:** AC-24, AC-42
- **Steps to reproduce:**
  1. Open camera capture modal on worker task submission.
- **Expected:** Automated browser runner should test webcam or virtual camera stream.
- **Actual:** Native camera hardware access was halted per explicit user direction ("if you are trying to use the camera, please stop. skip that part. i will do that myself later") so the user can test live camera capture on a real physical phone.
- **Screenshot:** uat-r1-s02-photo-code-mobile.png
- **Suggestion (optional):** User completes live camera and fake proof report testing with physical mobile device.

## Acceptance criteria results

| ID | Result (Pass / Fail / Blocked) | Finding ID(s) | Note |
|---|---|---|---|
| AC-01 | Pass | | Owner lands on `/owner`; workers land on `/work`. |
| AC-02 | Pass | | Worker navigation to `/owner/*` cleanly redirects to `/work`; zero error dumps or stack traces. |
| AC-03 | Pass | | Protected routes cleanly redirect unauthenticated requests to `/sign-in`. |
| AC-04 | Pass | | Balance page clearly displays both "Available" ($330.00 / $419.00) and "Set aside" ($147.00 / $123.00). |
| AC-05 | Pass | | PayPal top-up popup increases balance by exact order amount ($100.00) and logs entry in balance history. |
| AC-06 | Pass | | Refreshing page or navigating backward after top-up does not duplicate transaction. |
| AC-07 | Pass | | Closing PayPal popup without approving payment displays: "You closed PayPal without paying. Nothing was added." |
| AC-08 | Pass | | Task reward shifts from available to set aside upon agent posting, linked in balance history. |
| AC-09 | Pass | | Withdrew $10.00 cleanly; attempting to withdraw $999.00 was blocked with explanation: "You can withdraw up to $445.00. Money set aside for tasks can't be withdrawn." |
| AC-10 | Pass | | Approvals queue lists held tasks with title, pay, and specific hold reason ("Illegal or dangerous", "High risk or sensitive"). |
| AC-11 | Pass | | Approving task "Inspect a used piano" ($75.00) makes it immediately open to workers with confirmation message. |
| AC-12 | Pass | | Blocked tasks detail reason clearly ("Illegal or dangerous") and incur zero cost to owner. |
| AC-13 | Pass | | Task detail page features complete chronological timeline: Posted, Screened, Claimed, Proof submitted, Checking, Rejected, Appealed, Accepted, Paying, Paid with explanations. |
| AC-14 | Pass | | When AI inspection flags unpassed items or worker appeals, owner can review photos, notes, doubts, and Accept or Decline with one action. |
| AC-15 | Blocked: not yet available | UAT-1-02 | Page states "The control room opens soon. Live numbers for money set aside, payouts, blocked attempts and more." |
| AC-16 | Blocked: not yet available | UAT-1-02 | Control room dashboard not yet active. |
| AC-17 | Blocked: not yet available | UAT-1-02 | Plain-English query interface not yet available. |
| AC-18 | Blocked: not yet available | UAT-1-02 | Control room layout not yet available. |
| AC-19 | Pass | | Worker task list displays title, reward, location, and time remaining. |
| AC-20 | Fail | UAT-1-01 | Detailed instructions and checklist present, but product photo is missing under "Product reference (from Channel3)". |
| AC-21 | Pass | | Claiming reserves task with visible countdown; task disappears from other workers' open lists; immediately reappears if abandoned. |
| AC-22 | Blocked: real-length timer | UAT-1-03 | 60-minute claim reservation timer displays and counts down, but 1-hour wait is required to observe auto-release. |
| AC-23 | Pass | | Funded badge "Pay set aside" clearly displayed prior to claiming. |
| AC-24 | Pass | | Phone-width (390px) submission flow supports photo upload fallback, note input, location sharing, progress indicators, and confirmation. Live camera capture deferred for user hands-on testing. |
| AC-25 | Pass | | Dynamic status transitions without manual refresh: Submitting -> Checking proof -> Not accepted / Approved. |
| AC-26 | Pass | | Approved work confirms payout amount ($25.00), PayPal destination, and delivery status ("Sent to PayPal" / "In your PayPal"). |
| AC-27 | Pass | | Rejection feedback details failed checklist items, diagnostic reasons ("The serial plate reads BREVO EX-200..."), and 24h countdown to appeal. |
| AC-28 | Blocked: real-length timer | UAT-1-03 | Rejection screen notes "If they don't respond in time, you're paid automatically," but 24-hour review window timer prevents live trigger test. |
| AC-29 | Pass | | Earnings page lists all completed payouts with task title, date, PayPal status, and correct totals ("Paid to your PayPal", "On the way"). |
| AC-30 | Pass | | Account settings page displays connected and verified sandbox PayPal account; no Hail passwords or credentials required. |
| AC-31 | Pass | | Responsive loading feedback throughout ("Checking your photo…", "Checking proof…", "Opening the camera…"). |
| AC-32 | Pass | | Plain, respectful, human language everywhere; zero technical jargon or error dumps. |
| AC-33 | Pass | | Clear empty states for approvals, task lists, and transaction histories explaining what appears there. |
| AC-34 | Pass | | Full keyboard accessibility with skip link, logical tab sequence, and prominent 3px outline + 6px focus ring on all interactive elements. |
| AC-35 | Pass | | Semantic HTML landmarks, clear form labels, ARIA live regions (`aria-live="polite"` and `assertive`), descriptive image alt text. |
| AC-36 | Pass | | Excellent mobile readability at 390px viewport, touch targets >= 44x44px, no horizontal scrolling. |
| AC-37 | Pass | | Consistent vocabulary used throughout: "task", "worker", "owner", "proof", "set aside", "payout". |
| AC-38 | Pass | | Dynamic 2-minute countdown timer with custom short codes (e.g. `WHV-963`, `XUH-774`, `HWK-436`) and "Get a new code" button on expiry. |
| AC-39 | Pass | | Automated photo inspector verifies codes; if code is missing or mismatched, prompts for retake with clear diagnostic and routes to owner review if submitted. |
| AC-40 | Pass | | Owner proof review cards report in plain English: code visibility status, screen/editing detection, capture method, and scene consistency. |
| AC-41 | Pass | | Permanent public proof certificate generated at `/proof/:id` containing checklist outcomes, SHA-256 image hashes, timestamps, and strictly omitting worker identity, exact GPS coordinates, and raw images. |
| AC-42 | Blocked: user testing camera | UAT-1-04 | "Report proof as not genuine" flow and worker pause deferred per user request to execute camera capture on real hardware. |
| AC-43 | Pass | | One-tap demo sign-in buttons for Dana, Sam, Alex, Jordan, Riley; no passwords exposed. |
| AC-44 | Pass | | Offline banner appears immediately on network loss: "You're offline. Your reservation and anything you've entered are kept here; we'll update when you're back online." and automatically dismisses when online. |

## Round summary
- **Totals:** 4 findings — Critical 0, High 0, Medium 2, Low 2
- **Top 5 issues to fix first:**
  1. **Fix missing product photo (UAT-1-01 / AC-20):** Display the product image from Channel3 on the worker's task detail page under "Product reference".
  2. **Launch Control Room dashboard (UAT-1-02 / AC-15 to AC-18):** Replace placeholder with live balance, payout, task status breakdown, and natural-language query interface.
  3. **Add sandbox clock dilation for UAT (UAT-1-03 / AC-22, AC-28):** Provide a test-only fast-forward toggle so testers can verify 1-hour reservation timeouts and 24-hour review auto-approvals without waiting full wall-clock durations.
  4. **Live mobile camera testing (UAT-1-04 / AC-24, AC-42):** Complete physical camera and fake-proof reporting tests on handheld device hardware.
  5. **Task abandonment feedback (AC-21):** When a worker clicks "Give this task back", provide a brief toast or confirmation message acknowledging the return.
- **What works well (keep it):**
  - **Financial Safety & PayPal Sandbox:** Funds are strictly held in escrow ("set aside") before tasks become visible; PayPal top-up and withdrawal are seamless, accurate, and completely resilient to browser reloads or popup cancellation.
  - **Trust & Verification System:** The combination of 2-minute short codes, automatic image screening, plain-language rejection diagnostics, worker one-shot appeals, and SHA-256 proof certificates provides an exceptionally thoughtful, privacy-preserving verification workflow.
  - **Accessibility & Mobile UX:** Flawless keyboard navigation with high-visibility focus indicators, excellent ARIA live notifications, resilient offline detection, and clean 390px mobile layout.
- **Would Dana trust this with her money?** Yes — Dana can see exactly what is available vs. set aside at all times. Money is only released when proof passes verification or when Dana explicitly approves an appeal. Blocked tasks cost $0, top-ups cannot double-charge, and withdrawals are strictly capped to available funds.
- **Would Priya use this again?** Yes — Priya gets guaranteed funded tasks where pay is held before she starts. The clear checklist, dynamic live status updates, transparent rejection feedback with diagnostic explanations, and ability to appeal make the experience fair, transparent, and trustworthy.
- **Could Kai complete a task unaided?** Yes — Screen reader landmarks, logical tab indexing, high-contrast focus rings, plain-language status banners, and lack of keyboard traps ensure full keyboard and assistive technology operability.
