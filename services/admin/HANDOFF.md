# Admin dashboard — team handoff

The `admin` service is the org-intelligence dashboard: communication graph, topics,
connectors (middlemen), routing, and Duvo automation opportunities. It reads the
shared Slack dataset directly from Neon Postgres via Drizzle.

This doc covers **how to run it**, **how data flows**, **what is real vs. still
faked**, and the **TODOs** to make it fully production-real.

---

## 1. Run it

```bash
# from repo root (pnpm workspace)
pnpm install
pnpm --filter @unslacked/admin dev      # http://localhost:3000
pnpm --filter @unslacked/admin build    # production build
```

Env (`services/admin/.env.local`, gitignored — see `.env.example`):

```
NEXT_PUBLIC_USE_MOCK=false   # false = live DB, true = deterministic mock
NEXT_PUBLIC_BACKEND_URL=     # reserved (not used yet)
DATABASE_URL=postgresql://…neon.tech/neondb?sslmode=require&channel_binding=require
```

> The `DATABASE_URL` is the same Neon instance the `slack-mock` / `datagen`
> services write to. The dashboard is **read-only** against it.

---

## 2. How data flows (the one rule)

Every component gets its data from **`lib/api/client.ts`** — the only data
entrypoint. Nothing imports the DB or mock directly.

```
UI (server components) ─► lib/api/client.ts ─► lib/api/db.ts   (live Neon, when DATABASE_URL set)
                                            └► lib/api/mock.ts  (deterministic faker fallback)
```

- Source selection lives in `client.ts`: `NEXT_PUBLIC_USE_MOCK=true` forces mock;
  otherwise it uses the DB when `DATABASE_URL` is present.
- The **contract** is `lib/api/types.ts`. Keep it stable — if the DB shape changes,
  adapt the mapping inside `db.ts`, not the components.
- DB access: `lib/db/index.ts` (Drizzle client, `server-only`) + `lib/db/schema.ts`
  (table definitions).

---

## 3. What's REAL vs. DERIVED vs. MOCK

Everything is computed in `lib/api/db.ts` from the live tables, EXCEPT the three
items flagged ⚠️ — those are heuristics/placeholders until the backend router and a
task-miner exist.

| Endpoint (`client.ts`)   | Source today | Status |
|--------------------------|--------------|--------|
| `getCommsGraph()`        | `users`, `messages`, `mentions` (thread + @-mention edges) | ✅ real |
| people metrics           | degree, **Brandes betweenness**, volume, isolation — computed | ✅ real |
| `getTopics()`            | `channels` + per-channel message/participant/dept rollups | ✅ real |
| `getMiddlemen()`         | top betweenness people + bridged departments | ✅ real |
| `getKpis()`              | avg shortest path, cross-fn %, shadow teams, bus factor… computed | ✅ real |
| `getActivityTimeline()`  | daily buckets of mentions / threads / messages | ✅ real |
| `getPersonaRoutes()`     | **derived** from middleman neighbors (heuristic) | ⚠️ replace |
| `getRoutingFeed()`       | **derived** from recent cross-dept @-mentions | ⚠️ replace |
| `getAutomations()`       | **`curatedAutomations()` — hardcoded list** | ⚠️ replace |
| `getKeyPersonRisks()`    | betweenness + sole-ownership + mention share — computed | ✅ real |
| `getTopicOwnership()`    | per-channel dominant-author share — computed | ✅ real |
| `getDeadEndRoutes()`     | mentions/usergroups still pointing at deactivated users | ✅ real |
| `getOpenQuestions()`     | question-heuristic on top-level msgs + reply latency | 🟡 heuristic |
| `getExpertise()`         | thread replies authored + distinct askers helped | ✅ real |
| `getRecurringQuestions()`| keyword-signature clustering of question text | 🟡 heuristic |
| `getSentiment()`         | **synthesized** deterministic walk per team (no LLM yet) | ⚠️ replace |
| `getOverload()`          | mentions + threads + after-hours (UTC hour) — computed | 🟡 real-ish |
| `getSilos()`             | dept→dept comms strength from edges — computed | ✅ real |
| `getRecognition()`       | reactions received vs given — computed | ✅ real |
| `getShadowRanks()`       | influence rank (betweenness) vs formal rank (title) | ✅ real |

