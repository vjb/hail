# HAIL-LOG — every time the coding agent hailed the human

Times are US Eastern. Day 0 times are approximate (reconstructed from the setup session).

| ID | Type | Requested (ET) | Resolved (ET) | Wait | What the agent asked for | Why an agent couldn't do it |
|----|------|----------------|---------------|------|--------------------------|-----------------------------|
| HH-001 | H6 | 2026-10-24 ~15:58 | 2026-10-24 ~16:00 | ~2m | Confirm the `hail` repo may be public (employer approval for outside open-source work) | A legal/employment decision only the human can make |
| HH-002 | H1 | 2026-10-24 ~16:03 | 2026-10-24 ~16:05 | ~2m | Sign in to the PayPal Developer Dashboard in the automation browser | Signing in needs the human's identity and 2FA |
| HH-003 | H1 | 2026-10-24 ~16:07 | 2026-10-24 ~16:08 | ~1m | Click "Create App" for the `Hail` sandbox app | The agent's safety guard blocked account-changing clicks on a real account. Avoidable: the human can pre-approve this kind of action |
| HH-004 | H1 | 2026-10-24 ~16:10 | 2026-10-24 ~16:13 | ~3m | Sign in to the Claude Console (credit was already purchased) | Signing in and payment need the human's identity and card |
| HH-005 | H1 | 2026-10-24 ~16:17 | 2026-10-24 ~16:20 | ~3m | Sign up for Channel3 | Creating an account accepts terms in the human's name |
| HH-006 | H1 | 2026-10-24 ~16:22 | 2026-10-24 ~16:27 | ~5m | Register on Devpost for the hackathon | Hackathon registration is tied to the human's identity |

Not hails (done by the agent without help): sandbox account credentials, PayPal client ID/secret, Payouts check, Anthropic API key creation, Channel3 key and promo code, webhook registration (`PAYPAL_WEBHOOK_ID` via API, avoiding H2).

**Run summary (Day 0 setup + Day 1):** 6 hails — 5 × H1, 1 × H6. Total wait ~16m, median ~2.5m.
