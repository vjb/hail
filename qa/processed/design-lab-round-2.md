# Design Lab Report — Hail — Round 2

- **Date:** October 25, 2026
- **Screenshot folder reviewed:** Live site inspection + Round 2 verification screenshots (`DL-2-01.png` – `DL-2-08.png`)
- **Live URL tested:** `https://hail-g9h8.onrender.com` (tested exclusively on the live URL using **Jordan** for worker flows and **Dana** for owner flows; all claimed tasks were immediately returned)

---

## Summary

- **Overall visual score (10 scored screens):** Desktop **4.5** / Phone **4.1** (Light **4.3**, Dark on new screens **4.3**)
- **Change since last round (across the 9 previously scored screens):** **+0.5** overall (Desktop **4.1 → 4.5** `[+0.4]`, Phone **3.4 → 4.1** `[+0.7]`)
- **Release-note verification (`DL-1-01` – `DL-1-10`):** **6 Fixed**, **2 Partly fixed**, **2 Unchanged / By design** (0 Still failing completely)
- **Regressions called out explicitly:**
  - **Owner — task detail (`/owner/tasks/:id`):** **4.8 → 4.3 (`-0.5`)** — The newly added per-photo authenticity checks (`Photo code: not visible`, `Signs of generation or editing`) render as plain grey text bullets with no pass/fail icons or semantic colors, and tasks accepted on appeal still display a contradictory red `Not met` badge at the top right of the Proof card (`DL-2-02`).
  - **Owner — approvals (`/owner/approvals`):** **4.4 → 4.1 (`-0.3`)** — The new `"Report as not genuine"` action is styled as an unassuming text link with zero explanation or confirmation dialog warning the owner that clicking it immediately pauses the worker's entire account (`DL-2-04`).
- **Top 5 issues to fix first:**
  1. **DL-2-01 (Partly fixed `DL-1-07`):** On Worker Account (`/work/settings`), the connected PayPal email (`sb-b63ke53532480@personal.example.com`) uses `overflow-wrap: normal` and bursts past the right border of the card on `390px` phones (`378.8px` vs. `374px` card right edge) and causes horizontal page overflow (`379px` document width) and right-edge clipping on `360px` phones.
  2. **DL-2-02:** On Owner Task Detail (`/owner/tasks/:id`) and the Proof Certificate (`/proof/:token`), the new per-photo authenticity checks (`Photo code: not visible`, `Signs of generation or editing`, `Not a photo of a screen`) are rendered as neutral bullet points without pass/fail icons, status words, or semantic colors—violating `brand-intent.md` (*"Checked / Verified with an explanation next to every automated decision"*). Additionally, tasks accepted on appeal still show a red `Not met` badge in the `Proof` card header alongside the top `Paid` badge.
  3. **DL-2-04:** On Owner Approvals (`/owner/approvals`), the new third action `"Report as not genuine"` immediately pauses the worker's account upon click without any warning copy, tooltip, or confirmation step explaining that consequence.
  4. **DL-2-03:** On the new Proof Certificate (`/proof/:token`), the `"How this was checked"` card exposes raw internal model and prompt version identifiers (`(claude-sonnet-5-5, verify-v2)`), indents the `Photos` list ~20px inward relative to card headings, and provides no `"Copy link"` / `"Share"` button despite being a shareable certificate.
  5. **DL-2-05 (Minor residual on `DL-1-01`):** On Worker Task Detail (`/work/tasks/:id`) at `390×844`, the sticky `.claim-bar` is pinned at `bottom: 72px` while the bottom navigation bar is `65px` tall, leaving a `7px` transparent horizontal slit (`y=772..779`) where scrolling card text peeks through before reaching the bottom of the page.

- **Keep these (what works well):**
  - **One-tap "Try the demo" sign-in card (`/sign-in`):** Completely eliminates the Round 1 dead-end credential hunt (`DL-1-09`) with clear, full-width pill buttons for Dana and the demo workers, paired with an explicit PayPal sandbox disclosure.
  - **Fresh 2-minute photo code card (`/work/my-task`):** The anti-spoofing photo code (`XNK-449`) inside a dashed high-contrast ticket box with a live `2:00` countdown and plain-language explanation (*"A new code each time shows the photo was taken just now"*) is crystal clear in both light and dark modes (`DL-2-07`).
  - **Sticky claim bar & short-screen adaptation (`DL-1-01`):** Scrolled to the end on `360px` and `390px` phones, every checklist item clears comfortably above the opaque `.claim-bar`. On short viewports (`360×640`, landscape `844×390`, `1180×820`, and `200%` zoom `720×450`), the button switches cleanly to `position: static` and follows the content.
  - **Mobile table containment on Owner pages (`DL-1-03`):** Wide tables on `/owner/tasks`, `/owner/balance`, and `/owner/keys` now scroll horizontally inside their own card container (`docScrollWidth: 360px` on `360px` viewports), keeping the header balance and `Sign out` button permanently on screen (`DL-2-08`).
  - **Top-right dominant pay typography on worker task cards (`DL-1-08`):** Even on 4-line task titles (`"Inspect used espresso machine (Barista Express Espresso Machine)"`), the monospace pay amount (`$25.00`, `$75.00`) stays anchored top-right in the largest type on the card.

---

## Release Notes Round 2 — Verification Matrix

Each Round 1 finding (`DL-1-01` through `DL-1-10`) and new Round 2 feature was verified on the live URL (`https://hail-g9h8.onrender.com`) in the exact device or condition where it originally failed:

