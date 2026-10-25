# Design Lab Report — Hail — Round 1

- Date: October 24, 2026
- Screenshot folder reviewed: `screenshots/` (68 screenshots across 17 screens, desktop 1440 and phone 390, light and dark themes)
- Live URL tested: `http://localhost:3000`

---

## Summary

- **Overall visual score:** Desktop **4.1** / Phone **3.4** (Light **3.8**, Dark **3.7**)
- **Change since last round:** N/A (Round 1 baseline)
- **Device matrix:** **5** works, **6** works with issues, **1** broken
- **Top 5 issues to fix first:**
  1. **DL-1-01:** On Worker Task Detail, the sticky "Claim and reserve" action bar and fixed bottom navigation overlap and obscure the task instructions and checklist criteria on phone viewports (`390px` and `360px`), Tablet landscape, and at 200% zoom.
  2. **DL-1-02:** When the device goes offline on a worker page, background auto-polling triggers a full unhandled navigation that crashes into the browser's `ERR_INTERNET_DISCONNECTED` dino page, wiping out the user's active screen and state.
  3. **DL-1-03:** Owner data tables (`Tasks`, `API keys`, and `Balance History`) do not adapt to mobile viewports (`360px`–`390px`). On mobile devices, they push the page layout to `585px`–`627px`, throwing the header balance, `Sign out` button, and critical table columns completely off-screen.
  4. **DL-1-04:** The Owner "Control room" navigation link opens an unfinished placeholder screen (*"The control room opens soon"*), violating the core requirement that nothing looks unfinished or placeholder.
  5. **DL-1-05:** The floating Next.js Dev Tools `"N"` badge is exposed on the live production/demo site in the bottom-left corner, directly obscuring and blocking taps to the `"Tasks"` bottom navigation tab on mobile viewports.

- **Keep these (what works well):**
  - **Brand personality & palette:** Warm paper (`#FAF8F3`), deep ink, and purposeful amber signal buttons match `brand-intent.md` cleanly and give Hail a distinct, trustworthy feel rather than a generic UI kit.
  - **Real-time feedback & reassurance:** When a worker uploads a photo, the inline review card immediately displays actionable feedback with visual status pills (*"Almost there: retake this photo"*, *"We added a little time to your reservation"*), building confidence before final submission.
  - **Financial clarity for Owners:** The dual balance display (**Available** vs. **Set aside**) in both the global header and overview cards provides immediate clarity over funds without hidden fees.
  - **Dark mode parity:** Dark mode (`#121417` background with warm off-white typography) maintains identical component hierarchies, status colors, and visual weights without contrast degradation.

---

## Part 1 — Screen scores

### Home page (`/`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | Hero headline, clear subhead, robot/human illustration, and two distinct role cards guide the user immediately. |
| Layout and spacing | 5 | Balanced two-column hero on desktop; cleanly stacked cards on mobile with generous breathing room. |
| Typography | 5 | Characterful display grotesque for hero headline; clean, legible sans body text. |
| Color and contrast | 5 | Warm paper, deep ink, and amber signal CTAs provide strong WCAG AA contrast. |
| Consistency | 5 | Light and dark variants are completely harmonious; buttons and cards share uniform radius. |
| Brand fit | 5 | Embodies the "hailing a cab" street signal metaphor and warm paper aesthetic perfectly. |
| Trust and clarity | 5 | Sandbox disclosure banner at bottom sets clear expectations; value props for owners and earners are transparent. |
| Touch and accessibility | 4 | Touch targets exceed 44px; minor: skip link is properly present. |
| **Overall** | **4.9** | A welcoming, beautifully branded landing page that sets expectations instantly. |

Issues: None.

---

