# 04 — Pitch and Demo

## Positioning
**Hail: your agent's eyes before it spends money.**
AI agents can now pay for things. They can't see what they're paying for. Before an agent pays a stranger for something in the physical world, it hails a human to go and look, and PayPal only moves the agent's money after the proof checks out.

One line for the slide: **the pay is guaranteed, the task is screened, and the proof is real.**
- *Pay guaranteed:* the worker's reward is set aside before anyone sees the task, and paid to their verified PayPal account.
- *Task screened:* tasks that would misuse a person (codes, fake accounts, stalking) are blocked before they're posted.
- *Proof real:* photos are taken live in the app with a fresh code; anything doubtful goes to a person instead of being paid automatically.

Agents hiring people is already happening, and the first big platform left workers unpaid and exposed to abuse. Hail is the version you can trust with money on both sides.

**The line to land:** "Hail pays for the truth, not for a yes." The worker who reports that the item doesn't match still gets paid, and that report is what saves the agent's money.

## Prize targets
- **Best Use of Agentic Commerce** ($5,000) — agents that transact, with real guardrails.
- **Best Use of AG Grid, 1st** ($5,000) — AG Studio control room with custom widgets, Hail theming, and a custom ops agent talking to Studio's built-in agents.
- Stretch: a podium place (1st $12,000) instead of the honorable mention.
- Rules: one main or honorable-mention prize + one sponsor prize per project.

## Judging criteria → what shows it

| Criterion (equal weight) | Where it shows |
|---|---|
| Technological implementation | Orders/capture/refund, Payouts, verified webhooks, double-entry ledger, MCP server, Claude screening + vision verification |
| Design | Coherent three-sided product: owner dashboard, worker mobile app, agent API |
| Potential impact | Real, documented problem (ghosting, abuse) with a specific audience: workers and agent owners |
| Innovation | Verify-then-pay: the agent's PayPal payment is authorized, held, and captured only after a person's proof passes, or voided if it doesn't |
| Presentation | The 3-minute video below |

Stage one is pass/fail on "meaningfully uses PayPal and AI" — make both obvious in the first 30 seconds.

PayPal shows up four times in one story; say so: the owner funds Hail (Orders + capture), the worker is paid (Payouts), the agent's purchase is held (Orders with `AUTHORIZE`) and then captured or voided, and every step is confirmed by verified webhooks.

## Facts for the pitch (cite them)
- RentAHuman.ai launched Feb 2026; 40,000+ workers signed up within days; pays in crypto. (Analytics Vidhya, Feb 4, 2026)
- A study of 303 of its bounties found account fraud, identity proxying, OTP solicitation and more; 35 of 37 "completed" bounties had no spots filled, meaning workers were never paid. The authors recommend escrow, content screening and human approval. (arXiv 2602.19514)

## Our own numbers (fill in on Day 18 from the records in `07-records-and-pipelines.md`)
- Times the coding agent hailed the human: **[N]** (`HAIL-LOG.md`), median wait **[m]**
- Red-team block rate: **[x of y]** attacks written by an independent AI (Gemini)
- Screening accuracy: **[%]** on **[N]** labeled cases, **0** false allows
- AI cost: about **[$]** per screened task, **[$]** per verification
- Outside developer: zero to first successful bounty in **[minutes]** from public docs alone

## Demo script (target 2:50)

The spine is one purchase. The agent is buying a used espresso machine ($120) from a stranger's listing. It can't see the machine.

**0:00–0:15 — The hook.** "AI agents can pay for things now. They can't see what they're buying." Show the requester agent (built by a different AI from our public docs alone) finding the listing and the model's real specs via Channel3.

**0:15–0:35 — Money held, not sent.** The agent authorizes $120 with PayPal: the buyer approves, the money is held for the seller, nothing is sent. Then it calls Hail's MCP `create_bounty`: $25, "photograph the serial plate and the machine powered on." Owner dashboard: $25 moves from Available to Set aside the instant the task posts. "The worker's pay is set aside before anyone sees the job."

**0:35–0:50 — The screen.** A second agent posts "Receive a verification code for me, $15." Blocked instantly, with the category and the reason on screen. Flash: "Blocked [x of y] attacks written by an independent AI red team."

**0:50–1:30 — The human.** Phone, full size. The worker sees the task with the product card and the "Pay set aside" badge, claims it, opens the camera. A fresh code appears; they write it on paper, photograph it beside the serial plate. Verifier result: each checklist item with its reasoning, and the proof checks (code present, taken live, not a screen). Payout to the worker's verified PayPal account; show it land.

**1:30–2:00 — The catch.** The serial in the photo doesn't match the listing. The agent reads the verified result, says "Serial doesn't match the listing. Voiding the payment," and voids the $120 authorization. "The money never moved. And the worker still got paid, because Hail pays for the truth, not for a yes." Cut to the honest listing: same flow, match, the agent captures and the seller is paid. Show the proof certificate.

**2:00–2:15 — Faking it doesn't pay.** A submission that's a photo of a screen, without the code: it goes to the owner for review instead of paying out. One sentence: "No photo is unfakeable. Hail makes cheating cost more than the task pays, and puts a verified PayPal name on it."

**2:15–2:40 — The control room.** AG Studio dashboard: money set aside, paid out, blocked attempts by category, time to completion. Type "Which task types get rejected most?" and the ops agent builds the widget live.

**2:40–2:50 — Close.** "Hail. Your agent's eyes before it spends money. The pay is guaranteed, the task is screened, and the proof is real." Optional last beat: "Built with an AI coding agent that had to hail me [N] times."

## Recording tips
- Record each segment separately; cut tight. No dead air waiting on APIs (speed up or cut).
- Use real screen capture of the real app, not AI-generated video.
- Show the phone screen at full size for the worker segment.
- Big, readable text; dark-on-light or high contrast.
- No copyrighted music; no third-party logos beyond PayPal/sponsors as used in the product.
- Keep under 3:00. Judges aren't required to watch beyond that.

## Devpost description outline
1. Inspiration — agents can pay but can't see; and the ghosting and abuse findings on the first agents-hire-humans platform
2. What it does — three sides: agents, owners, workers
3. How we built it — PayPal (Orders, capture/refund, Payouts, webhooks), Claude (screening, vision verification, ops agent), AG Studio + Studio Agent Framework, Channel3, MCP, Render
4. Tools and models used and how (required by the rules)
5. Safety — the policy, the red-team method and results
6. Challenges and what we learned
7. What's next — ratings, repeat-worker trust, more task types, Venmo payouts (not available in the PayPal sandbox)