| Item | Original Failure Condition Tested | Verdict | What You See Now on Live Site |
|---|---|---|---|
| **DL-1-01** | Small phone (`360×640`), Standard phone (`390×844`), Tablet landscape (`1180×820`), Phone landscape (`844×390`), 200% Zoom (`720×450`) | **Fixed** *(minor 7px slit noted in `DL-2-05`)* | On `390×844`, `.claim-bar` has an opaque `#FAF8F3` background and top border; scrolled to the end, the entire `"What to do"` card (`bottom: 654.5px`) sits fully above `.claim-bar` (`top: 695px`). On short viewports (`360×640`, `844×390`, `720×450` at 200% zoom), `.claim-bar` switches to `position: static` and follows the content. *(Minor: at `390×844`, `bottom: 72px` on `.claim-bar` vs. `65px` bottom nav height leaves a `7px` gap between the two bars while mid-scroll; see `DL-2-05`.)* |
| **DL-1-02** | Standard phone (`390×844`) going `Offline` while on `/work` and `/work/my-task`, then back `Online` | **Partly fixed** *(see `DL-2-06`)* | Going offline while viewing a worker page now keeps you on the page, displays a violet status banner (*"You're offline. Your reservation and anything you've entered are kept here; we'll update when you're back online."*), pauses background polling so it no longer crashes into Chrome's dino page, and automatically clears the banner and refreshes when back online. **However**, if the user clicks a form submit button (e.g., `"Give this task back"` or `"Claim"`) while offline, the native HTML form navigation still hits `ERR_INTERNET_DISCONNECTED`. |
| **DL-1-03** | Small phone (`360×640`) & Standard phone (`390×844`) on `/owner/tasks`, `/owner/balance`, `/owner/keys` | **Fixed** *(minor scroll cue noted in `DL-2-08`)* | Document width matches the viewport exactly (`360px` on `360×640`, `390px` on `390×844`) across all three owner table screens. Wide tables (`563px` scrollWidth) scroll inside their own card wrapper (`overflow-x: auto`), and the header with `Available`, `Set aside`, and `Sign out` (`right: 302.2px`) stays completely on screen. |
| **DL-1-04** | `/owner/control-room` on Desktop (`1440×900`) & Phone (`390×844`) | **Unchanged by request** | Still displays *"The control room opens soon — Live numbers for money set aside, payouts, blocked attempts and more."* Per release notes, this is being built next. |
| **DL-1-05** | All pages on Small phone (`360×640`) & Standard phone (`390×844`), bottom-left corner | **Fixed** | No floating `"N"` Next.js Dev Tools badge appears anywhere on the live site; the `"Tasks"` bottom navigation tab is completely unobstructed. |
| **DL-1-06** | `/docs/api` vs. Worker/Owner UI screens | **By design** | Every worker, owner, and certificate screen uses `"task"` exclusively; `/docs/api` retains `"bounty"` (51 occurrences) per the developer API contract noted in the release notes. |
| **DL-1-07** | Worker account (`/work/settings`) on Small phone (`360×640`) & Standard phone (`390×844`) | **Partly fixed** *(see `DL-2-01`)* | The truncated `<input>` is replaced by plain text (`Connected: sb-b63ke53532480@personal.example.com`) and a green `"Verified PayPal account"` badge. **However**, the email element has `overflow-wrap: normal` and `word-break: normal`: after wrapping at the hyphen in `sb-`, the 34-character string `b63ke53532480@personal.example.com` (`345.8px` wide) bursts past the card's right border on `390px` (`378.8px` vs. `374px` card edge) and overflows the viewport on `360px` (`docScrollWidth: 379px`), clipping `.com`. |
| **DL-1-08** | Worker task list (`/work`) on Small phone (`360×640`), Standard phone (`390×844`), & Laptop (`1440×900`) | **Fixed** | On every task card—even with a 4-line title (*"Inspect used espresso machine (Barista Express Espresso Machine)"*)—the pay amount (`$25.00`, `$7.00`, `$75.00`) stays anchored at the top-right in large bold Geist Mono, clearly the largest type on the card. |
| **DL-1-09** | Sign-in (`/sign-in`) on Phone (`390×844`) & Laptop (`1440×900`) | **Fixed** | The dead-end *"Demo accounts for judges are listed in the project README"* text is gone, replaced by the `"Try the demo"` card with one-tap login buttons for `Agent owner: Dana` and workers (`Sam`, `Alex`, `Jordan`, `Riley`). |
| **DL-1-10** | Owner Overview (`/owner`) decision banner & disabled buttons across worker/owner flows | **Fixed** | The decision region's accessible name and heading now include the space (`"1 task needs your decision"` / `"2 tasks need your decision"`), and disabled buttons (e.g., `"Take every photo to submit"`) use a neutral dashed border with readable high-contrast text instead of washed-out salmon. |

---

## Part 1 — Screen Scores (Round 2)

*(Per Round 2 instructions, only the 10 specified screens that changed or were added are scored below at phone `390px` and laptop `1440px` in light theme, plus dark theme for the new Round 2 screens/features.)*

### 1. Sign in (`/sign-in`) — 1440 & 390 — Light & Dark *(updated with new "Try the demo" card)*
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | Primary email/password card leads cleanly, followed immediately by the self-explanatory "Try the demo" one-tap card. |
| Layout and spacing | 5 | Balanced centered cards (`max-w` container) on 1440px and full-width cards with comfortable 16px margins on 390px. |
| Typography | 5 | Crisp Bricolage Grotesque headings (`Sign in`, `Try the demo`) and legible button labels. |
| Color and contrast | 5 | Signal amber primary CTA (`Sign in`) contrasts with outlined secondary demo-account pills in both light and dark modes. |
| Consistency | 5 | Light (`#FAF8F3`) and dark (`#121417`) themes match each other seamlessly in border treatments and button radii. |
| Brand fit | 5 | Warm, plain, welcoming copy (*"One tap signs you in to a demo account. Everything runs in the PayPal sandbox; no real money moves."*). |
| Trust and clarity | 5 | Completely resolves Round 1's `DL-1-09` dead end; judges and testers can enter any role in one tap with clear sandbox reassurance. |
| Touch and accessibility | 5 | All five demo pill buttons and form inputs exceed 44px height with generous vertical spacing on 390px phone. |
| **Overall** | **5.0** | **Desktop: 5.0 / Phone: 5.0 (Light: 5.0, Dark: 5.0).** A textbook demo and authentication entry point. |