### API guide (`/docs/api`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | Well-structured technical reference with clear headers, code samples, and tables. |
| Layout and spacing | 3 | Desktop layout is clean, but on mobile 390px the wide parameter tables get severely squeezed. |
| Typography | 3 | Code blocks and monospace tables are clean on desktop, but table cells wrap into single-character columns on mobile. |
| Color and contrast | 4 | High contrast syntax blocks; amber sandbox notice is prominent. |
| Consistency | 2 | Uses the forbidden word **"bounty" / "bounties"** across headings, endpoints (`POST /bounties`), and objects, contradicting `brand-intent.md`. |
| Brand fit | 2 | Fails brand terminology guidelines ("Task, not bounty"). |
| Trust and clarity | 3 | Good endpoint schemas, but conflicting terminology undermines brand trust. |
| Touch and accessibility | 3 | On mobile, table columns are crushed; horizontal scrolling on code blocks is tight. |
| **Overall** | **3.0** | Comprehensive developer docs ruined on mobile by unformatted tables and forbidden "bounty" terminology. |

Issues: DL-1-06 (see findings).

---

### Sign in (`/sign-in`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | Centered modal-style card with immediate focus on Email and Password fields. |
| Layout and spacing | 4 | Well-proportioned card with comfortable padding and clear vertical rhythm. |
| Typography | 4 | Strong "Sign in" headline; clean label hierarchy. |
| Color and contrast | 4 | Amber CTA button stands out; input borders are crisp and distinct. |
| Consistency | 4 | Consistent styling across desktop and phone, light and dark. |
| Brand fit | 4 | Hail lowercase logo with bold amber "ai" pill centered above card. |
| Trust and clarity | 2 | Helper text refers judges to "the project README" for accounts, but README contains no credentials, creating a dead end. |
| Touch and accessibility | 4 | Inputs and submit button provide comfortable >44px touch targets. |
| **Overall** | **3.8** | Clean, focused authentication form let down by a dead-end credential note. |

Issues: DL-1-09 (see findings).

---

### Sign in — wrong password (`/sign-in`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | Error alert sits directly above inputs; clear notice of authentication failure. |
| Layout and spacing | 4 | Maintains card proportions without unwanted layout shifts. |
| Typography | 4 | Legible warning text paired with alert icon. |
| Color and contrast | 4 | Red warning tone (`#B8322A` / `#F07167`) clearly indicates failure. |
| Consistency | 4 | Matches standard sign-in layout precisely. |
| Brand fit | 4 | Preserves warm paper card container and brand typography. |
| Trust and clarity | 3 | Retains user's typed email address; clearly explains why login failed without leaking sensitive account state. |
| Touch and accessibility | 4 | Alert has appropriate ARIA attributes for screen reader announcement. |
| **Overall** | **3.9** | Solid, standard authentication error state. |

Issues: DL-1-09 (see findings).

---

### Owner — overview (`/owner`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | Dual balance display and pending approval alert banner take primary focus. |
| Layout and spacing | 4 | Good grid layout on desktop; single-column card stack on mobile. |
| Typography | 4 | Geist Mono numbers make balance amounts easy to scan. |
| Color and contrast | 4 | Distinct status badges (Open, Needs approval, Blocked, Needs review, Paid) with icons. |
| Consistency | 3 | Header displays available/set aside balance; accessible name for action banner misses space ("2tasks"). |
| Brand fit | 4 | Matches owner persona: calm, trustworthy, precise about money. |
| Trust and clarity | 4 | Clear money breakdown between Available and Set aside. |
| Touch and accessibility | 4 | Mobile navigation pills and action buttons are easy to tap. |
| **Overall** | **3.9** | Clean, reassuring command center for agent owners. |

Issues: DL-1-10 (see findings).

---

### Owner — balance and top-up (`/owner/balance`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | Available/Set aside summary cards lead into Add Funds preset chips and History. |
| Layout and spacing | 2 | Desktop layout is clean, but on mobile (`360px`–`390px`) the 4-column History table forces horizontal layout overflow (`408px`). |
| Typography | 3 | Numbers in Geist Mono align well, but timestamps wrap onto 4 lines per row on mobile (`Oct / 24, / 8:59 / PM`). |
| Color and contrast | 4 | Amber PayPal button and positive/negative history amounts are clear. |
| Consistency | 4 | Add funds radio chips follow uniform pill styling. |
| Brand fit | 4 | Direct PayPal integration and straightforward financial accounting fit brand intent. |
| Trust and clarity | 4 | Reassuring breakdown of how money moves into and out of "Set aside". |
| Touch and accessibility | 3 | History table columns clip off the right edge of phone viewports. |
| **Overall** | **3.5** | Strong desktop accounting page that suffers from un-responsive tables on mobile. |

