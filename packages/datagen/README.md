# @unslacked/datagen

Generates a realistic **enterprise Slack dataset** for `@unslacked/db` by running
**free-running persona agents** (cheap model, Haiku) that talk to each other —
routing emerges organically because each persona knows only their own area and
redirects everything else.

## How it works

1. **`blueprint.py`** — the hand-authored company skeleton ("Nimbus Logistics"):
   ~17 teams, what each **owns** (drives routing), channels, usergroups, and
   which roles are pinged-first **connectors**.
2. **`org.py`** — LLM-fleshes ~100 individuals (names, seniority, personality)
   onto the blueprint; assigns ids, status (active/guest/admin/deactivated),
   channel membership, usergroups. → `out/org.json`
3. **`personas.py`** — builds each person's system prompt: who they are, what
   they own, and the directory of who-owns-what-else (so they route).
4. **`simulate.py`** — scene-based free-running engine over a 6-week timeline.
   We script only the *cadence* (which channel, when, what kind of scene);
   personas generate every message. Routing chains (asker → connector → owner)
   emerge on their own. → `out/transcript.json`
5. **`load.py`** — wipes + loads everything into Neon.

The org we author is a **soft ground truth** (we know who's a broad connector vs.
a deep specialist), so the detector can be sanity-checked later — without ever
scripting an individual message.

## Run

```bash
python3 -m venv .venv && ./.venv/bin/pip install -e .
cp ../db/.env .env            # needs ANTHROPIC_API_KEY + DATABASE_URL

./.venv/bin/python generate.py --pilot          # tiny, no DB (validate)
./.venv/bin/python generate.py --pilot --load   # tiny, into Neon
./.venv/bin/python generate.py --weeks 6 --load # full run
```

Flags: `--weeks`, `--scenes-per-day`, `--dm-count`, `--concurrency`, `--seed`,
`--reuse-org` (skip org regen), `--load` (write to Neon).

Cost: Haiku + prompt caching → roughly **$10–20** for a full ~100-person /
6-week run. `out/` is gitignored (regenerate any time).

> After a run, set the UI viewer: the printed `VIEWER_ID` goes into
> `services/slack-mock/src/lib/viewer.ts`.
