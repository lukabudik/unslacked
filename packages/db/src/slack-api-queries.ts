/**
 * Typed wrappers around the `slack.*` PostgreSQL schema.
 *
 * The Slack SQL API (installed via `pnpm db:api`) mirrors the Slack Web API
 * surface. Use these functions instead of the HTTP endpoints or raw Drizzle
 * selects — they return Slack-shaped JSON, handle joins internally, and include
 * message `id` fields so threads can be fetched by ID.
 *
 * All functions throw when DATABASE_URL is not configured.
 */
import { sql } from "./client";

function requireSql() {
  if (!sql) throw new Error("DATABASE_URL is required to call the Slack SQL API");
  return sql;
}

// ─── Slack API shapes ─────────────────────────────────────────────────────────

export interface SlackApiProfile {
  real_name: string;
  display_name: string;
  email: string | null;
  title: string | null;
  department: string | null;
  avatar_color: string;
  status_emoji: string | null;
  status_text: string | null;
}

export interface SlackApiUser {
  id: string;
  name: string;
  real_name: string;
  is_bot: boolean;
  tz: string | null;
  profile: SlackApiProfile;
}

export interface SlackApiChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_archived: boolean;
  topic: { value: string };
  num_members: number;
  members: string[];
}

export interface SlackApiMessage {
  type: string;
  id: string;       // internal message id, e.g. "M_001" — use this for thread lookups
  ts: string;       // ISO timestamp string
  user: string;     // user id
  text: string;
  thread_ts?: string | null;
  reply_count?: number;
  reactions?: Array<{ name: string; count: number; users: string[] }>;
}

// ─── Wrappers ─────────────────────────────────────────────────────────────────

export async function slackUsersList(): Promise<SlackApiUser[]> {
  const s = requireSql();
  const [row] = await s`SELECT slack.users_list() AS data`;
  const payload = row.data as { ok: boolean; members: SlackApiUser[] };
  return payload.members ?? [];
}

export async function slackChannelsList(): Promise<SlackApiChannel[]> {
  const s = requireSql();
  const [row] = await s`SELECT slack.channels_list() AS data`;
  const payload = row.data as { ok: boolean; channels: SlackApiChannel[] };
  return payload.channels ?? [];
}

/** All conversations: public/private channels + DMs + group DMs. */
export async function slackConversationsList(): Promise<SlackApiChannel[]> {
  const s = requireSql();
  const [row] = await s`SELECT slack.conversations_list() AS data`;
  const payload = row.data as { ok: boolean; channels: SlackApiChannel[] };
  return payload.channels ?? [];
}

/**
 * Top-level messages in a channel (no thread replies).
 * Each message includes `id`, `reply_count`, and `reactions`.
 * Pass `oldest` to fetch only messages after that timestamp (for incremental runs).
 */
export async function slackConversationsHistory(
  channelId: string,
  oldest?: Date | null,
): Promise<SlackApiMessage[]> {
  const s = requireSql();
  const [row] = oldest
    ? await s`SELECT slack.conversations_history(${channelId}, ${oldest}) AS data`
    : await s`SELECT slack.conversations_history(${channelId}) AS data`;
  const payload = row.data as { ok: boolean; messages: SlackApiMessage[] };
  return payload.messages ?? [];
}

/**
 * All messages in a thread (root + replies).
 * Pass the root message's `id` (e.g. "M_001") as `threadId`.
 */
export async function slackConversationsReplies(
  channelId: string,
  threadId: string,
): Promise<SlackApiMessage[]> {
  const s = requireSql();
  const [row] = await s`SELECT slack.conversations_replies(${channelId}, ${threadId}) AS data`;
  const payload = row.data as { ok: boolean; messages: SlackApiMessage[] };
  return payload.messages ?? [];
}
