/**
 * Slack data access for the analysis worker.
 * Uses the `slack.*` PostgreSQL schema (installed via `pnpm db:api`).
 * Requires DATABASE_URL.
 */
import {
  slackUsersList,
  slackConversationsList,
  slackConversationsHistory,
  slackConversationsReplies,
  type SlackApiMessage,
} from "@unslacked/db";

export interface SlackUser {
  id: string;
  name: string;
  realName: string;
  title: string | null;
  department: string | null;
}

export interface SlackConversation {
  id: string;
  name: string;
  kind: "channel" | "dm" | "group_dm";
}

export interface SlackMessage {
  id: string;        // message id e.g. "M_001" — pass to readThread
  ts: string;
  userId: string;
  userName: string;
  text: string;
  threadTs: string | null;
  channelId: string;
  replyCount: number; // > 0 means this message has thread replies worth reading
}

export async function fetchUsers(): Promise<SlackUser[]> {
  const members = await slackUsersList();
  return members
    .filter((u) => !u.is_bot)
    .map((u) => ({
      id: u.id,
      name: u.name,
      realName: u.real_name,
      title: u.profile.title,
      department: u.profile.department,
    }));
}

/** All non-archived conversations: channels, DMs, and group DMs. */
export async function fetchConversations(): Promise<SlackConversation[]> {
  const all = await slackConversationsList();
  return all
    .filter((c) => !c.is_archived)
    .map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.is_im ? "dm" : c.is_mpim ? "group_dm" : "channel",
    }));
}

function toSlackMessage(
  m: SlackApiMessage,
  channelId: string,
  userIndex: Map<string, string>,
): SlackMessage {
  return {
    id: m.id,
    ts: m.ts,
    userId: m.user,
    userName: userIndex.get(m.user) ?? m.user,
    text: m.text,
    threadTs: m.thread_ts ?? null,
    channelId,
    replyCount: m.reply_count ?? 0,
  };
}

/**
 * All top-level messages in a conversation (channels, DMs, group DMs).
 * For DMs these are the full sequential messages.
 * For channels, messages with replyCount > 0 have thread replies — call readThread on those.
 * Pass `since` to only return messages after that timestamp (incremental runs).
 */
export async function readConversation(
  conversationId: string,
  userIndex: Map<string, string>,
  since?: Date | null,
): Promise<SlackMessage[]> {
  const messages = await slackConversationsHistory(conversationId, since ?? null);
  return messages.map((m) => toSlackMessage(m, conversationId, userIndex));
}

/** Thread replies for a specific message (root + all replies). */
export async function readThread(
  channelId: string,
  rootMessageId: string,
  userIndex: Map<string, string>,
): Promise<SlackMessage[]> {
  const messages = await slackConversationsReplies(channelId, rootMessageId);
  return messages.map((m) => toSlackMessage(m, channelId, userIndex));
}
