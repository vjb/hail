# 04 — Pitch and Demo

## Positioning
**Hail: when your agent hits a wall, it hails a human.**
Agents hiring humans is already happening, and early platforms leave workers ghosted and exploited. Hail is the trustworthy version: fund-first escrow, AI safety screening, AI-verified work, and PayPal payouts to people who already have PayPal.

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
| Innovation | Inverts "agent does it for you": the agent knows its limits and hires a person, safely |
| Presentation | The 3-minute video below |

Stage one is pass/fail on "meaningfully uses PayPal and AI" — make both obvious in the first 30 seconds.

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

**0:00–0:20 — The hook and the problem.** "I built this with an AI coding agent. It hit walls it couldn't get past and had to hail me [N] times. [Show HAIL-LOG scrolling.] Agents everywhere hit those walls. They're starting to hire people, and on the first big platform, researchers found 35 of 37 'completed' jobs never paid anyone. Hail fixes that with PayPal."

**0:20–0:45 — The agent hits a wall.** Show the requester agent (built by Gemini from our public docs) sourcing a used espresso machine. It finds the model's details via Channel3 and a local listing it can't physically inspect. Line: "This agent was built by a different AI, from our public docs alone." It calls Hail's MCP `create_bounty`: $25, photograph the serial plate and power it on.

**0:45–1:05 — Fund-first escrow.** Owner dashboard: balance topped up once via PayPal; $25 moves from available to held the instant the bounty posts. "The money is set aside before any worker sees the job. Ghosting is impossible."

**1:05–1:25 — The safety screen.** A second agent posts "Receive a verification code for me, $15." Blocked instantly, with the category (OTP solicitation) and the rationale on screen. Flash the red-team stat: "Blocked N of M attacks written by an independent AI."

**1:25–2:05 — The human.** Phone screen: worker sees the bounty with the product card and checklist, claims it, takes two photos, submits. Verifier result appears: each checklist item passed, with its reasoning. PayPal payout status flips to paid; show the sandbox personal account receiving $25. The agent gets its callback and continues: "Serial matches. Proceeding to purchase."

**2:05–2:40 — The control room.** AG Studio dashboard: escrow held, paid out, blocked attempts by category, time to completion. Type "Which task types get rejected most?" and the ops agent builds the widget live.

**2:40–2:50 — Close.** "Hail. When your agent hits a wall, it hails a human, and that human always gets paid."

## Recording tips
- Record each segment separately; cut tight. No dead air waiting on APIs (speed up or cut).
- Use real screen capture of the real app, not AI-generated video.
- Show the phone screen at full size for the worker segment.
- Big, readable text; dark-on-light or high contrast.
- No copyrighted music; no third-party logos beyond PayPal/sponsors as used in the product.
- Keep under 3:00. Judges aren't required to watch beyond that.

## Devpost description outline
1. Inspiration — the ghosting and abuse findings
2. What it does — three sides: agents, owners, workers
3. How we built it — PayPal (Orders, capture/refund, Payouts, webhooks), Claude (screening, vision verification, ops agent), AG Studio + Studio Agent Framework, Channel3, MCP, Render
4. Tools and models used and how (required by the rules)
5. Safety — the policy, the red-team method and results
6. Challenges and what we learned
7. What's next — identity checks, ratings, Venmo payouts, more task types
