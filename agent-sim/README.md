# unslacked-agent-sim 🧪

A side-research project: a **living Slack workspace simulated by autonomous Claude
Agent-SDK agents**. Each agent is a persona (name, team, what they own) with tools
to view channels, read messages, check who tagged them, and post / DM — and they
talk to each other on a clock. We **watch them interact live** in a web UI.

Separate from the main project on purpose. Built on `@anthropic-ai/claude-agent-sdk`
(verified working here: agents run with custom in-process tools, reading
`ANTHROPIC_API_KEY` from `.env`).

The research question: do realistic behaviors (routing, hand-offs, recurring
relationships, emergent "who owns what") arise **organically**, without scripting?

## Architecture

```
src/
  world.ts         in-memory workspace: users, channels, messages, DMs, mentions;
                   an EventEmitter that fires on every change (drives the UI)
  org.ts           build/cache a ~100-person company (teams, ownership, channels,
                   personas) → out/org.json   (LLM-fleshed, re-runnable)
  tools.ts         per-agent custom tool surface (an SDK MCP server) over the world
  agent.ts         one agent turn: query() with the persona system prompt + tools
  orchestrator.ts  the clock: ticks, wakes agents (mentioned/DM'd + some initiators),
                   runs turns concurrently (capped), emits events
  server.ts        http + ws: serves the UI, broadcasts world events, start/stop/status
  main.ts          CLI: --agents N --ticks T --concurrency C, boots sim + server
ui/                Vite + React live viewer (connects to the ws)
```

## Tool surface (each agent gets these, bound to its own user id)

| Tool | Does |
|------|------|
| `list_channels` | channels the agent is a member of (+ unread counts) |
| `read_channel(channelId, limit?)` | recent messages in a channel |
| `check_notifications` | messages that @-mention me or DMs to me since I last checked |
| `post_message(channelId, text)` | post to a channel (text may use `@handle`/`<#channel>`) |
| `send_dm(userId, text)` | open/My DM with a user and post |

Mentions in text use `@handle`; the world resolves them to user ids for
notifications. Every tool call mutates the world and emits an event.

## WS event protocol (server → UI)

```ts
{ t: "init",   users: User[], channels: Channel[], config: {...} }
{ t: "message", message: { id, channelId, userId, ts, text, threadTs? } }
{ t: "channel", channel: { id, name, kind, members: string[] } }   // new DM created
{ t: "agent",   userId, status: "thinking" | "acting" | "idle", note?: string }
{ t: "tick",    n: number, simClock: string }
{ t: "done" }
```
`User = { id, handle, realName, title, team, avatarColor }`
`Channel = { id, name, kind: "channel"|"dm", members: string[] }`

## org.json format
```ts
{
  users:    { id, handle, realName, title, team, department, avatarColor, persona }[],
  channels: { id, name, kind, members: string[] }[]   // kind: "channel" | "dm"
}
```
`persona` = a rich sentence or two: who they are, what they OWN, who they route
elsewhere, and a voice/quirk. This is what makes routing emerge.

## Run

```bash
cp ../packages/datagen/.env .env     # ANTHROPIC_API_KEY
npm install
npm run org                          # generate the ~100-person company (cached)
npm run sim -- --agents 12 --ticks 6 # start sim + ws server (watch UI separately)
# in another shell:
npm run ui                           # the live viewer
```

> ⚠️ Research toy. 100 agents × many ticks = real API spend; start small.
