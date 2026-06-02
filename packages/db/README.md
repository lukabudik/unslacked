# @unslacked/db

The **shared data layer** for the whole monorepo — canonical Neon/Drizzle schema,
the query layer, fixtures, the seeder, and the **Slack-flavored SQL read API** the
backend uses. Every service depends on this package so there's one source of truth.

## What's in here

| Path | What |
|------|------|
| `src/schema/slack.ts` | Canonical Slack domain: users, channels, channel_members, messages, mentions, reactions |
| `src/schema/analysis.ts` | Backend-owned output tables (routing_events, router_scores) — placeholder, Tom shapes these |
| `src/client.ts` | Drizzle client over Neon (`db`, `isDbConfigured`) |
| `src/queries.ts` | Read/write query layer (`listChannels`, `getHistory`, `addMessage`, …) — shared by TS services |
| `src/fixtures.ts` | The "Nimbus Logistics" seed dataset |
| `src/seed.ts` | Loads fixtures into Neon |
| `src/slack-api.sql` | **Slack-flavored read API for the backend** (see below) |
| `src/apply-api.ts` | Applies `slack-api.sql` to Neon |

## Use from a TS service

```ts
import { listChannels, getHistory, db, type StoreMessage } from "@unslacked/db";
```

Workspace dep: `"@unslacked/db": "workspace:*"`. Next apps must add
`transpilePackages: ["@unslacked/db"]` (it ships TS source, no build step).

## Scripts (run from repo root)

```bash
pnpm db:push     # apply schema to Neon
pnpm db:seed     # load the fixture workspace
pnpm db:api      # (re)apply the Slack SQL read API
pnpm db:studio   # Drizzle Studio
```

Needs `DATABASE_URL` in `packages/db/.env` (gitignored — copy `.env.example`).

## The Slack SQL read API (for the backend / Tom)

`src/slack-api.sql` installs a `slack` schema in Neon that lets you query the
data **as if it were the Slack Web API** — no joins. It exposes *only Slack data*
(users, channels, DMs, messages, threads, reactions). Building the routing graph
/ analysis is the backend's job and lives nowhere in here.

Apply once (`pnpm db:api`), then call:

| Call | Returns (Slack-shaped JSON) |
|------|------------------------------|
| `select slack.users_list();` | `{ ok, members:[…] }` |
| `select slack.users_info('U_BOB');` | `{ ok, user:{…} }` |
| `select slack.conversations_list();` | `{ ok, channels:[…] }` (channels + DMs, `is_private/is_im/is_mpim/is_archived`, `members[]`) |
| `select slack.conversations_history('C_ENGINEERING');` | `{ ok, messages:[…], has_more }` (top-level only, each with `reply_count` + `reactions`) |
| `select slack.conversations_history('C_ENGINEERING', current_date);` | same, **today's** messages |
| `select slack.conversations_replies('C_INCIDENTS','M_I15');` | `{ ok, messages:[…] }` (a full thread) |

Prefer rows over JSON envelopes? Two views:

```sql
select * from slack.messages where channel_id = 'C_OPS' and is_reply = false;
select * from slack.channel_members where channel_id = 'C_ENGINEERING';
```

Mentions are encoded in message `text` as `<@U_ID>`, exactly like real Slack —
parse them on the backend.