The DB tables `routing_events` and `router_scores` currently have **0 rows**, which
is why routing is derived. Once the backend router populates them, switch to reading
them (see TODO 2).

---

## 4. TODOs to make it fully workable

### TODO 1 — Real Duvo automation suggestions ✅ DONE
**Files:** `lib/api/db.ts` reads `automation_opportunities`; mining lives in
`services/analysis-worker/src/agent/automations.ts` (Phase 3 of `/analyze`).
**Type:** `AutomationOpportunity` in `lib/api/types.ts`

The analysis-worker mines real opportunities (no longer a hand-written list):

- **Discovery:** one Claude (Sonnet) pass over a sample of recent messages proposes
  4–8 candidate tasks with `verb`/`object`/`crossSystem`/`duvoFitScore`, distinctive
  `keywords`, and `estMinutesPerTask`.
- **Grounding:** each candidate is verified against the *full* corpus
  (`groundTask()` in `analysis-queries.ts`) — `frequency`, `distinctRequesters`, and
  `requesterPersonas` are **real counts**, not LLM guesses; `estHoursPerMonth =
  real frequency × estMinutesPerTask / 60`; `evidence` holds backing message IDs.
- **Owner enrichment:** matched to `responsibility_claims` → `topic` + `ownerUserId`.
- Results land in `automation_opportunities`; `db.ts` `SELECT`s and maps them, falling
  back to `curatedAutomations()` until the miner has run.

> `duvoFitScore` and `estMinutesPerTask` remain LLM **estimates** (the table header
> labels hours "Est."); the volume numbers are now corpus-grounded.

Requires `pnpm --filter @unslacked/db db:push` to apply the schema (nullable `source`
+ `evidence`/`topic`/`owner_user_id` columns).

### TODO 2 — Real routing (Persona-pair routes + feed)
**Files:** `lib/api/db.ts` → `personaRoutes()`, `routingFeed()`, `middlemen()`
**Tables:** `routing_events`, `router_scores` (both empty today)

When the backend router fills these, read from them instead of deriving:

`routing_events` columns: `id, router_user_id, asker_user_id, target_user_id,
channel_id, message_id, confidence, explanation, created_at`
`router_scores` columns: `user_id, router_score, routed_count, answered_count,
summary, updated_at`

Mapping guidance:
- **`RoutingEvent`** ← one `routing_events` row:
  `requesterId = asker_user_id`, `suggestedRecipientId = target_user_id`,
  `intendedRecipientId = router_user_id` (the connector originally hit),
  `at = created_at`, plus `confidence`/`explanation`.
  ⚠️ there's no `status`/`hopsSaved` column yet — either add them to the table or
  derive (e.g. status from whether the asker later messaged the target).
