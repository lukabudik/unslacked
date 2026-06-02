import { query } from "@anthropic-ai/claude-agent-sdk";
import type { World, User } from "./world.js";
import { buildAgentServer, SLACK_TOOL_NAMES } from "./tools.js";

const TURN_MODEL = "claude-haiku-4-5-20251001";

/**
 * A compact who-owns-what directory the agent uses to ROUTE.
 * One line per team: a representative person + what the team owns.
 */
export function buildDirectory(world: World): string {
  const byTeam = new Map<string, User[]>();
  for (const u of world.users.values()) {
    if (!byTeam.has(u.team)) byTeam.set(u.team, []);
    byTeam.get(u.team)!.push(u);
  }
  const lines: string[] = [];
  for (const [team, members] of byTeam) {
    const dept = members[0]?.department ?? "";
    // pick a lead-ish contact (title contains lead/head/manager/director/chief) else first
    const lead =
      members.find((m) => /lead|head|manager|director|chief|vp|ceo|cto|coo/i.test(m.title)) ??
      members[0];
    const handles = members.map((m) => `@${m.handle}`).slice(0, 4).join(", ");
    lines.push(`- ${team} (${dept}) — primary contact @${lead.handle} (${lead.title}); people: ${handles}`);
  }
  return lines.join("\n");
}

function systemPromptFor(self: User, directory: string): string {
  return `You are ${self.realName} (@${self.handle}), ${self.title} on the ${self.team} team at Nimbus, a last-mile logistics startup.

WHO YOU ARE:
${self.persona ?? `You own work on the ${self.team} team.`}

HOW YOU OPERATE ON SLACK:
- You answer things that are YOURS. For anything outside your area, you DON'T try to solve it — you route it by @-mentioning the right person or posting in the right team's channel.
- Use this company directory to route. Don't invent people; only @-mention handles that appear here.
- Keep messages short, Slack-casual, lowercase-ish, no email formalities. One or two sentences. Emoji sparingly if it fits your voice.
- Mention people with @handle so they get notified. Reference channels by name when routing.
- Don't narrate what you're about to do — just do it with the tools.

COMPANY DIRECTORY (who owns what):
${directory}`;
}

export interface RunTurnResult {
  userId: string;
  toolCalls: number;
  ok: boolean;
}

/**
 * Run a single agent turn: catch up, then act as themselves.
 * Emits agent thinking/acting/idle status around the turn.
 */
export async function runTurn(
  world: World,
  self: User,
  directory: string,
  simClock: string,
  opts: { initiate?: boolean } = {},
): Promise<RunTurnResult> {
  const server = buildAgentServer(world, self.id);
  world.emitAgent(self.id, "thinking", "catching up");

  const turnPrompt = opts.initiate
    ? `It's ${simClock}. You haven't been pinged, but it's a normal workday — proactively do something real on Slack. Pick ONE: ask another team a concrete question you'd genuinely have given your role (route it to the right person/channel with an @mention), flag a blocker, follow up on something, or post a short status update in one of your channels. You MUST post at least one message this turn. Check a channel first if you want context. Keep it short and Slack-casual.`
    : `It's ${simClock}. You have unread mentions/DMs. Read them (check_notifications, read the channel), then respond as yourself: answer what's yours, and route anything outside your area to the right person with an @mention. Post at least one reply. Keep it short and Slack-casual.`;

  let toolCalls = 0;
  let ok = true;
  try {
    for await (const m of query({
      prompt: turnPrompt,
      options: {
        mcpServers: { slack: server },
        allowedTools: SLACK_TOOL_NAMES,
        maxTurns: 8,
        model: TURN_MODEL,
        systemPrompt: systemPromptFor(self, directory),
      },
    })) {
      if (m.type === "assistant") {
        for (const block of m.message.content) {
          if (typeof block === "object" && block !== null && (block as any).type === "tool_use") {
            toolCalls++;
            const name = (block as any).name as string;
            if (name?.includes("post_message") || name?.includes("send_dm")) {
              world.emitAgent(self.id, "acting", "posting");
            }
          }
        }
      }
      if (m.type === "result") {
        ok = m.subtype === "success";
      }
    }
  } catch (e) {
    ok = false;
    console.warn(`[agent] ${self.handle} turn error:`, (e as Error).message);
  } finally {
    world.emitAgent(self.id, "idle");
  }
  return { userId: self.id, toolCalls, ok };
}