Issues: DL-1-03 (see findings).

---

### Owner — tasks (`/owner/tasks`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | Chronological list of agent tasks with immediate status indicators. |
| Layout and spacing | 2 | On mobile devices, the 5-column table forces `585px` page width, throwing Pay, Posted, and header controls off-screen. |
| Typography | 3 | Monospace pay figures are crisp on desktop; titles wrap excessively in narrow table cells on phone. |
| Color and contrast | 4 | Status pills with icons and semantic colors (amber open, violet review, green paid, red blocked) work well. |
| Consistency | 3 | Desktop table is not transformed into stacked cards on mobile. |
| Brand fit | 4 | Clean, understated interface suitable for business owners. |
| Trust and clarity | 4 | Task statuses are never conveyed by color alone; every badge includes an icon and label. |
| Touch and accessibility | 2 | Requires clumsy horizontal scrolling on phones to see pay or date posted. |
| **Overall** | **3.3** | Functional desktop table that breaks mobile viewport responsiveness. |

Issues: DL-1-03 (see findings).

---

### Owner — task detail with history (`/owner/tasks/:id`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | Task title, large pay badge, worker instructions card, and Safety Screen card are clearly delineated. |
| Layout and spacing | 4 | Side-by-side cards on desktop; logical vertical flow on phone. |
| Typography | 5 | Excellent distinction between instructions, checklist acceptance criteria, and history timestamps. |
| Color and contrast | 5 | Safety screening rationale box uses clean highlight styling without distraction. |
| Consistency | 5 | Same status badges and back-navigation patterns used throughout. |
| Brand fit | 5 | Embodies transparency: explains why the task was allowed or held by the safety screen. |
| Trust and clarity | 5 | Audit history timeline shows exact agent submission and screening timestamps. |
| Touch and accessibility | 4 | "Cancel task" button is prominent and safely separated from destructive styling. |
| **Overall** | **4.8** | One of the strongest screens in the app: transparent, clear, and reassuring. |

Issues: None.

---

### Owner — approvals (`/owner/approvals`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | Immediate focus on the proof photos requiring human decision, followed by AI checklist findings. |
| Layout and spacing | 4 | Generous photo cards showing worker submissions with captions and checklist status. |
| Typography | 4 | Clear distinction between Passed and Unclear checklist criteria. |
| Color and contrast | 4 | Purple highlight for tasks needing decision; green checkmarks and purple question marks for criteria. |
| Consistency | 4 | Primary action ("Accept and pay") uses signal amber; secondary ("Reject proof") uses clean outline. |
| Brand fit | 5 | Fulfills the core promise: "When your agent hits a wall, it hails a human." |
| Trust and clarity | 5 | Explains exactly what the AI couldn't confirm and gives the owner a note field for the worker. |
| Touch and accessibility | 4 | Action buttons are large, clear, and spaced to prevent mis-taps. |
| **Overall** | **4.4** | Highly effective human-in-the-loop review interface. |

Issues: None.

---

### Owner — API keys (`/owner/keys`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | "Create a key" form at top, followed by existing keys table below. |
| Layout and spacing | 2 | On mobile viewports, the 6-column keys table expands the layout to `627px`, clipping fields and pushing `Sign out` off-screen. |
| Typography | 4 | Monospace truncated keys (`hail_sk_...`) and caps are easy to scan. |
| Color and contrast | 4 | Understated danger styling for "Revoke" links. |
| Consistency | 3 | Table layout on mobile is unresponsive. |
| Brand fit | 4 | Straightforward API management with daily spending cap per key. |
| Trust and clarity | 4 | Clear explanation that daily cap limits agent spending. |
| Touch and accessibility | 2 | On mobile, the "Revoke" action and header `Sign out` button are unreachable without horizontal panning. |
| **Overall** | **3.4** | Good developer/owner utility hampered by unresponsive desktop table styling on phone. |

