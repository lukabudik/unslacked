import type Anthropic from "@anthropic-ai/sdk";
import {
  saveRoutingEvent,
  saveResponsibilityClaim,
  saveInefficiency,
} from "@unslacked/db";
import {
  fetchUsers,
  fetchConversations,
  readConversation,
  readThread,
  type SlackMessage,
} from "../slackClient.js";

// ─── Per-run context ──────────────────────────────────────────────────────────

let userIndex: Map<string, string> = new Map();
let conversationCache: Array<{ id: string; name: string; kind: string }> | null = null;
// Only fetch messages after this timestamp; null = full re-analysis
let since: Date | null = null;
// Track how many messages the agent has seen this run
export let messagesSeen = 0;

export async function buildContext(sinceDate: Date | null) {
  const users = await fetchUsers();
  userIndex = new Map(users.map((u) => [u.id, u.realName]));
  conversationCache = null;
  since = sinceDate;
  messagesSeen = 0;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "listConversations",
    description:
      "List all Slack conversations: public/private channels, DMs, and group DMs. " +
      "Returns [{id, name, kind}] where kind is 'channel' | 'dm' | 'group_dm'. " +
      "Call this first.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "readConversation",
    description:
      "Read all top-level messages in a conversation in chronological order. " +
      "Works for channels, DMs, and group DMs. " +
      "Each message includes replyCount — if > 0, call readThread on that message to get the full thread. " +
      "For DMs and group DMs, these messages ARE the full conversation.",
    input_schema: {
      type: "object" as const,
      properties: {
        conversationId: { type: "string", description: "Channel or DM id, e.g. C_ENGINEERING or D_ALICE_BOB" },
      },
      required: ["conversationId"],
    },
  },
  {
    name: "readThread",
    description:
      "Read all messages in a thread (root + replies). Only useful when a message has replyCount > 0. " +
      "Returns messages in chronological order.",
    input_schema: {
      type: "object" as const,
      properties: {
        conversationId: { type: "string" },
        rootMessageId: { type: "string", description: "The id of the root message (from readConversation)" },
      },
      required: ["conversationId", "rootMessageId"],
    },
  },
  {
    name: "saveTopicMention",
    description:
      "Save an implicit ownership signal: a user answered a topic question authoritatively. Use confidence ~0.75.",
    input_schema: {
      type: "object" as const,
      properties: {
        userId: { type: "string" },
        topic: { type: "string", description: "Short label, e.g. 'billing', 'deploys'" },
        keywords: { type: "string", description: "Comma-separated, e.g. 'billing,invoices,pricing'" },
        messageId: { type: "string" },
        confidence: { type: "number" },
      },
      required: ["userId", "topic", "keywords"],
    },
  },
  {
    name: "saveResponsibilityClaim",
    description:
      "Save an explicit ownership claim: someone stated that a user owns a topic. Use confidence ~0.9.",
    input_schema: {
      type: "object" as const,
      properties: {
        userId: { type: "string", description: "The user claimed as owner" },
        topic: { type: "string" },
        claimText: { type: "string", description: "Verbatim quote" },
        keywords: { type: "string", description: "Comma-separated keywords" },
        messageId: { type: "string" },
        confidence: { type: "number" },
      },
      required: ["userId", "topic", "claimText"],
    },
  },
  {
    name: "saveHandoff",
    description:
      "Save a routing event: routerUser redirected askerUser to targetUser instead of answering. " +
      "Works the same whether the routing happened in a thread, a channel, or a DM.",
    input_schema: {
      type: "object" as const,
      properties: {
        routerUserId: { type: "string" },
        targetUserId: { type: "string" },
        askerUserId: { type: "string" },
        channelId: { type: "string" },
        messageId: { type: "string" },
        topic: { type: "string" },
        confidence: { type: "number" },
        explanation: { type: "string" },
      },
      required: ["routerUserId", "targetUserId"],
    },
  },
  {
    name: "saveInefficiency",
    description:
      "Save a detected anti-pattern: viaUser repeatedly routes questions about a topic to toUser instead of answering. " +
      "Only call when you saw 2+ repeated handoffs (across channels, threads, or DMs).",
    input_schema: {
      type: "object" as const,
      properties: {
        viaUserId: { type: "string" },
        toUserId: { type: "string" },
        fromUserId: { type: "string" },
        topic: { type: "string" },
        evidence: { type: "string", description: 'JSON array of message IDs, e.g. ["M_001","M_002"]' },
        suggestionText: { type: "string", description: "e.g. 'Ask @carol about billing directly instead of @bob'" },
      },
      required: ["viaUserId", "toUserId", "topic", "evidence", "suggestionText"],
    },
  },
];

