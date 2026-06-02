# unslacked

**Find the humans who are secretly just routers.**

Built at [Prague Builder Day](https://luma.com/cp12p78n) (Duvo × Anthropic), June 2, 2026.

## The idea

In every company there are people who don't actually do the work you ask them
about — they just forward you to whoever does. "Ask Carol." "That's Frank's
area." "Talk to the platform team." They're human routers, and they're a
bottleneck: every question through them adds a hop, a delay, and a single point
of failure.

**unslacked** watches a company's Slack (channels *and* DMs), builds a dependency
graph of who-points-at-whom, and surfaces the routers — so you can either go
straight to the real owner, or fix the org so the routing stops.

What it does:

1. **Ingest** the workspace — every message, mention, and thread.
2. **Build a routing graph** — edges are "X sent person to Y instead of answering."
3. **Score routers** — who is high-traffic but low-answer? Flag them.
4. **A Slack bot** you can ask: *"who do I actually talk to about billing?"* → it skips the routers and names the owner.
5. **An admin frontend** — the graph, the router leaderboard, the evidence.
6. *(Later)* **Nudges** — automatically tell chronic routers to stop, with the why.

## Architecture

```
┌──────────────────┐      Slack-shaped API       ┌──────────────────┐
│   slack-mock     │ ───────────────────────────▶│   backend (tool) │
│  (Next.js, TS)   │   /api/slack/users.list…     │     (Python)     │
│                  │                              │                  │
│  • mock Slack UI │                              │ • ingest + parse │
│  • fixture data  │                              │ • routing graph  │
│  • OWNS the      │                              │ • router scoring │
│    Drizzle/Neon  │◀── writes analysis tables ───│ • Slack bot      │
│    schema        │      (same Neon DB)          └────────┬─────────┘
└────────┬─────────┘                                       │
         │                                                 │ REST/JSON
         │ Neon (Postgres)                                 ▼
         │                                        ┌──────────────────┐
         └───────────────────────────────────────│  admin frontend  │
                  reads slack + analysis tables   │   (Next.js, TS)  │
                                                  │ • graph viz      │
                                                  │ • router board   │
                                                  └──────────────────┘
```

**Why a Slack mock?** The real Slack API is slow to get approved and painful to
seed. The mock fakes a workspace we control completely, and its endpoints mirror
real Slack shapes — so the backend swaps to real Slack later with no rewrite.

**Data flow.** The shared **`packages/db`** package owns the canonical Neon
schema. slack-mock writes Slack data into Neon (UI + HTTP API). The backend reads
it **two ways**: bulk analysis reads via the **Slack-flavored SQL API** in Neon
(`slack.conversations_history(…)` etc — feels like the Slack Web API, no joins),
and the bot posts via slack-mock's HTTP `chat.postMessage`. The admin frontend
reads from Neon (via `@unslacked/db`) and hits the backend for analysis.

## Services & packages

| Path | What | Stack |
|------|------|-------|
| `packages/db` | **Shared** schema, queries, fixtures, Slack SQL API | Drizzle, Neon |
| `services/slack-mock` | Mock Slack UI + HTTP API | Next.js |
| `services/backend` | Ingestion, routing graph, bot | Python |
| `services/admin` | Dashboard + graph viz | Next.js |

Port convention: slack-mock `:3001`, admin `:3000`, backend `:8000`.

## The database is shared — it lives in `packages/db`

`packages/db` is the **single source of truth** for the project's Postgres schema
(on Neon) and the query layer. Everything imports it (`@unslacked/db`).

- `src/schema/slack.ts` — Slack domain (users, channels, messages, mentions…).
- `src/schema/analysis.ts` — routing/scoring output tables.
- `src/slack-api.sql` — the Slack-flavored read API for the backend. See `packages/db/README.md`.

Everyone connects to the **same Neon database**. Change a table → `pnpm db:push`.

## Getting started

```bash
git clone git@github.com:lukabudik/unslacked.git
cd unslacked
pnpm install            # installs the whole workspace

pnpm dev                # slack-mock at http://localhost:3001
```

slack-mock runs with zero config on in-memory fixtures. For the real shared DB,
put your Neon `DATABASE_URL` in both `packages/db/.env` and
`services/slack-mock/.env`, then:

```bash
pnpm db:push    # apply schema     pnpm db:seed   # load fixtures
pnpm db:api     # install Slack SQL read API for the backend
```

## Repo layout

```
unslacked/
├── packages/
│   └── db/              # @unslacked/db — schema, queries, fixtures, Slack SQL API
├── services/
│   ├── slack-mock/      # Next.js: mock Slack UI + HTTP API
│   ├── backend/         # Python: ingestion, routing graph, bot
│   └── admin/           # Next.js: dashboard + graph viz
├── pnpm-workspace.yaml
└── README.md
```

pnpm workspace — shared code lives in `packages/*`, apps in `services/*`.
