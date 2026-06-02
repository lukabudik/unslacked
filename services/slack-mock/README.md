# slack-mock

Next.js app that fakes a Slack workspace — a polished Slack-clone UI plus
Slack-Web-API-shaped HTTP endpoints. Runs on **port 3001**.

The data layer (schema, queries, fixtures, seed, Slack SQL API) lives in the
shared **[`@unslacked/db`](../../packages/db)** package, not here.

Why a mock instead of real Slack: the real Slack API is slow to get approved and
painful to seed. The mock lets us simulate any workspace instantly, and the
shapes mirror Slack so the backend can repoint at real Slack later.

## Run it

```bash
pnpm install          # from the repo root (workspace)
pnpm dev              # http://localhost:3001
```

Works with **no database** — `@unslacked/db` falls back to in-memory fixtures
until `DATABASE_URL` is set. For the real shared DB, put the Neon URL in
`services/slack-mock/.env` (and `packages/db/.env`), then from the root:
`pnpm db:push && pnpm db:seed`.

## What's in this package

- **UI** — `src/app` (App Router) + `src/components/slack/*`: sidebar (channels +
  DMs), channel/DM view, working threads (`?thread=`), reactions, and a composer
  that posts for real. Server components read `@unslacked/db`; one client
  component (`Composer`) handles Enter-to-send.
- **HTTP API** — `src/app/api/slack/*` (below). For the bot/posting + anyone who
  wants HTTP. Bulk analysis reads should use the **SQL API** in `@unslacked/db`.
- **Theme** — shadcn (Tailwind v4), aubergine Slack palette.

## HTTP API (`/api/slack/*`, JSON, CORS-open)

| Endpoint | Slack method |
|----------|--------------|
| `GET  /api/slack/users.list` | `users.list` |
| `GET  /api/slack/conversations.list` | `conversations.list` (channels + DMs) |
| `GET  /api/slack/conversations.history?channel=C_X` | `conversations.history` |
| `GET  /api/slack/conversations.replies?channel=C_X&ts=M_001` | `conversations.replies` |
| `POST /api/slack/chat.postMessage` | `chat.postMessage` `{channel,text,thread_ts?,user?}` |
| `POST /api/slack/reactions.add` / `reactions.remove` | `reactions.*` `{timestamp,emoji,user?}` |

## The fixture workspace

"Nimbus Logistics", ~31 people. A few deliberate **router** personas (Frank in
Ops, Bob in Eng, Grace in Product) deflect questions onward — the pattern the
backend should light up on. Mentions are encoded as `<@U_ID>` in message text.

> Schema, scripts (`db:push`/`db:seed`/`db:api`) and the backend's Slack SQL
> query API are documented in **[`packages/db/README.md`](../../packages/db/README.md)**.