// ─── Input types ──────────────────────────────────────────────────────────────

interface ReadConversationInput { conversationId: string }
interface ReadThreadInput { conversationId: string; rootMessageId: string }
interface SaveTopicMentionInput { userId: string; topic: string; keywords: string; messageId?: string; confidence?: number }
interface SaveResponsibilityClaimInput { userId: string; topic: string; claimText: string; keywords?: string; messageId?: string; confidence?: number }
interface SaveHandoffInput { routerUserId: string; targetUserId: string; askerUserId?: string; channelId?: string; messageId?: string; topic?: string; confidence?: number; explanation?: string }
interface SaveInefficiencyInput { viaUserId: string; toUserId: string; fromUserId?: string; topic: string; evidence: string; suggestionText: string }

// ─── Tool handlers ────────────────────────────────────────────────────────────

export async function handleTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "listConversations": {
      if (conversationCache) return JSON.stringify(conversationCache);
      conversationCache = await fetchConversations();
      return JSON.stringify(conversationCache);
    }

    case "readConversation": {
      const { conversationId } = input as unknown as ReadConversationInput;
      const messages = await readConversation(conversationId, userIndex, since);
      messagesSeen += messages.length;
      return JSON.stringify(
        messages.map((m: SlackMessage) => ({
          id: m.id,
          userId: m.userId,
          userName: m.userName,
          text: m.text,
          ts: m.ts,
          replyCount: m.replyCount,
        })),
      );
    }

    case "readThread": {
      const { conversationId, rootMessageId } = input as unknown as ReadThreadInput;
      const messages = await readThread(conversationId, rootMessageId, userIndex);
      return JSON.stringify(
        messages.map((m: SlackMessage) => ({
          id: m.id,
          userId: m.userId,
          userName: m.userName,
          text: m.text,
          ts: m.ts,
          isRoot: m.id === rootMessageId,
        })),
      );
    }

    case "saveTopicMention": {
      const i = input as unknown as SaveTopicMentionInput;
      await saveResponsibilityClaim({
        id: crypto.randomUUID(),
        userId: i.userId,
        topic: i.topic,
        keywords: i.keywords,
        claimText: null,
        messageId: i.messageId ?? null,
        confidence: i.confidence ?? 0.75,
      });
      return JSON.stringify({ ok: true });
    }

    case "saveResponsibilityClaim": {
      const i = input as unknown as SaveResponsibilityClaimInput;
      await saveResponsibilityClaim({
        id: crypto.randomUUID(),
        userId: i.userId,
        topic: i.topic,
        keywords: i.keywords ?? i.topic,
        claimText: i.claimText,
        messageId: i.messageId ?? null,
        confidence: i.confidence ?? 0.9,
      });
      return JSON.stringify({ ok: true });
    }

    case "saveHandoff": {
      const i = input as unknown as SaveHandoffInput;
      await saveRoutingEvent({
        id: crypto.randomUUID(),
        routerUserId: i.routerUserId,
        targetUserId: i.targetUserId,
        askerUserId: i.askerUserId ?? null,
        channelId: i.channelId ?? null,
        messageId: i.messageId ?? null,
        topic: i.topic ?? null,
        confidence: i.confidence ?? 0.8,
        explanation: i.explanation ?? null,
      });
      return JSON.stringify({ ok: true });
    }

    case "saveInefficiency": {
      const i = input as unknown as SaveInefficiencyInput;
      await saveInefficiency({
        id: crypto.randomUUID(),
        viaUserId: i.viaUserId,
        toUserId: i.toUserId,
        fromUserId: i.fromUserId ?? null,
        topic: i.topic,
        evidence: i.evidence,
        suggestionText: i.suggestionText,
      });
      return JSON.stringify({ ok: true });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