- **`PersonaPairRoute`** ← aggregate `routing_events` grouped by
  (asker's department → `target_user_id`) via `router_user_id`: `occurrences = count`,
  `confidence = avg(confidence)`.
- **`MiddlemanInsight`/connectors** ← prefer `router_scores.router_score` over the
  computed betweenness once available (keep betweenness as the visual fallback).

The routing page already scales to thousands of routes (search + pagination in
`components/routing/PersonaRoutesPanel.tsx`), so no UI work is needed here — just the
data swap.

### TODO 3 — Duvo provisioning action
**File:** `components/automations/DuvoProvisionDialog.tsx` (search `// TODO: real Duvo provisioning`)

The "Create Duvo Agent" button currently copies the brief to the clipboard + toasts.
Wire it to the real Duvo endpoint when available (confirm the surface with the Duvo
team). Likely a `POST` to a backend route that forwards to Duvo.

### TODO 4 — Use the shared `@unslacked/db` package
`admin` defines its **own** Drizzle schema in `lib/db/schema.ts`, duplicating the
canonical `packages/db` (`@unslacked/db`). To avoid drift, add `@unslacked/db` as a
workspace dependency and import its schema/client instead. Keep the admin's
aggregation logic (graph building, Brandes, etc.) — only the table definitions/client
should come from the shared package.

### TODO 5 — Misc to be "really workable"
- **Caching / freshness:** `db.ts` builds the whole bundle once per server process
  (`_bundle` promise) — great for a demo, but it never refreshes. Add revalidation
  (e.g. `export const revalidate = 60` on pages, or cache per-request) so new Slack
  data shows up.
- **Bots/edge cases:** bot users are filtered (`is_bot`); DMs (`im`) and group DMs
  (`mpim`) are included as edges and topics — confirm that's desired.
- **Header search** (`⌘K`) deep-links people into the graph (`/graph?focus=<id>`); it
  reads the people list in `app/layout.tsx`. Fine as-is.
- **Deploy (Railway):** standard Next.js — build `pnpm --filter @unslacked/admin build`,
  start `next start`. Set `DATABASE_URL` (+ `NEXT_PUBLIC_USE_MOCK=false`) in the
  service env. `next.config.ts` pins `turbopack.root` to the monorepo root.

---

## 5. File map

```
app/                         # routes (server components; call client.ts)
  page.tsx                   # Overview dashboard (+ health KPI row, shadow org chart)
  graph/page.tsx             # Communication graph (scope/topic filters)
  automations/page.tsx       # Duvo opportunities table
  routing/page.tsx           # Persona-pair routes + live feed
  resilience/page.tsx        # Risk & Resilience — key-person risk, SPOFs, offboarding decay
  knowledge/page.tsx         # Knowledge & Q&A — open questions, expertise, recurring Qs
  pulse/page.tsx             # Org Pulse — sentiment, overload, silo matrix, recognition
lib/api/
  client.ts                  # ⭐ only data entrypoint (source toggle)
  db.ts                      # live Neon → contract (real + ⚠️ derived bits)
  mock.ts                    # deterministic fallback
  types.ts                   # the contract — keep stable
lib/db/
  index.ts, schema.ts        # Drizzle client + table defs (see TODO 4)
components/                  # UI (graph/, charts/, dashboard/, routing/, automations/,
                             #     resilience/, knowledge/, pulse/, shared/)
.cursor/skills/shadcn-minimal-ui/SKILL.md   # the UI design system + conventions
```

---

## 6. New insight surfaces (demo-grade — added for ideation)

Three pages were added to scope out what the full-Slack dataset can surface beyond
routing. They follow the same `client.ts → db.ts/mock.ts` contract; most metrics are
**computed live** from the Slack tables, a few are **synthesized** (see the table in §3).

- **Resilience** (`/resilience`) — key-person risk (betweenness × sole knowledge
  ownership), single points of failure, knowledge concentration per channel, and
  **offboarding decay** (mentions/usergroups still pointing at deactivated users).
- **Knowledge & Q&A** (`/knowledge`) — open/slow/DM-only questions, the de-facto
  experts answering them, and recurring-question clusters with an **Automate → Duvo**
  CTA (bridges routing → automation).
- **Org Pulse** (`/pulse`) — team sentiment over time, overload/burnout watch,
  dept×dept silo matrix, recognition flow.
- **Overview** gained a health-KPI row (cross-linking to the above) and a **shadow
  org chart** (real influence rank vs. formal title rank).

**To make real later:** `getSentiment()` is a deterministic synthetic walk — replace
with an LLM tone pass (backend job → table, same pattern as the automation miner in
TODO 1). `getOpenQuestions()`/`getRecurringQuestions()` use text heuristics that an
LLM/embedding pass would sharpen. Everything else is computed from live data.

> **Fix note:** `components/charts/DateRangePicker.tsx` (the activity period picker)
> was missing from the repo and broke `pnpm build` (imported by `TimelineChart`). It
> was recreated to match the expected props/`RangePreset` contract.