- **Issues:** None (`DL-1-09` fixed).
- **Previous round:** **3.8 → 5.0 (`+1.2`)**

---

### 2. Worker — tasks near you (`/work`) — 1440 & 390 — Light
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | Pay amount (`$25.00`, `$7.00`, `$75.00`) is anchored top-right in large bold Geist Mono and dominates every card regardless of title length (`DL-1-08` fixed). |
| Layout and spacing | 4 | Clean vertical card stack on both 1440px and 390px with consistent internal padding and pill wrap. |
| Typography | 5 | Excellent contrast between display-sized monospace pay figures, grotesque task titles, and metadata row (`2 photos · 1 note · 23h 39m left`). |
| Color and contrast | 5 | Green `"Pay set aside"` and neutral `"Safety screened"` badges pair icons with high-contrast text. |
| Consistency | 5 | Every card follows an identical two-column header grid (title left, pay top-right) even when titles wrap to 4 lines on 390px. |
| Brand fit | 5 | Directly fulfills `brand-intent.md`: *"The pay amount is the biggest thing on every worker task."* |
| Trust and clarity | 5 | Reassuring subhead and offline resilience banner (`"You're offline. Your reservation and anything you've entered are kept here..."`). |
| Touch and accessibility | 5 | Full-card tap targets work smoothly and the `"Tasks"` bottom nav tab is no longer blocked by the Next.js DevTools badge (`DL-1-05` fixed). |
| **Overall** | **4.9** | **Desktop: 4.9 / Phone: 4.9 (Light: 4.9).** Fast, scannable, outdoors-legible gig board where pay immediately commands attention. |

- **Issues:** None (`DL-1-05` and `DL-1-08` fixed).
- **Previous round:** **3.8 → 4.9 (`+1.1`)**

---

### 3. Worker — task detail before claiming (`/work/tasks/:id`) — 1440 & 390 — Light
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | Large `$75.00` pay figure, escrowed badge, `"Before you claim"` summary, and `"What to do"` checklist flow in a clear sequence toward the single amber claim CTA. |
| Layout and spacing | 4 | Scrolled to the bottom on 390px, all checklist items now sit fully above the opaque `.claim-bar` (`DL-1-01` fixed); minor `7px` gap remains between `.claim-bar` (`bottom: 72px`) and the `65px` bottom nav while mid-scroll (`DL-2-05`). |
| Typography | 5 | Clear typographic hierarchy between H1 title, `$75.00` monospace pay, H2 card headers, and H3 checklist subheaders. |
| Color and contrast | 5 | Opaque warm paper bar (`#FAF8F3`) behind the amber claim button prevents card text from bleeding through the button margins. |
| Consistency | 4 | Short viewports (`360×640`, landscape, 200% zoom) switch `.claim-bar` to `static` cleanly; standard phone `390×844` has a `7px` offset mismatch with bottom nav height. |
| Brand fit | 5 | Transparent about time commitment (`60 minutes`), what to capture, and exact acceptance criteria before the worker commits. |
| Trust and clarity | 5 | Every checklist item (`Serial number is legible — To capture`) is now 100% readable before tapping claim. |
| Touch and accessibility | 5 | Full-width `52px`-tall amber claim button sits comfortably above the bottom navigation bar without overlap. |
| **Overall** | **4.8** | **Desktop: 4.9 / Phone: 4.6 (Light: 4.8).** A massive improvement over Round 1; workers can read every requirement before claiming. |

- **Issues:** `DL-2-05` (minor 7px gap between sticky `.claim-bar` and bottom nav on `390×844` mid-scroll).
- **Previous round:** **2.8 → 4.8 (`+2.0`)**

---

### 4. Worker — my task (`/work/my-task`, taking a photo with the photo code) — 1440 & 390 — Light & Dark *(new photo code & 2-min timer)*
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | When taking a photo, the amber-tinted verification box highlights the large monospace code (`XNK-449`) and `2:00` countdown immediately. |
| Layout and spacing | 4 | Well-proportioned dashed code ticket inside the photo card on 390px and 1440px; on 1440px desktop, the fixed bottom nav remains pinned across the full viewport width. |
| Typography | 5 | Giant tracked-out Geist Mono code (`XNK-449`) is impossible to misread outdoors or when copying onto paper; countdown (`1:58 left`) is crisp. |
| Color and contrast | 5 | Warm amber tint in light mode (`#FFF6D6`) and deep olive-amber in dark mode (`#4A3F18`) with high-contrast dashed code container in both themes. |
| Consistency | 5 | Disabled `"Take every photo to submit"` button now uses neutral high-contrast styling (`DL-1-10` fixed); light and dark themes match cleanly. |
| Brand fit | 5 | Plain, warm explanation of *why* the code exists: *"A new code each time shows the photo was taken just now."* |
| Trust and clarity | 4 | Clear fallback button (`"Open my phone's camera"`) and `"Cancel"` link; minor: native form submit (`"Give this task back"`) while offline hits the browser offline page (`DL-2-06`). |
| Touch and accessibility | 5 | Large `"Take photo"` / `"Open my phone's camera"` buttons and live polite ARIA status (`"Opening the camera…"`). |
| **Overall** | **4.8** | **Desktop: 4.8 / Phone: 4.8 (Light: 4.8, Dark: 4.8).** The new photo-code flow feels purposeful, human-friendly, and effortless to read on a phone screen. |