Issues: DL-1-03 (see findings).

---

### Owner — policy (`/owner/policy`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | Approval threshold leads, followed by rate limits and categorized permission checkboxes. |
| Layout and spacing | 4 | Single clean card container; comfortable vertical rhythm. |
| Typography | 4 | Inputs clearly labeled with unit helpers (USD, per hour). |
| Color and contrast | 4 | Brand-styled custom checkboxes with high contrast checkmarks. |
| Consistency | 5 | Save button follows global primary amber button styling. |
| Brand fit | 5 | Gives owners exact control over their agents' autonomy and risk tolerance. |
| Trust and clarity | 5 | Explicitly states: "Hail always blocks fraud... whatever you set here." |
| Touch and accessibility | 4 | Checkbox tap targets are well spaced; inputs have clear focus rings. |
| **Overall** | **4.6** | Clear, confident security and autonomy configuration screen. |

Issues: None.

---

### Worker — tasks near you (`/work`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 3 | Pay amount placement is inconsistent (inline right on short titles, new line on longer titles); competes with title. |
| Layout and spacing | 4 | Clean card cards with generous padding; comfortable card separation. |
| Typography | 3 | Monospace pay numbers are crisp, but brand intent calls for pay to be the dominant element on worker cards. |
| Color and contrast | 4 | Green "Pay set aside" pill is reassuring and legible outdoors. |
| Consistency | 3 | Asymmetric pay badge wrapping across cards on the same screen looks uneven. |
| Brand fit | 4 | Friendly, welcoming tone with bottom navigation tabs. |
| Trust and clarity | 5 | "Pay is set aside before you see it" headline gives workers strong confidence of payment. |
| Touch and accessibility | 3 | Whole card is clickable; however, on mobile the Next.js Dev Tools badge overlaps the "Tasks" bottom nav icon. |
| **Overall** | **3.8** | Reassuring gig list with minor visual hierarchy and floating badge overlap flaws. |

Issues: DL-1-05, DL-1-08 (see findings).

---

### Worker — task detail before claiming (`/work/tasks/:id`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 2 | Sticky bottom action bar overlaps and obscures instructions, checklist, and address text on phone and landscape viewports. |
| Layout and spacing | 1 | Major layout bug: sticky button container lacks an opaque background and sits directly over card content. |
| Typography | 4 | Large `$25.00` pay heading and clear subheadings. |
| Color and contrast | 4 | Signal amber button is unmistakable; green badge reinforces escrowed funds. |
| Consistency | 3 | Desktop layout places sticky button over the bottom card border awkwardly. |
| Brand fit | 3 | The intent is good, but overlapping elements destroy visual polish. |
| Trust and clarity | 3 | Critical instructions are unreadable when occluded by the sticky claim button. |
| Touch and accessibility | 2 | Occluded checklist items cannot be read prior to tapping the 60-minute claim commitment. |
| **Overall** | **2.8** | Critical mobile layout bug: sticky claim button obstructs the very task details workers must read. |

Issues: DL-1-01 (see findings).

---

### Worker — my task (`/work/my-task`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | Timer countdown pill (`59:47 left`) and photo upload cards are prominently structured. |
| Layout and spacing | 3 | Scrolling down past photo uploads brings fixed bottom navigation over upload forms on smaller viewports. |
| Typography | 4 | Monospace countdown timer and clean photo requirement labels. |
| Color and contrast | 5 | Live feedback alert ("Almost there: retake this photo") uses gentle yellow/amber tint with high-contrast text. |
| Consistency | 4 | Photo cards and location permission toggle share coherent design language. |
| Brand fit | 5 | "Give this task back" text button allows easy cancellation without penalty. |
| Trust and clarity | 5 | Instant AI feedback explains exactly what was missing before final submission. |
| Touch and accessibility | 3 | Floating "N" badge occludes bottom nav; "Retake photo" and "Share location" buttons are easily tapped. |
| **Overall** | **4.1** | Superb worker task execution workflow with outstanding real-time feedback. |

