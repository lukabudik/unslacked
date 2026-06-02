# slack-mock

Next.js app that **(a)** fakes a Slack workspace (UI + Slack-Web-API-shaped
endpoints) and **(b)** owns the canonical Neon/Drizzle schema for the whole
project. Runs on **port 3001**.

Why a mock instead of real Slack: the real Slack API is slow to get approved and
painful to seed. The mock lets us simulate any workspace instantly. Because the
API routes mirror Slack's real shapes, Tom's backend can be repointed at real
Slack later with no model changes.

## Run it

```bash
pnpm install
pnpm dev            # http://localhost:3001
```

Works with **no database** — it serves in-memory fixtures (`src/db/fixtures.ts`)
until you set `DATABASE_URL`.

## Wire up Neon

```bash
cp .env.example .env     # paste your Neon pooled connection string
pnpm db:push             # apply schema to the database
pnpm db:seed             # load the fixture workspace
```

Once `DATABASE_URL` is set, the API + UI read from Neon instead of fixtures.

## The schema (read this if you touch data)

`src/db/schema/` is the **single source of truth** for the project's database.

| File | Owner | Tables |
|------|-------|--------|
| `slack.ts` | Luka | `users`, `channels`, `channel_members`, `messages`, `mentions`, `reactions` |
| `analysis.ts` | Tom (proposed) | `routing_events`, `router_scores` |

`mentions` is denormalized on write (`<@U_X>` parsed out of message text) so the
backend can build the routing graph without re-parsing. Change tables freely,
but flag it in the channel — backend + admin both depend on these.

## API (what the backend calls)

All under `/api/slack/*`, mirroring real Slack methods. JSON, CORS-open for dev.

| Endpoint | Slack method | Notes |
|----------|--------------|-------|
| `GET /api/slack/users.list` | `users.list` | `{ ok, members[] }` |
| `GET /api/slack/conversations.list` | `conversations.list` | channels + DMs |
| `GET /api/slack/conversations.history?channel=C_X` | `conversations.history` | top-level messages |
| `GET /api/slack/conversations.replies?channel=C_X&ts=M_001` | `conversations.replies` | full thread |

Mentions are encoded Slack-style in `text` (`<@U_CAROL>`) — parse them the same
way you would against real Slack (`src/lib/mentions.ts` has the regex).

## The fixture workspace

"Nimbus Logistics", ~11 people. **Bob** (eng lead) and **Frank** (head of ops)
are deliberate *routers* — everyone funnels questions to them and they mostly
reply "ask @X". That's the pattern the backend should light up on.

## Scripts

| Command | Does |
|---------|------|
| `pnpm dev` | dev server on :3001 |
| `pnpm db:push` | push schema to Neon (no migration files) |
| `pnpm db:generate` / `db:migrate` | versioned migrations |
| `pnpm db:seed` | load fixtures into Neon |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm typecheck` | `tsc --noEmit` |
