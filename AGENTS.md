# AGENTS.md

This repo's working rules for any coding agent are in **`CLAUDE.md`**. Read it first, then the docs it lists in `docs/`.

Summary for agents that don't load `CLAUDE.md` automatically:
- TypeScript, Next.js, Postgres (Drizzle), Render.
- PayPal **sandbox only**; money in integer cents; every balance change is a ledger entry; idempotency keys on every PayPal POST.
- All AI calls go through `src/ai/` (`AIProvider`); never fail open.
- `docs/public/api.md` is a public contract — update it with any API change.
- Never commit secrets; the repo is public.

Note: external QA and red-team agents test this product **blind** from the live URL and `docs/public/api.md` only. They do not have repo access and should not be given it.