- **Issues:** `DL-2-06` (native form submission while offline).
- **Previous round:** **4.1 → 4.8 (`+0.7`)**

---

### 5. Worker — account (`/work/settings`) — 1440 & 390 — Light & Dark *(new connected PayPal account & verified badge)*
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | Clear `"Where we pay you"` card showing the connected PayPal email, `"Verified PayPal account"` badge, `"Connect a different PayPal account"`, and `"Sign out"`. |
| Layout and spacing | 2 | On `390px` phone, `b63ke53532480@personal.example.com` overflows past the right border of the card (`378.8px` vs. `374px`); on `360px` phone, it forces horizontal page scroll (`379px`) and clips `.com` (`DL-2-01`). |
| Typography | 3 | Bold email text is legible on 1440px desktop, but lacks `overflow-wrap: anywhere` / `word-break: break-all` for long unbroken email handles on mobile. |
| Color and contrast | 5 | Green `"Verified PayPal account"` pill with checkmark icon and dark/light button outlines have crisp contrast. |
| Consistency | 4 | Matches light and dark card tokens well; worker `Sign out` remains on this sub-page rather than in the header. |
| Brand fit | 4 | Reassuring copy (*"Hail pays approved work straight to your PayPal account. No bank details needed."*) and verified badge build confidence. |
| Trust and clarity | 4 | Seeing the full connected address with a `"Verified PayPal account"` badge is much clearer than Round 1's truncated input, except for the mobile right-edge overflow. |
| Touch and accessibility | 4 | Full-width `"Connect a different PayPal account"` and `"Sign out"` buttons have comfortable >44px touch targets. |
| **Overall** | **3.8** | **Desktop: 4.6 / Phone: 3.4 (Light: 3.8, Dark: 3.8).** Great verified-PayPal upgrade on desktop, held back on phone by a missing CSS word-wrap rule on long email addresses. |

- **Issues:** `DL-2-01` (connected PayPal email overflows card border on 390px and clips off-screen on 360px).
- **Previous round:** **3.6 → 3.8 (`+0.2`)**

---

### 6. Owner — overview (`/owner`) — 1440 & 390 — Light
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | Dual balance (`Available $419.00` / `Set aside $123.00`) and the violet `"1 task needs your decision"` card immediately orient the owner. |
| Layout and spacing | 4 | Clean sidebar + main column on 1440px; responsive stacked nav pills, banner, and cards on 390px with zero horizontal overflow (`docScrollWidth: 390px`). |
| Typography | 5 | Large Geist Mono balance amounts and clean task list timestamps/statuses. |
| Color and contrast | 5 | Semantic status badges (`Claimed` in amber, `Cancelled` in grey, `Blocked` in red) pair icons with text labels. |
| Consistency | 5 | Accessible region label and heading spacing bug (`"2tasks"` in Round 1) is fixed (`"1 task needs your decision"`, `DL-1-10`). |
| Brand fit | 5 | Calm, trustworthy, and precise about money. |
| Trust and clarity | 5 | Explains clearly what `Available` and `Set aside` mean and why pending approvals matter. |
| Touch and accessibility | 4 | Mobile nav pills, `Add funds`, and `Open approvals` buttons have generous tap targets. |
| **Overall** | **4.8** | **Desktop: 4.9 / Phone: 4.6 (Light: 4.8).** Polished, trustworthy command center on both desktop and phone. |

- **Issues:** None (`DL-1-10` fixed).
- **Previous round:** **3.9 → 4.8 (`+0.9`)**

---

### 7. Owner — tasks (`/owner/tasks`) — 1440 & 390 — Light
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | Newest-first ledger of agent tasks with status pills, kind, pay, and timestamp. |
| Layout and spacing | 4 | Page-level mobile blow-out (`DL-1-03`) is fixed: the table now scrolls inside its own card (`docScrollWidth: 360px`/`390px`), keeping the header and `Sign out` on screen. |
| Typography | 4 | Crisp on 1440px; on 390px, task titles wrap to 3–4 lines inside the first column while `Kind` (`Item inspectio...`) clips at the card's right inner edge until scrolled (`DL-2-08`). |
| Color and contrast | 5 | Semantic status pills (`Claimed`, `Open`, `Blocked`, `Cancelled`, `Screening`, `Paid`) all pair icons with clear labels. |
| Consistency | 4 | Consistent with `/owner/balance` and `/owner/keys` horizontal card-scroll pattern. |
| Brand fit | 4 | Straightforward audit list for business owners. |
| Trust and clarity | 4 | Every automated block or cancellation shows its category (`One-time code request`, `Identity misuse`, `Targeting a private person`). |
| Touch and accessibility | 3 | On 390px, `Pay` and `Posted` require horizontal swiping inside the table card with no visible scrollbar or right-edge fade hint (`DL-2-08`). |
| **Overall** | **4.0** | **Desktop: 4.5 / Phone: 3.6 (Light: 4.0).** Mobile page layout no longer breaks (`DL-1-03` fixed), though inner-card horizontal scrolling hides `Pay` off-screen until swiped. |

- **Issues:** `DL-2-08` (inner table scroll on mobile clips `Kind` text without a scroll indicator and hides `Pay` until swiped).
- **Previous round:** **3.3 → 4.0 (`+0.7`)**