Issues: DL-1-01, DL-1-05 (see findings).

---

### Worker — earnings (`/work/earnings`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | Dual top cards ("Paid to your PayPal" vs. "On the way") provide instant financial status. |
| Layout and spacing | 4 | Clean card list of past payouts with date and destination. |
| Typography | 5 | Large Geist Mono payout totals align neatly and scan instantly. |
| Color and contrast | 5 | High-contrast black/white card backgrounds; green accents in history where appropriate. |
| Consistency | 5 | Matches the dual-metric card pattern used on Owner Balance. |
| Brand fit | 5 | Fast, plain, and never cute about money. |
| Trust and clarity | 5 | "In your PayPal" note reassures worker that money actually moved. |
| Touch and accessibility | 4 | Clean mobile view without horizontal overflow. |
| **Overall** | **4.8** | Exceptional financial reassurance screen for earners. |

Issues: None.

---

### Worker — account and PayPal email (`/work/settings`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | Focused card on PayPal email configuration and sign out. |
| Layout and spacing | 3 | On phone 390px, standard PayPal sandbox email addresses get clipped inside the input box. |
| Typography | 4 | Clean Geist Mono text inside email input. |
| Color and contrast | 4 | High-contrast input fields and primary amber "Save" button. |
| Consistency | 3 | Worker "Sign out" is relegated to this sub-page, whereas Owners have Sign Out in the global header. |
| Brand fit | 4 | Direct, reassuring copy: "No bank details needed." |
| Trust and clarity | 3 | Truncated email input prevents worker from verifying the full address without horizontal cursor scrolling. |
| Touch and accessibility | 4 | Large inputs and buttons; easily navigable. |
| **Overall** | **3.6** | Clean account settings page marred by input truncation on mobile. |

Issues: DL-1-07 (see findings).

---

### Admin (`/admin`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | Single centered card dedicated to resetting demo data. |
| Layout and spacing | 3 | On mobile 390px, confirmation checkbox is placed on its own line above the label text rather than inline. |
| Typography | 4 | Clear explanatory body text outlining what demo reset does. |
| Color and contrast | 2 | Disabled "Reset demo data" button uses low-contrast washed-out salmon/red text failing WCAG AA. |
| Consistency | 4 | Clean card and header layout matching Owner and Worker views. |
| Brand fit | 4 | Understated administrative utility tool. |
| Trust and clarity | 4 | Explicit confirmation checkbox prevents accidental data resets during judging. |
| Touch and accessibility | 3 | Checkbox alignment on mobile is clumsy; disabled state contrast is weak. |
| **Overall** | **3.6** | Functional demo utility with minor mobile alignment and contrast flaws. |

Issues: DL-1-10 (see findings).

---

### Cross-screen consistency
1. **Desktop vs. Mobile Table Parity:** Owner screens (`/owner/balance`, `/owner/tasks`, `/owner/keys`) and developer docs (`/docs/api`) use raw desktop HTML tables that never refactor into mobile card views, causing horizontal overflow and illegible wrapping on mobile.
2. **Global Navigation & Sign Out Divergence:** Owners and Admins have their balance and a global "Sign out" button pinned in the top desktop/mobile banner. Workers have a persistent 3-tab bottom navigation bar (`Tasks`, `My task`, `Earnings`) and their "Sign out" button is tucked away under `/work/settings`.
3. **Terminology Collision:** The web app and brand intent strictly mandate the term **"Task"** and prohibit **"Bounty"**; however, the public API Guide (`/docs/api`) uses **"bounty"** across all endpoints, schemas, and headings.

---

## Part 2 — Device and conditions matrix

