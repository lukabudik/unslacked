# @unslacked/demo — the pitch video

A ~90-second cinematic pitch video for unslacked, built with [Remotion](https://remotion.dev).
Every number, name, and message in it is pulled from the **real** datagen output
(`packages/datagen/out/*.json`) — nothing is faked.

## Quick start

```bash
pnpm --filter @unslacked/demo install   # once
pnpm --filter @unslacked/demo data      # rebuild src/data/demo-data.json from datagen out/
pnpm --filter @unslacked/demo vo        # (re)generate the voiceover with ElevenLabs
pnpm --filter @unslacked/demo studio    # open Remotion Studio to scrub/preview
pnpm --filter @unslacked/demo render    # render out/unslacked.mp4 (1920x1080, 30fps)
```

`render` re-runs the data build first, so the video always reflects the latest dataset.
It does **not** regenerate the voiceover (that costs ElevenLabs credits) — run `vo` explicitly.

## Voiceover

`scripts/build-vo.mjs` generates one narration clip per scene with ElevenLabs
(voice: *Eric — Smooth, Trustworthy*; override with `VO_VOICE_ID=...`). It uses the
`/with-timestamps` endpoint to get each clip's exact spoken length and writes
`src/data/vo-manifest.json`. **The whole timeline is then sized from that manifest**
(`src/lib/theme.ts`): each scene = lead-in + narration + a tail beat. Re-record the VO and
the video re-times itself — total runtime is currently ~90s.

- Clips render to `public/vo/*.mp3` (gitignored) and are muxed in via `<Audio>` in `src/Video.tsx`.
- API key: `services/demo/.env.local` (gitignored) — `ELEVENLABS_API_KEY=...`.
- The ElevenLabs MCP is also registered in Claude Code (local scope) for interactive use.
- Edit the narration lines in `scripts/build-vo.mjs` (`LINES`).

## The story (11 scenes, ~90s, voiceover-paced)

| # | Scene | Beat | File |
|---|---|---|---|
| 1 | Hook | "Who actually runs your company? Not who's on the org chart." | `scenes/Hook.tsx` |
| 2 | World | A real, living Slack (7,866 msgs, 104 people, 6 weeks). | `scenes/World.tsx` |
| 3 | Trace | One real question bounces through 5 "not my lane" hand-offs. **The core.** | `scenes/Trace.tsx` |
| 4 | Multiply | "Not one bad thread" — 400 chains, 126 invisible DMs, 82 four-hop. | `scenes/Multiply.tsx` |
| 5 | Reveal | Chaos snaps into the **shadow org chart**; red routers light up. **Money shot.** | `scenes/Reveal.tsx` |
| 6 | Dashboard | **Real** admin Overview (screenshot from localhost:3000), slow pan. | `scenes/Dashboard.tsx` |
| 7 | Automations | **Real** /automations screen — auto-drafts Duvo AI briefs. | `scenes/Automations.tsx` |
| 8 | Assistant | In-Slack: agent reroutes a misdirected DM (1-click) + an ask-anytime bot. | `scenes/Assistant.tsx` |
| 9 | Fix | The 5-hop chain collapses to one message; a routing rule materializes. | `scenes/Fix.tsx` |
| 10 | Build | Hackathon "how we built it" — Slack mock → 100 agents → engine → dashboard. | `scenes/Build.tsx` |
| 11 | Close | "unslacked — See who really runs your company." | `scenes/Close.tsx` |

Timeline and crossfade durations live in `src/lib/theme.ts` (`scenes`, `TRANSITION`).
Scenes are stitched with crossfades in `src/Video.tsx`.

### Real admin screenshots
Scenes 6 & 7 use real captures in `public/admin/` (`admin-overview.png`, `admin-automations.png`)
taken from the running admin at `localhost:3000`. To refresh: run the admin, then re-screenshot
full-page at 1920-wide and overwrite those files.

## Where the data comes from

`scripts/build-data.mjs` reads `packages/datagen/out/{org,truth,transcript}.json` and emits
`src/data/demo-data.json` — a small, curated slice:

- **headline stats** (people, messages, chains, 126 DM hand-offs, 82 four-hop chains…)
- **leaderboards**: top routers (who forwards most) and bottlenecks (who's routed-to most),
  computed from the labelled hops in `truth.json`
- **hero chain**: the deepest, most relatable chain, fully resolved to real names + real
  message text (currently the 5-hop accessibility deflection in `#design`)
- **graph**: 104 nodes laid out in deterministic team clusters with routers pulled to centre,
  plus aggregated routing edges
- **chaos**: a spread of real channel messages for the Slack scroll

To re-pick the hero chain or tune the graph, edit `build-data.mjs` and re-run `pnpm … data`.

## Design system

- `src/lib/theme.ts` — brand colours, Slack-mock palette, admin palette, timeline
- `src/lib/fonts.ts` — Inter + JetBrains Mono (latin-ext for Czech names)
- `src/lib/anim.ts` — `enter`, `pop`, `countUp` helpers
- `src/components/` — `SlackMock` (chrome + message row), `Avatar`, `RichText` (mention styling),
  `Background` (cinematic backdrop)

The Slack and admin chrome are **recreated** in Remotion (styled to match the real apps) so the
video renders anywhere without a live DB. To swap in real screen recordings later, drop captures
into `public/` and replace the `World`/`Dashboard` scene bodies with `<OffthreadVideo>`.

## Notes

- 16:9, 1920×1080, 30fps. For social cuts, add another `<Composition>` in `src/Root.tsx`.
- Render is CPU-bound; bump `--concurrency` on a bigger machine.
