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
| HH-007 | H6 | 2026-10-24 17:36 | 2026-10-24 17:40 | ~4m | Four product decisions: where the new illustrations go, one spot per bounty, and per-photo retake before submit | Scope, public-contract and brand choices belong to the human |
| HH-008 | H4 | 2026-10-24 18:19 | | | Connect Render to the GitHub repo (New → Blueprint) and enter the secret env values | Creating a hosting account and linking it to GitHub needs the human's identity and billing |
| HH-009 | H5 | 2026-10-24 18:19 | | | Run the happy path on a real phone against the Render URL | Needs a physical phone, a camera and a real-world photo |
| HH-010 | H1 | 2026-10-24 18:19 | | | Sample proof photos from Gemini (3 good, 3 bad) for e2e and seed data | The verifier rightly rejects generated graphics; realistic sample photos need a human with an image model |

Not hails (done by the agent without help): sandbox account credentials, PayPal client ID/secret, Payouts check, Anthropic API key creation, Channel3 key and promo code, webhook registration (`PAYPAL_WEBHOOK_ID` via API, avoiding H2).

**Run summary (Day 0 setup + Days 1–7):** 10 hails: 6 × H1, 2 × H6, 1 × H4, 1 × H5. HH-008 to HH-010 are still open.
