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

**Data flow.** slack-mock owns the canonical schema and serves Slack data over an
HTTP API. The backend reads that API, writes its analysis back to the same Neon
DB. The admin frontend reads both the Slack data and the analysis from Neon (and
hits the backend for live queries / the bot).

## Services & ownership

| Service | Path | Stack | Owner | Status |
|---------|------|-------|-------|--------|
| **Slack mock + schema** | `services/slack-mock` | Next.js, Drizzle, Neon | **Luka** | scaffolded ✅ |
| **Routing tool** | `services/backend` | Python | **Tom** | _to scaffold_ |
| **Admin frontend** | `services/admin` | Next.js | **Ondra** | _to scaffold_ |

Port convention: slack-mock `:3001`, admin `:3000`, backend `:8000`.

## The database is shared — and it lives in slack-mock

`services/slack-mock/src/db/schema/` is the **single source of truth** for the
whole project's Postgres schema (we run it on Neon).

- `schema/slack.ts` — Slack domain (users, channels, messages, mentions…). Luka owns it.
- `schema/analysis.ts` — routing graph + router scores. **Tom owns it** — it's a
  proposed starting point so Ondra has types to build against; reshape as needed.

Everyone connects to the **same Neon database**. Backend writes analysis tables,
frontend reads them. If you change a table, push it from slack-mock
(`pnpm db:push`) and tell the channel.

## Getting started

```bash
git clone git@github.com:lukabudik/unslacked.git
cd unslacked

# Slack mock — runs with zero config (in-memory fixtures)
cd services/slack-mock
pnpm install
pnpm dev            # http://localhost:3001
```

To use a real database, set `DATABASE_URL` (Neon) in
`services/slack-mock/.env` — see that service's README for `db:push` / `db:seed`.

### Neon

We share one Neon project. **Connection string is in the team Discord** (not in
git). Set it as `DATABASE_URL` in each service's `.env`.

## Repo layout

```
unslacked/
├── services/
│   ├── slack-mock/      # Next.js: mock Slack + canonical Neon schema  (Luka)
│   ├── backend/         # Python: ingestion, routing graph, bot        (Tom)
│   └── admin/           # Next.js: dashboard + graph viz               (Ondra)
└── README.md
```

Each service is self-contained and manages its own deps. No root workspace
tooling until it earns its keep.

## Submission checklist (hackathon)

- [ ] Working end-to-end demo: ingest → graph → "who do I call?" answer
- [ ] 3-min demo video; live 2-min demo + 1-min Q&A
- [ ] Uses Duvo and/or Anthropic stack
- [ ] _(Virality prize)_ LinkedIn/X post tagging @duvo.ai + @Anthropic, #PragueBuilderDay