---

### 8. Owner — task detail with history (`/owner/tasks/:id`) — 1440 & 390 — Light *(updated with per-photo proof checks & proof certificate link)*
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | Task title, `$25.00` pay, `Proof` card, `What the worker is asked to do`, and `Safety screen / History` are well organized, but per-photo checks blend into body text. |
| Layout and spacing | 4 | Full-width `Proof` card above a two-column bottom grid on 1440px; clean vertical stack on 390px. |
| Typography | 4 | Checklist findings (`Passed`, `Not met`) are bold and clear, whereas the 4 per-photo authenticity checks under each photo are small muted bullets. |
| Color and contrast | 3 | Per-photo checks (`Photo code: not visible`, `Signs of generation or editing` vs. `Photo code: matches`, `Not a photo of a screen`) have zero color or icon distinction (`DL-2-02`). |
| Consistency | 3 | Checklist criteria use semantic icons (`✓ Passed`, `✕ Not met`), while photo authenticity checks right above them use plain `•` bullets; also the `Proof` card header still says `Not met` on a task whose appeal was `accepted` and `Paid` (`DL-2-02`). |
| Brand fit | 4 | Violations of `brand-intent.md` (*"Statuses should always show a word (and ideally an icon)"*) on the per-photo checks reduce the otherwise strong transparency. |
| Trust and clarity | 4 | Detailed `Doubts` paragraph, `Appeal` record, and `"Open the proof certificate"` link provide deep auditability, though the `Not met` card badge contradicts `Paid` status. |
| Touch and accessibility | 4 | Photo links, certificate link, and disclosure triangle (`How it was checked`) are easy to tap on 390px. |
| **Overall** | **3.8** | **Desktop: 4.0 / Phone: 3.6 (Light: 3.8).** **Regression (`-1.0` from 4.8):** rich new verification data is undermined by unstyled per-photo check bullets and a contradictory `Not met` badge after an accepted appeal. |

- **Issues:** `DL-2-02` (per-photo checks lack pass/fail icons or styling; `Proof` card header retains `Not met` badge on accepted/paid appeal).
- **Previous round:** **4.8 → 3.8 (`-1.0` regression)**

---

### 9. Owner — approvals (`/owner/approvals`) — 1440 & 390 — Light & Dark *(updated with "Report as not genuine")*
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | Violet review card highlights the task title, `$15.00` pay, side-by-side proof photos, AI summary, and checklist items (`Frame visible — Passed`, `Both tires visible — Unclear`). |
| Layout and spacing | 4 | Side-by-side photos and inline button row on 1440px; stacked full-width photos and vertical action stack on 390px. |
| Typography | 4 | Clear distinction between `Passed` and `Unclear` criteria and helper text. |
| Color and contrast | 4 | Amber `Accept and pay` button, red-outlined `Reject proof` button, and plain underlined `Report as not genuine` link work in both light and dark modes. |
| Consistency | 4 | Light and dark themes are visually consistent; however, `Report as not genuine` looks like a navigation link rather than a destructive account-suspension action. |
| Brand fit | 4 | Plain, human-in-the-loop review flow, but lacks Hail's usual transparency around high-stakes actions. |
| Trust and clarity | 2 | Clicking `"Report as not genuine"` immediately pauses the worker's account, yet the UI provides **no warning copy or confirmation dialog** explaining this severe consequence (`DL-2-04`). |
| Touch and accessibility | 4 | On 390px, `Report as not genuine` sits close below `Reject proof` as an unpadded text link. |
| **Overall** | **3.8** | **Desktop: 3.9 / Phone: 3.8 (Light: 3.8, Dark: 3.8).** **Regression (`-0.6` from 4.4):** adding an unwarned one-click account suspension link (`Report as not genuine`) creates a high-risk trust & clarity trap. |