| Config | Result | Finding IDs | Notes |
|---|---|---|---|
| **Small phone** (~360×640, touch) | **Works with issues** | DL-1-01, DL-1-03, DL-1-05 | Sticky claim bar covers task instructions; Owner tables force 408px width; Dev Tools "N" badge blocks Tasks tab. |
| **Standard phone** (390×844, touch) | **Works with issues** | DL-1-01, DL-1-03, DL-1-05, DL-1-07 | Sticky claim bar overlaps content; Owner tasks/keys tables force 585px–627px layout width, pushing Sign out off-screen. |
| **Large phone** (~430×932, touch) | **Works with issues** | DL-1-01, DL-1-05 | More vertical room, but sticky claim bar still overlaps card on scroll; bottom-left Dev Tools badge blocks nav. |
| **Tablet portrait** (~820×1180, touch) | **Works** | DL-1-05 | Full layout fits comfortably; bottom nav and header scale well; product cards display cleanly. |
| **Tablet landscape** (~1180×820, touch) | **Works with issues** | DL-1-01 | Shorter vertical height causes sticky claim button to sit directly on top of "What to do" text. |
| **Laptop** (1440×900) | **Works** | DL-1-04, DL-1-06 | Desktop layouts render cleanly with high polish; Control Room placeholder is obvious. |
| **Dark mode** (phone + laptop) | **Works** | DL-1-01, DL-1-03 | Visual parity is outstanding; palette tokens invert cleanly without illegible text or unstyled backgrounds. |
| **Zoom 200%** (laptop at 200%) | **Works with issues** | DL-1-01 | Effective 720×450 viewport causes sticky claim button to obscure task details card. |
| **Large text** (phone, large font) | **Works with issues** | DL-1-03, DL-1-08 | Pay amount drops onto second line on almost all cards; table cells on owner pages wrap onto 4+ lines. |
| **Slow network** (slow 3G profile) | **Works** | DL-1-05 | Loading spinner appears during page transitions; API requests complete in ~1.2s; UI remains responsive. |
| **CPU slowdown** (4× slowdown) | **Works** | DL-1-05 | Client-side photo canvas resizing and AI review responses take ~1.8s; smooth animations. |
| **Offline mid-flow** (standard phone) | **Broken** | DL-1-02 | Background polling crashes unhandled when offline, dumping the user to Chrome's `ERR_INTERNET_DISCONNECTED` dino page. |
| **Rotation** (phone portrait → landscape) | **Works with issues** | DL-1-01 | Rotating during task detail or photo capture compresses vertical space and makes sticky button obscure input cards. |

---

## Part 3 — Health audit

| Page | Load to usable | Largest paint | Layout shift | Interaction delay | Console errors | Failed requests | Notes |
|---|---|---|---|---|---|---|---|
| **Worker task list** (`/work`) | 240 ms | 258 ms | 0.00 | < 20 ms | 0 errors (3 info/log) | 0 failed (polling 200 OK) | Fast load; polls background updates every ~5s. |
| **Worker task detail** (`/work/tasks/:id`) | 268 ms | 272 ms | 0.01 | < 25 ms | 0 errors (4 info/log) | 0 failed | Fetches product image from CDN cleanly in 146 ms. |
| **Owner balance** (`/owner/balance`) | 285 ms | 290 ms | 0.00 | < 20 ms | 0 errors (2 info/log) | 0 failed | Table data renders synchronously without layout jump. |
| **Owner control room** (`/owner/control-room`) | 195 ms | 210 ms | 0.00 | < 15 ms | 0 errors (2 info/log) | 0 failed | Static placeholder card loads instantly. |

### Health notes:
- **Basics:** Page titles are present and informative (`Task · Hail`, `Tasks near you · Hail`, `Balance · Hail`, `Control room · Hail`). Favicon is loaded and valid.
- **Console symptoms:** Development environment indicators are present in the console (`[HMR] connected`, `[Fast Refresh] done in 84ms`, React DevTools promotion).
- **Network symptoms:** Polling on `/work` sends `GET /work?_rsc=...` every 5 seconds continuously.

---

## Findings

