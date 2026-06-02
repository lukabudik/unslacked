# Mock readiness — the unslacked Slack mock

> **Living doc — single source of truth.** This tracks how close the Slack mock is
> to being a believable **enterprise-client workspace** for the router-detection
> product, and how we get there. **Keep it updated whenever data, schema, or UI
> changes materially** (and bump _Last updated_ + add a Changelog line).

**Last updated:** 2026-06-02

---

## 1. What "ready" means

The mock has to be a convincing enterprise Slack workspace, **rich enough in
routing signal** that our product can extract a real who-routes-whom dependency
graph from it. Two consumers:

- **Backend (Tom)** reads Slack data via the `slack.*` SQL API (and HTTP). It
  must look like a real org's months of chatter, not a scripted afternoon.
- **Demo audience** sees the UI and should believe "this is our Slack."

Non-goal: we are **not** building analysis here (routing scores, graph) — that's
the backend. The mock only produces realistic Slack data.

---

## 2. Current state (snapshot)

| Metric | Value |
|---|---|
| Users | 31 (1 bot) |
| Channels | 18 (14 public, 4 private), 1 archived |
| DMs | 16 (11 im, 5 mpim) |
| Messages | 391 · 266 thread replies · 264 reactions |
| Time span | **2 days only** (2026-06-02 → 06-03) |
| Channel-mentions / broadcasts / edits | **0 / 0 / 0** |

Verdict: a great **demo slice**, but reads as "a small startup's busy afternoon,"
not an enterprise client. Gaps below.

---

## 3. Gap analysis (prioritized)

### Data (content)
| Gap | Why it matters | Priority |
|---|---|---|
| No temporal depth (2 days) | History/trends/"today" need weeks of spread | **P0** |
| Scale (31 people) | Reads as a startup; want ~100–150 ppl, 35–50 channels | **P0** |
| Routing only via `<@user>` | Real deflection also uses `#channel`, `@usergroup`, "ask the X team" | **P1** |
| No ambient noise (CI/deploy bots, alerts, standups, social) | Signal must be buried to be real | **P1** |
| No edits/deletes/pins | Enterprise chatter has them | **P2** |

### Data structure (schema)
| Gap | Why it matters | Priority |
|---|---|---|
| users: no `is_active`/`is_guest`/`is_admin` | Deactivated routers, guests, admins are real routing signal | **P0** |
| No `user_groups` (@data-team) | Usergroups are a primary routing *target* | **P1** |
| No `files`/attachments | Enterprise Slack is full of files | **P1** |
| `edited_at` unused; no soft-delete | Schema half-supports edits; no delete concept | **P2** |
| Org structure (manager/team/seniority) | Routers correlate with tenure/role | **P2** |
| Enterprise Grid (org→workspaces) | True enterprise topology — likely overkill, deferred | deferred |

### UI
| Gap | Priority |
|---|---|
| Search (Slack's signature feature) | **P0** |
| Unread state + user profile hover/panel | **P1** |
| Edit/delete message (write layer exists, UI doesn't expose) | **P1** |
| Real emoji picker + `@mention` autocomplete in composer | **P1** |
| Right sidebar: channel details / member list | **P1** |
| Pagination/load-more, file rendering, real presence, create-channel, ⌘K | **P2** |

---

## 4. Data generation strategy

**Decision: a structure-first, LLM-content Python generator** (`packages/datagen`,
Anthropic SDK + prompt caching). Not a swarm of free-form subagents.

Rationale — this is the core of the product, so it must be real, scalable,
repeatable, and (critically) **labeled**:

1. **Structure is script-owned (deterministic).** The generator builds the org
   (people, teams, seniority, timezones, active/guest/admin), channels +
   membership, usergroups, and a **timeline** spread over weeks. All ids,
   timestamps, and references are assigned by the script → perfect referential
   integrity (no dangling mentions/threads, which a subagent swarm can't
   guarantee).
2. **The routing graph is the planted ground truth.** The script *chooses* who
   the bottleneck routers are, the real owner of each topic, and the multi-hop
   chains — and records it as a hidden answer key (NOT exposed via the Slack
   API). This lets us **measure the detector** ("found 9/10 planted routers").
3. **Content is LLM-generated (realistic).** For each interaction (a routed
   question, a thread, a standup, an incident), Claude writes natural message
   text given the participants + intent + planted behavior, emitting proper
   `<@U_>` / `<#C_>` mentions. Prompt-cache the org/system context across calls;
   use the Batch API for volume/cost.
4. **Assembly + validate + load.** The script assembles messages/threads/
   reactions/mentions, validates integrity, inserts into Neon, and emits a
   committable snapshot for reproducibility (regenerate without re-paying the LLM).

Why not a subagent swarm: great for one-off bulk authoring (we used it), but it
can't guarantee cross-channel referential integrity, gives no ground-truth
labels, isn't re-runnable/tunable, and drifts in tone/format at scale.

---

## 5. Roadmap

- **Wave 1 — Foundation (data + schema together):** schema enrichment
  (`is_active`/`is_guest`/`is_admin`, `user_groups`, `files`), build the
  generator, produce ~100 users over ~6 weeks, reseed. _(in progress)_
- **Wave 2 — Routing-signal richness:** channel/usergroup mentions, "ask the X
  team" patterns, bot/CI noise, recurring askers.
- **Wave 3 — UI catch-up:** search → profiles/unread → edit-delete/emoji/mention
  autocomplete → right sidebar.

---

## 6. Changelog

- **2026-06-02** — Doc created. Mock at 31 users / 2-day window / 391 msgs.
  Chose the LLM-powered Python generator approach for data. Wave 1 starting.