- **Issues:** `DL-2-04` (`"Report as not genuine"` pauses the worker's account with zero warning or confirmation in the UI).
- **Previous round:** **4.4 → 3.8 (`-0.6` regression)**

---

### 10. Proof certificate (`/proof/:token`) — 1440 & 390 — Light & Dark *(new screen in Round 2)*
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 4 | Clear `PROOF CERTIFICATE` eyebrow, task title, task ID/timestamps, acceptance summary card, `Checklist`, `Photos` (SHA-256 fingerprints), and `How this was checked`. |
| Layout and spacing | 4 | Clean single-column document layout on 1440px and 390px; minor: inside `Photos`, the photo sub-blocks are indented ~20px inward due to default list padding (`DL-2-03`). |
| Typography | 4 | Monospace `SHA-256` hashes wrap cleanly inside 390px cards without horizontal overflow; timestamps and checklist explanations are easy to read. |
| Color and contrast | 4 | `Checklist` items use green `✓ Passed` and red `✕ Not met` icons in both light and dark modes, but the 5 per-photo checks under `Photos` use uniform neutral hollow bullets (`◦`) (`DL-2-02`). |
| Consistency | 3 | Inconsistent status treatment between the `Checklist` card (icon + color + bold status word) and the `Photos` card right below it (plain `◦ Photo code not visible`, `◦ Signs of generation or editing`). |
| Brand fit | 4 | Candid, trustworthy tone (*"No photo is impossible to fake. These checks make faking cost more than the task pays..."*), marred slightly by exposing raw model ID `(claude-sonnet-5-5, verify-v2)` (`DL-2-03`). |
| Trust and clarity | 4 | Cryptographic SHA-256 fingerprints and exact capture timing (`50 s after its photo code appeared`) build strong audit trust, though a shareable certificate needs a `"Copy link"` button (`DL-2-03`). |
| Touch and accessibility | 4 | Clean mobile reading flow with zero horizontal overflow (`docScrollWidth: 390px`); lacks a `"Back to task"` link or `"Copy shareable link"` button. |
| **Overall** | **3.9** | **Desktop: 4.0 / Phone: 3.9 (Light: 3.9, Dark: 3.9).** A compelling, privacy-preserving verification record that needs pass/fail badges on photo checks and a copy-link action. |

- **Issues:** `DL-2-02` (per-photo checks lack pass/fail visual distinction), `DL-2-03` (exposes raw `(claude-sonnet-5-5, verify-v2)` identifier, indents `Photos` list items relative to heading, and lacks a copy-link/share button).
- **Previous round:** **New screen → 3.9**

---

### Overall Round 2 Rollup & Cross-Screen Consistency

- **Average across scored screens:**
  - **Desktop (1440px):** **4.5** (up from **4.1** in Round 1 across the 9 comparable screens)
  - **Phone (390px):** **4.1** (up from **3.4** in Round 1 across the 9 comparable screens)
  - **Light theme:** **4.3** | **Dark theme (on new/updated screens):** **4.3**
- **The three weakest screens in Round 2:**
  1. **Worker — account (`/work/settings`) — 3.8** (Phone **3.4** due to connected PayPal email overflowing the card border on 390px and clipping off-screen on 360px, `DL-2-01`)
  2. **Owner — task detail with history (`/owner/tasks/:id`) — 3.8** (unformatted per-photo authenticity check bullets and contradictory `Not met` badge on accepted appeals, `DL-2-02`)
  3. **Owner — approvals (`/owner/approvals`) — 3.8** (unwarned one-click worker account suspension via `"Report as not genuine"`, `DL-2-04`)
- **The three biggest cross-screen consistency issues:**
  1. **Checklist Criteria vs. Per-Photo Authenticity Checks (`DL-2-02`):** Across Owner Task Detail (`/owner/tasks/:id`) and the Proof Certificate (`/proof/:token`), task checklist criteria always show a semantic icon, color, and bold status word (`✓ Passed`, `✕ Not met`, `? Unclear`), whereas the new per-photo authenticity checks (`Photo code: not visible`, `Signs of generation or editing`, `Photo code: matches`) render as plain unstyled list bullets (`•` or `◦`) with no visual distinction between pass and fail.
  2. **Destructive Action Affordances (`DL-2-04`):** Elsewhere in Hail, high-impact actions explain their consequences in plain text above or beside the control (e.g., `"Declining returns it to your available balance"`, `"Claiming reserves it for you for 60 minutes"`). On `/owner/approvals`, `"Report as not genuine"` looks like a harmless secondary link and never mentions that it pauses the worker's account.
  3. **Mobile Table Card Scrolling vs. Native Mobile Cards (`DL-2-08`):** While wrapping wide desktop tables in `overflow-x: auto` containers (`DL-1-03`) solved the page-level layout blowout on 360px–390px phones, Owner Overview (`/owner`) uses a clean mobile-friendly stacked row layout showing Task, Date, Status, and Pay all at once, whereas Owner Tasks (`/owner/tasks`) forces mobile users to swipe horizontally inside a card just to see a task's `Pay` and `Posted` date.

---

## Part 2 — Targeted Device & Condition Verification

*(Per Round 2 instructions, the full device matrix and Part 3 health audit were skipped; only the specific devices and conditions where Round 1 items failed were tested.)*

| Config / Condition | Result | Finding IDs | Notes |
|---|---|---|---|
| **Small phone (`360×640`, touch)** | **Works with issues** | `DL-2-01` | `DL-1-01` (claim bar), `DL-1-03` (owner tables `docScrollWidth: 360px`), `DL-1-05` (no N badge), and `DL-1-08` (top-right pay) all pass cleanly. **Fails on `/work/settings` (`DL-2-01`):** long PayPal email overflows card to `379px` and clips off-screen. |
| **Standard phone (`390×844`, touch)** | **Works with issues** | `DL-2-01`, `DL-2-05`, `DL-2-08` | `DL-1-01` clears all checklist items when scrolled to end (minor `7px` slit mid-scroll, `DL-2-05`); `DL-1-03` fits `390px` with no page overflow; `/work/settings` PayPal email crosses right card border (`378.8px` vs. `374px`, `DL-2-01`). |
| **Tablet landscape (`1180×820`, touch)** | **Works** | — | `DL-1-01` verified fixed: `.claim-bar` has opaque background and all checklist items sit cleanly above the bar. |
| **Phone landscape (`844×390`, touch)** | **Works** | — | `DL-1-01` verified fixed: `.claim-bar` switches to `position: static` and follows the content instead of floating over instructions. |
| **Zoom 200% (`720×450` effective viewport)** | **Works** | — | `DL-1-01` verified fixed: `.claim-bar` switches to `position: static` on short viewport height so nothing is occluded. |
| **Offline mode (`390×844`, Offline → Online)** | **Works with issues** | `DL-2-06` | `DL-1-02` verified fixed for passive viewing/polling: displays `"You're offline..."` violet banner and stays on the page without crashing to the dino screen, then updates when back online. Submitting a native HTML form while offline still triggers `ERR_INTERNET_DISCONNECTED` (`DL-2-06`). |

---

## Findings

### DL-2-01: Connected PayPal email overflows card border on 390px phone and clips off-screen on 360px phone (incomplete fix for `DL-1-07`)
- **Severity:** High
- **Type:** Layout / Device
- **Where:** Worker Account (`/work/settings`) on Small phone (`360×640`) and Standard phone (`390×844`), Light & Dark themes
- **What you see:** The `"Where we pay you"` card now displays `Connected: sb-b63ke53532480@personal.example.com` as text above the `"Verified PayPal account"` badge. However, the email element has `overflow-wrap: normal` and `word-break: normal`. After breaking at the hyphen in `sb-`, the 34-character string `b63ke53532480@personal.example.com` (`345.8px` wide) refuses to wrap:
  - On **390px phone**, the text extends to `x = 378.8px`, crossing right through the card's right border (`x = 374px`).
  - On **360px small phone**, the text extends `34.8px` past the card's right border (`x = 344px`), forcing horizontal page scroll (`document.documentElement.scrollWidth = 379px` on a `360px` viewport) and clipping `.com` off the right edge of the screen.
- **Why it matters to the user:** Workers checking where their money is sent on a `360px`–`390px` phone see their PayPal address jutting out of the card or cut off at the screen edge, undermining visual polish and payout reassurance.
- **Suggestion:** Add `overflow-wrap: anywhere` (or `word-break: break-all`) to the connected email address element so long email addresses wrap cleanly inside the card padding at any mobile width.
- **Screenshot:** `DL-2-01.png`

---

### DL-2-02: Per-photo authenticity checks lack pass/fail icons or semantic styling, and accepted appeals retain a `Not met` card badge
- **Severity:** High
- **Type:** Visual / Consistency / Trust & clarity
- **Where:** Owner Task Detail (`/owner/tasks/:id`, e.g., `bty_izU2yrabE7blhlhI`) and Proof Certificate (`/proof/:token`) on Desktop (`1440px`) and Phone (`390px`)
- **What you see:**
  1. Under each proof photo on Owner Task Detail (and in the `Photos` section of the Proof Certificate), the new per-photo checks—such as `Photo code: not visible`, `Signs of generation or editing`, `Photo code: matches`, `Not a photo of a screen`, and `Taken with the phone's camera app`—are rendered as plain, uniform grey/neutral bullet points (`•` or `◦`) with no icons, no status words (`Passed` / `Flagged`), and no color differentiation.
  2. On `/owner/tasks/bty_izU2yrabE7blhlhI`, even though the worker's appeal was accepted (`Appeal — Decision: accepted`) and the payout was delivered (`Paid` green pill at top of page, `Payout $25.00 to the worker's PayPal: delivered`), the top-right header of the `Proof` card still displays a red outlined `Not met` badge.
- **Why it matters to the user:** `brand-intent.md` requires *"Statuses should always show a word (and ideally an icon)"* and *"Checked / Verified with an explanation next to every automated decision."* Rendering critical red flags like `"Signs of generation or editing"` and `"Photo code: not visible"` identically to passing checks (`"Not a photo of a screen"`) makes it easy for an owner or auditor to miss spoofing signals during review. Meanwhile, showing `Paid` and `Not met` simultaneously on an accepted appeal is contradictory.
- **Suggestion:** Pair each per-photo authenticity check with the same semantic icon + status treatment used in the Checklist (`✓` green for passing checks like `Photo code: matches` and `Not a photo of a screen`; `✕` red or `!` amber/violet for `Photo code: not visible` and `Signs of generation or editing`), and update the `Proof` card header badge to `Accepted on appeal` (or `Approved`) when an appeal is accepted.
- **Screenshot:** `DL-2-02.png`

---

### DL-2-03: Proof certificate exposes raw internal model/prompt identifiers, indents photo items inconsistently, and lacks a copy-link button
- **Severity:** Medium
- **Type:** Exposure / Visual / Usability
- **Where:** Proof Certificate (`/proof/:token`) on Desktop (`1440px`) and Phone (`390px`), Light & Dark themes
- **What you see:**
  1. In the `"How this was checked"` card, the second bullet reads: *"An AI verifier (claude-sonnet-5-5, verify-v2) checked every checklist item..."*—exposing internal model and prompt version strings in a public user-facing document.
  2. In the `"Photos"` card, the list of photos (`Serial number plate, readable`, `SHA-256 ...`) is rendered inside a `<ul>` that retains browser default left padding (~20px), indenting the photo titles and hashes relative to the card heading and intro paragraph.
  3. Although the certificate is designed to be a *"shareable proof certificate"*, there is no `"Copy link"` or `"Share certificate"` button on the page, nor a back link to the owner task detail page.
- **Why it matters to the user:** Raw internal prompt tags like `verify-v2` feel like developer debug output rather than Hail's plain, warm voice, and the lack of a one-tap `"Copy link"` button forces users to manually copy a long token URL from the browser address bar.
- **Suggestion:** Remove or humanize `(claude-sonnet-5-5, verify-v2)` in the user-facing prose, reset `padding-left: 0; list-style: none` on the outer `Photos` list so photo headings align flush left with card headings, and add a `"Copy certificate link"` button in the header.
- **Screenshot:** `DL-2-03.png`

---

### DL-2-04: "Report as not genuine" on Owner Approvals pauses the worker's account with zero warning or confirmation
- **Severity:** High
- **Type:** Trust & clarity / UX safety
- **Where:** Owner Approvals (`/owner/approvals`) on Desktop (`1440px`) and Phone (`390px`), Light & Dark themes
- **What you see:** Below `[Accept and pay]` and `[Reject proof]`, the new third action `Report as not genuine` is rendered as a plain underlined text link. There is no helper text explaining how `Report as not genuine` differs from `Reject proof`, and clicking it immediately submits the form and pauses the worker's account without any confirmation dialog or warning.
- **Why it matters to the user:** Suspending a worker's account is a severe, high-consequence action. An owner who simply thinks a photo looks blurry or questionable could click `Report as not genuine` thinking it is a standard rejection reason, unintentionally freezing the worker's ability to work on Hail.
- **Suggestion:** Add explicit helper copy or a confirmation step when `Report as not genuine` is tapped (e.g., *"Reporting proof as not genuine rejects the payout and pauses this worker's account until they appeal. Confirm?"*), and style the trigger as a distinct danger/outline control rather than a bare text link.
- **Screenshot:** `DL-2-04.png`

---

### DL-2-05: 7px transparent gap between sticky `.claim-bar` and bottom navigation on 390px phone mid-scroll (minor residual on `DL-1-01`)
- **Severity:** Low
- **Type:** Layout
- **Where:** Worker Task Detail (`/work/tasks/:id`) on Standard phone (`390×844`) before scrolling to the bottom
- **What you see:** While `DL-1-01` is functionally fixed (all checklist items scroll completely above the opaque `.claim-bar` at the bottom of the page, and short viewports switch to `static`), on a `390×844` viewport `.claim-bar` is positioned at `bottom: 72px` (`y = 695px..772px`) while the fixed bottom navigation bar is `65px` tall (`y = 779px..844px`). This leaves a `7px` transparent horizontal strip between the bottom of `.claim-bar` and the top of the bottom nav where underlying card text (`[camera] Keys`) peeks through while scrolling.
- **Why it matters to the user:** Creates a small visual flicker of sliced text between the two bars while scrolling down the task page.
- **Suggestion:** Set `.claim-bar` to `bottom: 65px` (matching the exact height of the bottom navigation bar) or extend its bottom padding by `7px` so it meets the top border of the bottom navigation bar flush.
- **Screenshot:** `DL-2-05.png`

---

### DL-2-06: Passive offline banner works cleanly (`DL-1-02` fixed for polling), but submitting a form while offline still triggers browser `ERR_INTERNET_DISCONNECTED`
- **Severity:** Low
- **Type:** Device / Network
- **Where:** Worker pages (`/work`, `/work/my-task`) on Standard phone (`390×844`) when `Offline`
- **What you see:** When the device goes offline while viewing `/work` or `/work/my-task`, background polling now pauses gracefully and a reassuring violet banner appears at the top of the screen: *"You're offline. Your reservation and anything you've entered are kept here; we'll update when you're back online."* Restoring the connection clears the banner and updates the page (`DL-1-02` fixed for passive offline state). However, if the worker taps a native HTML `<form>` action button (such as `"Give this task back"` or `"Claim"`) while offline, the unguarded POST request still triggers a full-page browser navigation to Chrome's `ERR_INTERNET_DISCONNECTED` dino screen.
- **Why it matters to the user:** If a worker in a dead zone taps a form button before noticing the offline banner, they still get dumped to the browser error page.
- **Suggestion:** Disable form submit buttons while `navigator.onLine === false` (or intercept `submit` events when offline and focus the `"You're offline..."` banner).
- **Screenshot:** `DL-2-06.png`

---

### DL-2-07: New 2-minute photo code card on Worker My Task is clear and effective, with a minor stuck spinner when camera permission is unavailable
- **Severity:** Low
- **Type:** Visual / UX feedback
- **Where:** Worker My Task (`/work/my-task`) when tapping `"Take photo"` on Phone (`390px`) and Desktop (`1440px`), Light & Dark themes
- **What you see:** Tapping `"Take photo"` reveals an amber-tinted verification card displaying the 6-character code (`XNK-449`), a `2:00` countdown, an `"Opening the camera…"` spinner, and a prominent `"Open my phone's camera"` fallback button. On devices/contexts where in-page `getUserMedia` camera streaming is unavailable or blocked, the `"Opening the camera…"` spinner continues spinning indefinitely above the `"Open my phone's camera"` button until the 2-minute code timer expires.
- **Why it matters to the user:** While the photo code itself is outstandingly legible and the fallback button works, a perpetually spinning `"Opening the camera…"` indicator makes the page look like it is still waiting on hardware even when the user should immediately tap `"Open my phone's camera"`.
- **Suggestion:** When `navigator.mediaDevices.getUserMedia` rejects or times out after ~2 seconds, hide the `"Opening the camera…"` spinner and show a static prompt (`"Use the button below to take the photo with your phone's camera"`).
- **Screenshot:** `DL-2-07.png`

---

### DL-2-08: Scrollable mobile tables on Owner pages (`DL-1-03` fix) clip right-hand columns without a horizontal scroll affordance
- **Severity:** Low
- **Type:** Layout / Touch usability
- **Where:** Owner Tasks (`/owner/tasks`), Balance (`/owner/balance`), and API Keys (`/owner/keys`) on Small phone (`360px`) and Standard phone (`390px`)
- **What you see:** Wrapping wide tables in an `overflow-x: auto` card container completely fixed the Round 1 page-level layout blowout (`DL-1-03`): the page width stays locked at `360px`/`390px` and `Sign out` stays visible. Inside the `/owner/tasks` card at `390px`, however, only `Task`, `Status`, and a truncated `Kind` column (`"Item inspectio"`) are visible initially; `Pay` (`$25.00`) and `Posted` are hidden off the right edge of the card with no visible scrollbar or right-edge gradient hint on mobile touch screens.
- **Why it matters to the user:** On mobile touch devices where scrollbars are hidden by default, owners may not realize they can swipe horizontally inside the table card to see task pay amounts or revoke API keys.
- **Suggestion:** Add a subtle right-edge scroll shadow/fade on horizontally scrollable table wrappers on mobile, or collapse `Kind` and `Posted` below the task title on `<640px` viewports (matching the compact row layout already used on `/owner` Overview).
- **Screenshot:** `DL-2-08.png`