### DL-1-01: Sticky "Claim and reserve" action bar occludes task details on mobile
- **Severity:** Critical
- **Type:** Layout / Device
- **Where:** Worker task detail (`/work/tasks/:id`) on Small phone, Standard phone, Tablet landscape, and 200% Zoom
- **What you see:** The floating yellow "Claim and reserve for 60 min" button and the bottom navigation bar overlap the "What to do", "What to capture", and "Your proof is accepted when" sections of the task card. The text behind the button is visible through the margins, creating severe visual clutter.
- **Why it matters to the user:** Workers must agree to a strict 60-minute deadline without being able to read what they are committing to do or how their proof will be evaluated.
- **Suggestion:** Add sufficient bottom padding (`pb-32` or similar) to the scrollable container so content scrolls completely above the sticky button, and wrap the button in an opaque or frosted background bar (`bg-paper/95 backdrop-blur`).
- **Screenshot:** `DL-1-01.png`

---

### DL-1-02: App crashes to browser offline dino screen when network drops
- **Severity:** Critical
- **Type:** Device / Network
- **Where:** All worker pages (`/work`, `/work/tasks/:id`, `/work/my-task`) when network goes offline
- **What you see:** If the user loses network connection while viewing a task or preparing proof, the app immediately navigates to Chrome's `ERR_INTERNET_DISCONNECTED` "Tap the dino to play" error page, completely replacing the Hail interface.
- **Why it matters to the user:** Real-world gig workers frequently lose cell service in basements, stores, or transit. Crashing the entire page loses their task reservation and in-progress form inputs.
- **Suggestion:** Catch network fetch errors during background auto-polling and show a non-destructive offline status banner at the top of the screen instead of letting an unhandled error trigger full-page navigation.
- **Screenshot:** `DL-1-02.png`

---

### DL-1-03: Multi-column owner tables cause severe layout blow-out on phone screens
- **Severity:** High
- **Type:** Layout / Device
- **Where:** Owner tasks (`/owner/tasks`), API keys (`/owner/keys`), and Balance history (`/owner/balance`)
- **What you see:** On mobile viewports (`360px`–`390px`), the desktop tables force the entire page layout to `585px`–`627px` wide. Table columns (`Pay`, `Posted`, `Created`, `Last used`, `Revoke`) and header items (`Set aside $122.00` and the `Sign out` button) are pushed off-screen to the right and cannot be clicked without horizontal panning.
- **Why it matters to the user:** Small business owners checking their agents on their phone cannot see what was spent, cannot revoke compromised keys, and cannot sign out without awkward panning.
- **Suggestion:** Replace multi-column `<table>` layouts on mobile with stacked card components, or wrap tables in an explicit `overflow-x-auto` container with fixed width boundaries.
- **Screenshot:** `DL-1-03.png`

---

### DL-1-04: Owner "Control room" is an unfinished placeholder
- **Severity:** High
- **Type:** Trust & clarity / Exposure
- **Where:** Owner navigation → `/owner/control-room`
- **What you see:** Clicking "Control room" in the primary navigation opens an empty screen with an inbox icon and the text: *"The control room opens soon — Live numbers for money set aside, payouts, blocked attempts and more."*
- **Why it matters to the user:** The rubric explicitly penalizes placeholder or unfinished elements. It reduces owner trust in the platform's stability and readiness for managing real money.
- **Suggestion:** Either implement the live metric dashboard for Round 2 or hide the "Control room" link from the navigation until the feature is functional.
- **Screenshot:** `DL-1-04.png`

---

### DL-1-05: Next.js dev tools floating badge exposed on live site and blocks navigation
- **Severity:** High
- **Type:** Exposure / Touch
- **Where:** All pages on the live site (`http://localhost:3000`), bottom-left corner
- **What you see:** A dark circular floating button with a white `"N"` badge sits at the bottom-left of every screen. On mobile viewports (`360px` and `390px`), it sits directly on top of the `"Tasks"` bottom navigation tab icon and text.
- **Why it matters to the user:** It exposes internal development tooling on what is meant to be a polished production review, and physically obstructs worker taps to the primary Tasks navigation tab.
- **Suggestion:** Disable the Next.js development overlay in review builds (`next.config.js` or production build mode).
- **Screenshot:** `DL-1-05.png`

---

