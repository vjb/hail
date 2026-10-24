<p align="center">
  <img src="docs/assets/hail-street-hero.jpg" alt="A small delivery robot with a signal light waves to a woman on a city sidewalk at dusk" width="100%">
</p>

# Hail

**When your agent hits a wall, it hails a human.**

Hail lets AI agents post **funded, safety-screened tasks** for the real world (inspect an item, photograph a storefront, check opening hours) and pays the people who complete them through **PayPal**.

Built for the PayPal AI Hackathon. Everything runs in the **PayPal sandbox**; no real money moves.

> Status: in active development. See [`PROGRESS.md`](PROGRESS.md) for what works today.

## How it works

<p align="center">
  <img src="docs/assets/hail-wave.svg" alt="A friendly robot and a person waving at each other" width="360">
</p>

1. **Fund first.** An agent's owner tops up a Hail balance once with PayPal. A task can only go live once its full pay is set aside, so workers are never ghosted.
2. **Safety screen.** Every task is screened (rules plus AI) before anyone sees it. Account fraud, one-time-code requests, fake reviews and the like are blocked; risky or expensive tasks wait for the owner.
3. **Verified work.** A person nearby claims the task on their phone and submits photos. AI checks the proof against the task's own checklist and explains each decision.
4. **Paid the PayPal way.** Approved work is paid out with PayPal Payouts to the worker's email. If the owner goes silent, the worker is paid automatically.

Agents talk to Hail through a small REST API or an MCP server. The public contract is in [`docs/public/api.md`](docs/public/api.md) and is also served at `/docs/api`.

## Stack

TypeScript · Next.js 16 (App Router) · Postgres + Drizzle ORM · zod · PayPal REST (Orders v2, refunds, Payouts, Webhooks) and the PayPal JS SDK v6 · Claude (Anthropic API) for screening and photo verification · AG Studio for the owner control room · Model Context Protocol · Playwright + axe · Vitest · Render.

## Run it locally

Prerequisites: Node.js 22+, Docker (for Postgres), a PayPal developer account with a sandbox app.

```bash
# 1. Database
docker run -d --name hail-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=hail -p 5432:5432 postgres:17

# 2. Config
cp .env.example .env          # fill in the values (see below)

# 3. Install, migrate, seed
npm install
npm run db:migrate
npm run db:seed               # demo accounts from .env; prints a demo API key once

# 4. Run
npm run dev                   # http://localhost:3000
```

For PayPal webhooks on a laptop, run a tunnel (e.g. `ngrok http 3000`) and register it:

```bash
npm run webhook:register -- https://<your-tunnel-host>
```

## Deploy (Render)

`render.yaml` is a Render Blueprint: the web service (migrations run before each deploy), Postgres 17, and a cron job that runs the sweeper every minute.

1. In Render: **New → Blueprint**, pick this repo, and apply. Render asks for every `sync: false` value. Use the same values as `.env`, except `APP_BASE_URL`, which is the Render URL. `SESSION_SECRET` is generated for you.
2. Register the PayPal webhook for the hosted URL and put the printed ID in Render as `PAYPAL_WEBHOOK_ID`:
   ```bash
   npm run webhook:register -- https://<your-app>.onrender.com --print-only
   ```
3. Seed the demo accounts once from the Render shell: `npm run db:seed`.

Pushes to `main` deploy automatically.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm run typecheck` · `lint` · `test` | Types, ESLint, Vitest unit and integration tests (uses a throwaway `hail_test` database) |
| `npm run e2e` | Playwright end-to-end tests against `E2E_BASE_URL` (approves PayPal sandbox checkout automatically) |
| `npm run screenshots` | Captures every screen at desktop and phone sizes, light and dark, into `screenshots/` |
| `npm run db:migrate` · `db:seed` | Apply migrations · seed demo accounts (`-- --fresh` wipes first) |
| `npm run spike:paypal` | Day 1 sandbox proof: order, capture, partial refund, payout, idempotency |
| `npm run webhook:register -- <url>` | Create or reuse the PayPal sandbox webhook and write its ID to `.env` |
| `npm run key:create -- <name> <cap-cents> [file]` | Create an API key for the demo owner |
| `npm run eval:screening` | Run the labeled screening set through the real screen; appends to `qa/eval-history.csv` |
| `npm run mcp:smoke -- <base-url> <key-file>` | Exercise the MCP server with the official MCP client |
| `npm run payout:check` | Drive one task to a real sandbox payout (AI verdict stubbed) |

## Configuration

All settings are environment variables; `.env.example` lists every one. The important ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `PAYPAL_ENV` | Must be `sandbox`. The app refuses to start otherwise |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal sandbox REST app credentials |
| `PAYPAL_WEBHOOK_ID` | Set by `npm run webhook:register` |
| `ANTHROPIC_API_KEY`, `AI_MODEL_SCREEN`, `AI_MODEL_VERIFY`, `AI_MODEL_OPS` | Claude access and model IDs |
| `CHANNEL3_API_KEY` | Product data for product-linked tasks |
| `SESSION_SECRET`, `SWEEP_SECRET` | Random 32+ character secrets |
| `DEMO_*` | Seeded demo accounts (owner, two workers, admin) |
| `E2E_PAYPAL_BUYER_EMAIL`, `E2E_PAYPAL_BUYER_PASSWORD` | Sandbox personal account used by the e2e tests |

## Demo accounts

The hosted demo has an owner, two workers and an admin. Their sign-in details will be listed here for judges before submission.

## Project docs

- [`docs/01-product-spec.md`](docs/01-product-spec.md) — what Hail is and why
- [`docs/02-architecture.md`](docs/02-architecture.md) — money model, PayPal flows, state machine, data model
- [`docs/06-design-system.md`](docs/06-design-system.md) — brand, tokens, components
- [`DECISIONS.md`](DECISIONS.md) — decisions and deviations, with reasons
- [`HAIL-LOG.md`](HAIL-LOG.md) — every time the coding agent had to hail its human

## License

[MIT](LICENSE)
