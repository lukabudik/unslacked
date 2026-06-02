# unslacked — project instructions

Hackathon project (Prague Builder Day). A tool that watches a company's Slack,
builds a who-routes-whom dependency graph, and surfaces the human "routers."

## Layout
pnpm monorepo. Shared code in `packages/*`, apps in `services/*`.
- `packages/db` — `@unslacked/db`: canonical Neon/Drizzle schema, queries, fixtures, the Slack-flavored SQL read API (`slack-api.sql`). Source of truth for data.
- `services/slack-mock` — Next.js mock Slack (UI + HTTP API) on :3001. (Luka)
- `services/backend` — Python routing tool + bot. (Tom)
- `services/admin` — Next.js dashboard. (Ondra)

## Key conventions
- **The mock builds Slack data only — never analysis.** Routing graph / scoring
  lives in the backend. Don't add analysis views/queries to `packages/db`.
- One shared Neon DB; schema changes go through `packages/db` (`pnpm db:push`).
- Secrets (`DATABASE_URL`) live in gitignored `.env` files, shared via Discord.

## Living doc — keep it current
**`docs/MOCK.md`** tracks the mock's readiness as an enterprise-client dataset
(gap analysis, data-generation strategy, roadmap, changelog). Update it whenever
data, schema, or UI changes materially, and add a Changelog line.
