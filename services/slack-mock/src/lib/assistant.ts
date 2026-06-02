/**
 * The assistant brain. One LLM call that takes the user's message (plus, when
 * relevant, who they're about to send it to) and the WHOLE responsibility_claims
 * table (the backend's "who is responsible for what" extraction) as context, and
 * returns a structured routing decision.
 *
 * Used by both features:
 *   • DM the bot ("who handles billing?")           → askAssistant
 *   • any message you send (tagged or not)           → postAndCheckRouting
 *
 * Model + key via env (ANTHROPIC_API_KEY, optional ASSISTANT_MODEL). The big
 * claims table is prompt-cached so only the first call pays for it.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getResponsibilityContext } from "@unslacked/db";

const MODEL = process.env.ASSISTANT_MODEL || "claude-haiku-4-5-20251001";
const client = new Anthropic(); // reads ANTHROPIC_API_KEY

export type RouteStatus = "route" | "correct" | "unclear";

export interface RouteResult {
  status: RouteStatus;
  targetUserId?: string; // present when status === "route"
  message: string; // the assistant's reply (references people as <@U_ID>)
}

/** Kept for the existing UI/actions: the proactive-nudge verdict shape. */
export interface RoutingVerdict {
  misrouted: boolean;
  ownerId?: string;
  reason?: string;
}

const SYSTEM = `You are "Unslacked", a routing assistant for a company's Slack. \
Below is the company's RESPONSIBILITY CLAIMS table — evidence, extracted from real \
messages, of who is responsible for / knowledgeable about what (with topics, \
keywords, and the message that proves it). Use ONLY this table to decide.

Given the user's message (and, if provided, who they're about to send it to), call \
the "route" tool with one of:
- "correct": the message is already going to the right person (a recipient is \
  responsible for the topic), OR it's not a request that needs routing (a status \
  update, banter, an announcement). Keep "message" short and affirming/neutral.
- "route": someone ELSE is clearly the right owner. Set target_user_id to that \
  person's id and write a short "message" telling the user to talk to <@that_id> \
  and why (cite what they own). Reference people as <@USER_ID>.
- "unclear": you cannot confidently identify an owner from the table. Ask the user \
  to be a bit more specific in "message".

Rules: only use user ids that appear in the table. Be concise and Slack-casual. \
Don't invent owners. When unsure, prefer "unclear" over guessing. For plain \
statements that aren't asking for help, use "correct" (no need to route).`;

const ROUTE_TOOL: Anthropic.Tool = {
  name: "route",
  description: "Return the routing decision for the user's message.",
  input_schema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["route", "correct", "unclear"] },
      target_user_id: { type: "string", description: "user id to contact; only when status is 'route'" },
      message: { type: "string", description: "the assistant's reply to show the user; reference people as <@USER_ID>" },
    },
    required: ["status", "message"],
  },
};

// Build + cache the (large) claims context so the prompt string is stable
// (better cache hits) and we don't re-query Neon on every keystroke-send.
let ctxCache: { at: number; text: string } | null = null;
async function claimsContext(): Promise<string> {
  if (ctxCache && Date.now() - ctxCache.at < 60_000) return ctxCache.text;
  const claims = await getResponsibilityContext();
  const lines = claims.map(
    (c) =>
      `- <@${c.userId}> ${c.realName ?? ""}${c.title ? ` (${c.title})` : ""}${c.team ? ` [${c.team}]` : ""} | ` +
      `topic: ${c.topic ?? "?"} | keywords: ${c.keywords ?? ""} | evidence: ${(c.claimText ?? "").slice(0, 180)}`,
  );
  const text = `RESPONSIBILITY CLAIMS (${claims.length} entries):\n${lines.join("\n")}`;
  ctxCache = { at: Date.now(), text };
  return text;
}

export async function routeAssistant(input: {
  text: string;
  recipientIds?: string[];
}): Promise<RouteResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: "unclear", message: "Assistant isn't configured yet (missing ANTHROPIC_API_KEY)." };
  }

  const ctx = await claimsContext();
  const recipientLine =
    input.recipientIds && input.recipientIds.length
      ? `The user is about to send this to: ${input.recipientIds.map((id) => `<@${id}>`).join(", ")}.`
      : "The user is asking the assistant directly (no specific recipient yet).";

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: [
        { type: "text", text: SYSTEM },
        { type: "text", text: ctx, cache_control: { type: "ephemeral" } },
      ],
      tools: [ROUTE_TOOL],
      tool_choice: { type: "tool", name: "route" },
      messages: [{ role: "user", content: `${recipientLine}\n\nUser's message:\n"""${input.text}"""` }],
    });

    const tool = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const out = (tool?.input ?? {}) as { status?: string; target_user_id?: string; message?: string };
    const status: RouteStatus =
      out.status === "route" || out.status === "correct" || out.status === "unclear" ? out.status : "unclear";
    return {
      status,
      targetUserId: status === "route" ? out.target_user_id || undefined : undefined,
      message: out.message || "Sorry, I couldn't work that out — can you be more specific?",
    };
  } catch (e) {
    return { status: "unclear", message: "The assistant hit an error — try again in a moment." };
  }
}
