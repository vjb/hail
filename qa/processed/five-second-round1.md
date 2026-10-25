# Five-Second Test — Round 1: Scoring & Diagnostic Report

**Test Setup:** One blind run was conducted for this round (`blind/FIVE_SECOND_ANSWERS.md`). The viewer evaluated only the four screenshots (`screenshot-1.png` to `screenshot-4.png`) using the strict five-second prompt in `blind/go.md` with zero prior knowledge of Hail or access to project files.

* **Screenshot 1:** Owner's first screen, desktop (1440 px)
* **Screenshot 2:** Worker's first screen, phone (390 px)
* **Screenshot 3:** Owner's first screen, phone
* **Screenshot 4:** Worker's first screen, desktop

*(Note on test data: As noted in `go.md`, the live site's owner account is shared with other testers, which populated Screenshot 1 with repeated `$1.00` test tasks and a `"6 tasks need your decision"` approval banner, plus `"Dana (demo owner)"`. Where this shared test data hurt the viewer's trust impression, it is noted below without penalizing the app's core design score.)*

---

## 1. Blind Run Answers (Verbatim)

*(One blind run conducted in `blind/FIVE_SECOND_ANSWERS.md`)*

> **Screenshot 1**
> 1. What is this app for, in one sentence?
> It is a dashboard for funding a balance and approving or paying out small local photography and inspection tasks.
> 2. Who is this particular screen for?
> An "agent owner" or account manager (labeled "Dana (demo owner)") who funds and reviews tasks.
> 3. What is the one thing this screen wants you to do?
> Either click "Add funds" or click "Open approvals" to review the "6 tasks need your decision" banner (the two identically styled bright yellow buttons compete directly for the primary action).
> 4. What did your eye land on first (and second)?
> First on the large `$406.00` and `$128.00` balance numbers in the center card, and second on the two bright yellow pill buttons ("Add funds" and "Open approvals") along with the purple-bordered "6 tasks need your decision" callout.
> 5. Anything confusing, worrying, gimmicky, or buried in small print at a glance?
> The actual explanation of what the platform does ("Your agents post tasks; Hail screens them, sets the pay aside, and pays the person who does the work") is low-contrast, small gray subtitle text under "Overview" that is easily skipped in five seconds; also, having two identical primary yellow CTAs ("Add funds" and "Open approvals") splits focus, and the logo `h[ai]l` looks like a gimmicky AI badge.
> 6. Would you trust this app with your money or your time? Yes / No / Unsure. Name the exact visual element (or missing signal) that made you feel that way.
> Unsure. The clean layout and explicit "Available" vs. "Set aside" dollar figures feel structured, but "(demo owner)" in the header, `$1.00` repetitive tasks ("Check how busy Oakhaven Town Square is..."), and the lack of any banking/payment security indicators around "Add funds" make it feel like a prototype rather than a financial platform ready for real money.
>
> **Screenshot 2**
> 1. What is this app for, in one sentence?
> It is a local gig board where people claim nearby photo and inspection errands for cash payouts.
> 2. Who is this particular screen for?
> Local gig workers or earners on a mobile phone looking for quick nearby tasks to complete.
> 3. What is the one thing this screen wants you to do?
> Tap one of the three task cards ("Inspect used espresso machine", "Photograph a storefront", or "Inspect a used piano") to claim it, though none of the cards have an explicit button or affordance showing they are clickable.
> 4. What did your eye land on first (and second)?
> First on the bold heading "Tasks near you" paired with the large `$25.00` price tag on the first card, and second on the `$75.00` and `$7.00` payouts and green "Pay set aside" badges below it.
> 5. Anything confusing, worrying, gimmicky, or buried in small print at a glance?
> There is no visible "Claim" or "View" button on any task card, so it is unclear how to act on a task; the address "742 Evergreen Terrace, Suite B, Springfield" (the Simpsons' address) immediately reads as fake/placeholder data; and "PAID THROUGH PAYPAL" is tucked into a small all-caps eyebrow line rather than a recognizable payment trust badge.
> 6. Would you trust this app with your money or your time? Yes / No / Unsure. Name the exact visual element (or missing signal) that made you feel that way.
> Unsure. The green "Pay set aside" and "Safety screened" badges attempt to build trust, but the fictional address ("742 Evergreen Terrace, Suite B, Springfield"), lack of a map or distance indicator for "Tasks near you", and missing interactive buttons make me hesitate to invest time traveling to a location.
>
> **Screenshot 3**
> 1. What is this app for, in one sentence?
> It is an account balance and task-management dashboard for an "agent owner" who funds tasks and pays workers.
> 2. Who is this particular screen for?
> An "agent owner" ("Dana (demo owner)") viewing their account balance and navigation menu on a mobile screen.
> 3. What is the one thing this screen wants you to do?
> Tap the bright yellow "Add funds" button next to the Balance heading.
> 4. What did your eye land on first (and second)?
> First on the large `$406.00` and `$128.00` dollar figures, and second on the bright yellow "Add funds" button and the top navigation grid ("Overview", "Tasks", "Approvals", "Balance", "API keys", "Policy", "Control room").
> 5. Anything confusing, worrying, gimmicky, or buried in small print at a glance?
> Over half the mobile viewport is consumed by an always-expanded multi-row navigation menu and a duplicate balance summary (`$406.00` / `$128.00` appears in the top header and immediately again in the Balance card below), pushing the actual tasks and approvals completely off the bottom of the screen (where the bottom line "Reserved for open tasks. Paid to" is cut off mid-sentence).
> 6. Would you trust this app with your money or your time? Yes / No / Unsure. Name the exact visual element (or missing signal) that made you feel that way.
> No. Seeing the exact same `$406.00` and `$128.00` numbers repeated twice within a few inches on a cramped mobile layout, combined with "Dana (demo owner)" and no visible payment processor or security context next to a prominent "Add funds" button, makes the interface feel unpolished and untrustworthy for depositing money.
>
> **Screenshot 4**
> 1. What is this app for, in one sentence?
> It is a web board listing local inspection and photography errands that pay fixed dollar amounts.
> 2. Who is this particular screen for?
> Local earners browsing available in-person tasks on a desktop or laptop screen.
> 3. What is the one thing this screen wants you to do?
> Click on one of the three listed task cards to claim a job, although there is no visible button, link, or hover affordance on the cards.
> 4. What did your eye land on first (and second)?
> First on the bold "Tasks near you" headline and the `$25.00`, `$7.00`, and `$75.00` prices aligned down the right side of the narrow center column, and second on the vast empty off-white whitespace surrounding the narrow column and the tiny bottom tab bar ("Tasks", "My task", "Earnings").
> 5. Anything confusing, worrying, gimmicky, or buried in small print at a glance?
> The desktop layout looks like a narrow mobile view dropped into the middle of a huge blank canvas with a mobile bottom navigation bar ("Tasks", "My task", "Earnings") stretched across the bottom of a desktop monitor, no location selector or map showing what "near you" means, and no visible action buttons on the cards.
> 6. Would you trust this app with your money or your time? Yes / No / Unsure. Name the exact visual element (or missing signal) that made you feel that way.
> Unsure. While the green "Pay set aside" badge and clear dollar amounts (`$25.00`, `$7.00`, `$75.00`) are easy to scan, the mobile-style bottom tab bar on a desktop screen, lack of any clickable CTA button on the cards, and absence of a city/location indicator or requester identity make it feel incomplete.
>
> - **The app's name, if you noticed it:** Hail (stylized as `h ai l` with "ai" inside a yellow pill)
> - **One word for how it feels:** Prototype

---

## 2. Screen-by-Screen Scoring

**Scoring rule (`go.md` / `BRIEF.md`):** Score each dimension `correct`, `partly`, or `wrong`. Award **`partly` at most** when the viewer only got the answer from small secondary text rather than a dominant headline or primary card element.

| Screen | (a) What Hail is | (b) Who the screen is for | (c) The main action |
| :--- | :---: | :---: | :---: |
| **Screenshot 1: Owner, desktop (1440 px)** | **`partly`** | **`partly`** | **`partly`** |
| **Screenshot 2: Worker, phone (390 px)** | **`partly`** | **`correct`** | **`partly`** |
| **Screenshot 3: Owner, phone** | **`partly`** | **`partly`** | **`correct`** |
| **Screenshot 4: Worker, desktop** | **`partly`** | **`correct`** | **`partly`** |

### Detailed Scoring Breakdown

#### Screenshot 1 — Owner's First Screen, Desktop (1440 px)
* **(a) What Hail is — `partly`:** From the dominant elements (`Balance`, `$406.00`, `$128.00`, `Recent tasks`), the viewer understood that this is a dashboard for funding and paying out local photography/inspection tasks. However, the core value proposition—that **AI agents post the tasks** and Hail screens them and sets pay aside—exists **only** in a small, low-contrast gray subtitle (`"Your agents post tasks; Hail screens them, sets the pay aside, and pays the person who does the work."`) under the generic heading **`Overview`**. Under the 5-second rule, relying on small secondary body copy caps this at `partly`.
* **(b) Who the screen is for — `partly`:** The viewer identified `"agent owner"`, but only because of the tiny 11px muted header label `AGENT OWNER` above `Dana (demo owner)` and the small subtitle. Even then, without dominant context, the viewer wasn't sure if "agent owner" meant an AI agent operator or a human account manager.
* **(c) The main action — `partly`:** The viewer correctly spotted the two primary actions (`Add funds` and `Open approvals`), but noted that both buttons use the exact same high-contrast yellow pill styling (`#F5B800`), creating competing visual hierarchy so there is no single unmistakable primary action.

#### Screenshot 2 — Worker's First Screen, Phone (390 px)
* **(a) What Hail is — `partly`:** The viewer immediately grasped half of Hail's concept from the big **`Tasks near you`** heading and `$25.00` / `$7.00` / `$75.00` cards (local photo and inspection tasks for cash). However, the worker screen gives **zero indication** of who posts the tasks (AI agents needing real-world ground truth), making it look like a generic classifieds list.
* **(b) Who the screen is for — `correct`:** The bold **`Tasks near you`** headline, eyebrow (`FOR LOCAL EARNERS · PAID THROUGH PAYPAL`), mobile layout, and task cards with large dollar payouts communicated "local gig workers/earners on a phone" immediately.
* **(c) The main action — `partly`:** The viewer inferred that you are supposed to tap a task card to claim it (and read `"Claim one, take the photos..."` in the subtitle), **but none of the task cards have a visible button, chevron, or link affordance** (e.g., `[ Claim $25.00 Task → ]`). A card without an action button forces the user to guess whether the card is interactive.

#### Screenshot 3 — Owner's First Screen, Phone
* **(a) What Hail is — `partly`:** Just like Screenshot 1, the dominant text is **`Overview`**, **`Balance`**, **`$406.00`**, and **`$128.00`**. On mobile, the actual tasks list is pushed completely off the bottom of the viewport, so the only clue about what the app does is the small gray subtitle under `Overview`.
* **(b) Who the screen is for — `partly`:** Identified via the small `AGENT OWNER` label above `Dana (demo owner)` in the second header block; the dominant visual elements look like a generic wallet balance page.
* **(c) The main action — `correct`:** Because the competing `Open approvals` button is pushed below the fold on mobile, **`Add funds`** is the single bright yellow button visible on screen, which the viewer identified immediately.

#### Screenshot 4 — Worker's First Screen, Desktop
* **(a) What Hail is — `partly`:** As on mobile, the viewer immediately understood that it lists local inspection and photo errands for fixed dollar amounts (`$25.00`, `$7.00`, `$75.00`), but had no idea AI agents or automated verification were involved.
* **(b) Who the screen is for — `correct`:** Clearly identified as local earners browsing nearby tasks on a desktop computer.
* **(c) The main action — `partly`:** The viewer deduced that the screen wants you to click one of the three task cards, but explicitly called out the missing CTA buttons or hover/click affordances on the cards.

---

## 3. Benchmark & Trust Check (Against `BENCHMARK.md`)

### A. Worker Screens (Screenshots 2 & 4): The 4 Go/No-Go Facts
Per `BENCHMARK.md` (Pattern 1: *"Anatomy-at-a-Glance" Task Card Header* & Pattern 2: *Pre-Funded Escrow Badge*), workers decide in under 3 seconds using four facts:

| Go/No-Go Fact | Spotted in 5 Seconds? | Diagnostic Assessment |
| :--- | :---: | :--- |
| **1. Pay already set aside** | **Yes (`correct`)** | **Strongest win on the worker screen.** The large monospace payouts (`$25.00`, `$7.00`, `$75.00`) paired with the green **`🔒 Pay set aside`** pill (and `🛡 Safety screened` pill) immediately caught the viewer's eye on both mobile and desktop. |
| **2. Effort / proof required** | **Partly (`partly`)** | The cards include `2 photos · 1 note` or `1 photo` in plain text below the pills. It is present, though less visually distinct than icon-badged pills (`📷 2 Photos`). |
| **3. Distance / time** | **Missed / Confusing (`wrong`)** | **Critical gap:** Under a headline that literally says **`Tasks near you`**, there is **no distance indicator** (`0.3 mi away`), **no estimated completion time** (`~5 mins`), and **no city/location selector or map**. Instead, the card shows raw street addresses (`210 Market Street`, `88 Elm Rd`) and a countdown (`22h 13m left`, which looks like task expiration rather than how long the errand takes). Worse, the first card uses **`742 Evergreen Terrace, Suite B, Springfield`** (Homer Simpson's address), which immediately made the viewer suspect fake placeholder data. |
| **4. PayPal payout** | **Buried (`partly`)** | Mentioned only in a small, low-contrast eyebrow (`FOR LOCAL EARNERS · PAID THROUGH PAYPAL`) at the top of the page. There is no recognizable PayPal badge or payout reassurance on the cards or near the bottom `Earnings` tab. |

### B. Owner Screens (Screenshots 1 & 3): Pre-Funded Balance, Screening, and Checked Proof
Per `BENCHMARK.md` (Patterns 2, 5, 7, 9), an AI agent owner needs three immediate guarantees so they aren't afraid a runaway agent will drain their money or post dangerous tasks:

| Owner Trust Signal | Spotted in 5 Seconds? | Diagnostic Assessment |
| :--- | :---: | :--- |
| **1. Pre-funded / capped balance** | **Yes (`correct`)** | **Strongest win on the owner screen.** The side-by-side **`Available $406.00`** (*"Ready for new tasks or to withdraw"*) and **`Set aside $128.00`** (*"Reserved for open tasks"*) cards landed first on both desktop and mobile. (However, on mobile Screenshot 3, repeating the exact same `$406.00` / `$128.00` figures in the top bar right above the Balance card looked broken/redundant.) |
| **2. Unsafe tasks screened out** | **Missed (`wrong`)** | Buried in three words (`"Hail screens them"`) inside small gray body copy under `Overview`. There is no visible **`🛡 Safety Screen: Active`** badge, policy status indicator, or blocked-task counter in the Overview cards. |
| **3. Proof checked automatically** | **Missed / Contradicted (`wrong`)** | **Completely missed—and visually contradicted.** The small subtitle says `"pays the person who does the work"` without even mentioning automatic proof verification. Worse, the Balance card says *"Paid to workers on approval"* and a giant purple-bordered banner announces **`6 tasks need your decision — Review them so your agents and workers aren't kept waiting`** `[Open approvals]`. While that banner was triggered by shared tester data (`go.md`), the UI framing tells the viewer that **human manual approval** is the default workflow rather than automatic proof verification! |

### C. Tone Check: Trustworthy/Practical vs. Sketchy/Dystopian vs. Unfinished
* **Did it trigger sketchy/dystopian ("RentAHuman") vibes?** **No.** Hail completely avoided the cyberpunk/dehumanizing *"meatspace / robots need your body"* trap documented in `BENCHMARK.md`. The warm off-white palette, clean typography, and respectful terminology (`"Local earners"`, `"Pay set aside"`, `"Safety screened"`) felt dignified and calm.
* **Did the "one word for how it feels" land on trustworthy/practical?** **Not yet — it landed on `"Prototype"`** (with trust scored as `Unsure` / `No`).
  * *(Discounting shared tester artifacts)* Even setting aside `"Dana (demo owner)"` and the `$1.00` tester tasks on the owner screen, four design issues caused the `"Prototype"` impression:
    1. **Fictional address on the primary worker card** (`742 Evergreen Terrace, Suite B, Springfield`).
    2. **No clickable CTA buttons on worker task cards** (`[ Claim Task ]`).
    3. **MobileOwner header bloat (Screenshot 3):** Expanded 7-item navigation + duplicate `$406.00` / `$128.00` header consumes 60% of the mobile screen and cuts off the Balance card mid-sentence at the bottom.
    4. **Desktop Worker layout (Screenshot 4):** A narrow mobile column floating in vast empty desktop whitespace with a mobile bottom tab bar stretched across the monitor.

---

## 4. Summary: What the Viewer Noticed First vs. What They Missed

### What Caught the Eye in the First 2 Seconds
1. **The big monospace dollar numbers:** `$406.00` and `$128.00` on the Owner screens; `$25.00`, `$7.00`, and `$75.00` on the Worker screens.
2. **The green `🔒 Pay set aside` and `🛡 Safety screened` pills** on the Worker task cards.
3. **The bright yellow pill buttons (`Add funds` / `Open approvals`)** on the Owner screens.
4. **The `h[ai]l` logo** with `ai` highlighted in a yellow pill, and the bold **`Tasks near you`** / **`Overview`** headings.

### What the Viewer Missed (or Only Found by Reading Small Text)
1. **What Hail actually is on the Owner screen:** Because the headline is the generic word **`Overview`**, the entire explanation that **AI agents post real-world tasks** was buried in small gray text.
2. **Automatic proof verification & PayPal payout speed:** Nothing on the Owner or Worker screens visually communicates *automatic* proof checking or instant PayPal release; the Owner screen instead emphasizes manual approval queues.
3. **How to actually claim a task on the Worker screen:** No button or interactive affordance exists on the task cards.
4. **How "near you" the tasks actually are:** No distance (`0.4 mi`), no city indicator, and no map or location filter under `Tasks near you`.

---

## 5. Three Concrete Suggestions to Make the First Impression Land Faster

### 1. Replace Generic Page Titles with Self-Explanatory Value Headlines + Active Trust Pills (Fixes Owner & Worker 5-Second Clarity)
* **On the Owner Screen (Screenshots 1 & 3):**
  * Replace the generic H1 **`Overview`** with a headline that passes the 5-second test at 28–32px: **`Your AI agents' real-world tasks & budget`**.
  * Beneath the Balance numbers, replace the plain text with three scannable status pills from `BENCHMARK.md` Pattern 7 & 9: **`✓ Pre-Funded Cap Active`** · **`🛡 Safety Screen On`** · **`⚡ Auto Proof Check + PayPal Payout`**.
  * On **mobile (Screenshot 3)**, collapse the 7-item navigation into a compact menu/drawer and **remove the duplicate `$406.00` / `$128.00` header readout** when the Balance card is already on screen, freeing ~260px of vertical space so tasks are visible above the fold.
* **On the Worker Screen (Screenshots 2 & 4):**
  * Upgrade the eyebrow into a high-contrast pill badge including a PayPal mark: **`📍 SPRINGFIELD, OR · PAID INSTANTLY VIA PAYPAL`**, so workers immediately see *where* "near you" is and *how* they get paid.

### 2. Add an Explicit `[ Claim $XX Task → ]` CTA Button, Distance/Effort Metadata, and Real Street Addresses to Every Worker Card
* **Why:** Right now, Worker task cards look like static receipts rather than actionable jobs, and `"742 Evergreen Terrace, Suite B, Springfield"` destroys trust in 2 seconds because everyone recognizes the Simpsons' house.
* **Concrete changes on each Worker card (Screenshots 2 & 4):**
  * Add a high-contrast action button or footer bar on every card: **`[ Claim Task & Lock $25.00 → ]`**.
  * Add **Distance + Estimated Effort time** alongside the photo count (`📍 0.4 mi away · ⏱ ~10 min · 📷 2 photos · 1 note`) instead of only showing an ambiguous `22h 13m left` expiry timer.
  * Replace `"742 Evergreen Terrace, Suite B, Springfield"` with a realistic commercial or neighborhood address (e.g., `"Blue Bottle Coffee, 315 Linden St — 0.4 mi"`).
  * On **Desktop (Screenshot 4)**, move `Tasks / My task / Earnings` into the top header bar (matching desktop web conventions) and display the task cards in a responsive 2-column grid (or list + side detail/map panel) rather than a narrow mobile strip with a bottom phone tab bar.

### 3. Fix CTA Hierarchy on the Owner Screen (`Add funds` vs. `Open approvals`) and Clarify Auto-Verification vs. Exception Review
* **Why:** Having two identical bright yellow primary buttons (`Add funds` and `Open approvals`) splits the viewer's eye, and labeling the banner `"6 tasks need your decision"` makes Hail look like a manual-review bottleneck rather than an automated proof-verification platform.
* **Concrete changes (Screenshot 1):**
  * Make only **one** button solid yellow (`#F5B800`) as the primary CTA (e.g., **`Open approvals (6)`** when tasks are waiting, while styling **`+ Add funds`** as a clean secondary outline button—or vice versa when balance is low).
  * Reframe the approval callout and Recent Tasks status pills so the viewer immediately sees Hail's automatic verification engine at work: e.g., **`✓ Auto-Verified & Paid via PayPal`** on completed rows, and frame manual review as exception/policy handling (`"6 tasks flagged for owner confirmation"`).