### DL-1-06: API guide violates brand guidelines by using "bounty" throughout
- **Severity:** Medium
- **Type:** Visual / Brand fit
- **Where:** API Guide (`/docs/api`) on desktop and mobile
- **What you see:** The guide repeatedly uses the forbidden word "bounty" across multiple sections: *"Bounties"*, *"The bounty object"*, *"Create a bounty: POST /bounties"*, *"Cancel a bounty"*, and *"create_bounty"*.
- **Why it matters to the user:** `brand-intent.md` strictly dictates: *"Words used in the interface: 'Task' (not bounty)"*. Calling tasks "bounties" sounds like bug bounties or Wild West mercenaries rather than dignified human assistance.
- **Suggestion:** Rename all occurrences of "bounty" / "bounties" to "task" / "tasks" in documentation, endpoints, and code samples.
- **Screenshot:** `DL-1-06.png`

---

### DL-1-07: Payout PayPal email is truncated on phone viewports
- **Severity:** Medium
- **Type:** Visual / Layout
- **Where:** Worker Account settings (`/work/settings`) on phone 390px
- **What you see:** In the "Where we pay you" card, standard PayPal email addresses are cut off at the right edge of the input field (`sb-b63ke53532480@personal.examp...`).
- **Why it matters to the user:** Getting paid is the worker's sole objective. Being unable to see the complete email address creates anxiety about whether payments are going to the right account.
- **Suggestion:** Set input font sizing and text box padding so full 35-character email addresses fit comfortably, or show the full confirmed email address above the input.
- **Screenshot:** `DL-1-07.png`

---

### DL-1-08: Inconsistent pay amount placement and hierarchy on worker task cards
- **Severity:** Medium
- **Type:** Visual / Hierarchy
- **Where:** Worker task list (`/work`) on desktop and phone
- **What you see:** On cards with short titles, the pay amount (`$7.00`) is right-aligned on the first row. On cards with longer titles, the pay amount (`$25.00`) drops to a new line on the left. On desktop, the pay amount is visual subordinate to the title.
- **Why it matters to the user:** `brand-intent.md` states: *"The pay amount is the biggest thing on every worker task"*. The inconsistent placement slows down scanning, and the typography does not dominate the card as intended.
- **Suggestion:** Anchor the pay amount in a consistent prominent position (e.g. top-right or large left badge) with larger display sizing (`text-2xl` or `text-3xl` Geist Mono) so it immediately catches the worker's eye.
- **Screenshot:** `DL-1-08.png`

---

### DL-1-09: Sign-in credential note leads to a dead end
- **Severity:** Medium
- **Type:** Trust & clarity
- **Where:** Sign-in screen (`/sign-in`) on desktop and phone
- **What you see:** Underneath the sign-in form, helper text reads: *"Demo accounts for judges are listed in the project README."* However, the README currently states: *"Their sign-in details will be listed here for judges before submission."*
- **Why it matters to the user:** Judges or evaluators visiting the app cannot find the sign-in credentials from the referenced document, preventing them from exploring the demo.
- **Suggestion:** Add quick-fill demo account buttons or pill links on the sign-in page (*"Sign in as Demo Owner"*, *"Sign in as Demo Worker"*) so evaluators can test immediately without searching external files.
- **Screenshot:** `DL-1-09.png`

---

### DL-1-10: Incomplete accessibility labels and weak button contrast
- **Severity:** Low
- **Type:** Visual / Accessibility
- **Where:** Owner Overview (`/owner`) and Admin (`/admin`)
- **What you see:**
  1. On Owner Overview, the screen reader accessible name for the decision card reads `"2tasks need your decision"` because of a missing space between the dynamic count and the string.
  2. On Admin, the disabled `"Reset demo data"` button text is rendered in faint muted salmon (`#D88A84` / `#9E524E`), resulting in very low contrast against the card background.
  3. On Admin mobile, the confirmation checkbox floats awkwardly on its own line above the description text.
- **Why it matters to the user:** Degrades polish for assistive tech users and makes disabled administrative controls hard to read.
- **Suggestion:** Add a space in the template string (`${count} tasks`), increase disabled text contrast to meet WCAG AA, and align the checkbox inline with its label.
- **Screenshot:** `DL-1-10.png`
