/**
 * Shared read/write query layer over the Slack data. Reads from Neon when
 * DATABASE_URL is set, otherwise serves the in-memory fixtures so consumers run
 * with zero setup. Returns plain JS shapes; callers wrap into Slack envelopes.
 *
 * Lives in @unslacked/db so every service (slack-mock, admin) shares it.
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "./client";
import {
  users as usersTable,
  channels as channelsTable,
  channelMembers,
  messages as messagesTable,
  mentions as mentionsTable,
  reactions as reactionsTable,
} from "./schema";
import * as fx from "./fixtures";
import { parseMentions } from "./mentions";

export interface StoreUser {
  id: string;
  name: string;
  realName: string;
  email: string | null;
  title: string | null;
  department: string | null;
  avatarColor: string;
  statusEmoji: string | null;
  statusText: string | null;
  timezone: string | null;
  isBot: boolean;
}

export interface StoreChannel {
  id: string;
  name: string;
  kind: string;
  topic: string | null;
  isArchived: boolean;
  members: string[];
}

export interface StoreMessage {
  id: string;
  channelId: string;
  userId: string;
  text: string;
  threadTs: string | null;
  ts: string; // ISO string
}

// --- fixture base time: deterministic, no Date.now() ---
const BASE_MS = Date.UTC(2026, 5, 2, 8, 30, 0); // 2026-06-02 08:30 UTC
const fxTs = (minute: number) => new Date(BASE_MS + minute * 60_000).toISOString();

export async function listUsers(): Promise<StoreUser[]> {
  if (db) {
    const rows = await db.select().from(usersTable).orderBy(asc(usersTable.realName));
    return rows.map((u) => ({ ...u, email: u.email, isBot: u.isBot }));
  }
  return fx.users.map((u) => ({
    id: u.id,
    name: u.name,
    realName: u.realName,
    email: u.email || null,
    title: u.title,
    department: u.department,
    avatarColor: u.avatarColor,
    statusEmoji: u.statusEmoji ?? null,
    statusText: u.statusText ?? null,
    timezone: u.timezone ?? null,
    isBot: Boolean(u.isBot),
  }));
}

export async function listChannels(): Promise<StoreChannel[]> {
  if (db) {
    const chans = await db.select().from(channelsTable);
    const mems = await db.select().from(channelMembers);
    return chans.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      topic: c.topic,
      isArchived: c.isArchived,
      members: mems.filter((m) => m.channelId === c.id).map((m) => m.userId),
    }));
  }
  return fx.channels.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    topic: c.topic ?? null,
    isArchived: Boolean(c.isArchived),
    members: c.members,
  }));
}

export async function getHistory(channelId: string): Promise<StoreMessage[]> {
  if (db) {
    const rows = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.channelId, channelId))
      .orderBy(asc(messagesTable.ts));
    return rows.map((m) => ({
      id: m.id,
      channelId: m.channelId,
      userId: m.userId,
      text: m.text,
      threadTs: m.threadTs,
      ts: m.ts.toISOString(),
    }));
  }
  return fx.messages
    .filter((m) => m.channelId === channelId)
    .sort((a, b) => a.minute - b.minute)
    .map((m) => ({
      id: m.id,
      channelId: m.channelId,
      userId: m.userId,
      text: m.text,
      threadTs: m.threadTs ?? null,
      ts: fxTs(m.minute),
    }));
}

export async function getReplies(threadTs: string): Promise<StoreMessage[]> {
  const all = db
    ? (await db.select().from(messagesTable)).map((m) => ({
        id: m.id,
        channelId: m.channelId,
        userId: m.userId,
        text: m.text,
        threadTs: m.threadTs,
        ts: m.ts.toISOString(),
      }))
    : fx.messages.map((m) => ({
        id: m.id,
        channelId: m.channelId,
        userId: m.userId,
        text: m.text,
        threadTs: m.threadTs ?? null,
        ts: fxTs(m.minute),
      }));
  return all
    .filter((m) => m.id === threadTs || m.threadTs === threadTs)
    .sort((a, b) => a.ts.localeCompare(b.ts));
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  userIds: string[];
}

/**
 * Reactions for every message in a channel, grouped by (message, emoji).
 * Returns `{ [messageId]: ReactionGroup[] }`. Empty when there are none.
 */
export async function getReactions(channelId: string): Promise<Record<string, ReactionGroup[]>> {
  const msgIds = new Set((await getHistory(channelId)).map((m) => m.id));

  const rows = db
    ? (await db.select().from(reactionsTable)).map((r) => ({
        messageId: r.messageId,
        userId: r.userId,
        emoji: r.emoji,
      }))
    : fx.reactions.map((r) => ({ messageId: r.messageId, userId: r.userId, emoji: r.emoji }));

  const byMessage: Record<string, ReactionGroup[]> = {};
  for (const r of rows) {
    if (!msgIds.has(r.messageId)) continue;
    const groups = (byMessage[r.messageId] ??= []);
    const existing = groups.find((g) => g.emoji === r.emoji);
    if (existing) {
      existing.count += 1;
      existing.userIds.push(r.userId);
    } else {
      groups.push({ emoji: r.emoji, count: 1, userIds: [r.userId] });
    }
  }
  return byMessage;
}

// ---------------------------------------------------------------------------
// Writes. These mutate Neon when configured; otherwise they mutate the
// in-memory fixtures (works within a single running process, resets on reload).
// Runtime writes use real wall-clock time — the no-Date determinism rule only
// applies to the seed fixtures.
// ---------------------------------------------------------------------------

let memSeq = 0;
function newId(prefix: string): string {
  memSeq += 1;
  // crypto.randomUUID is available in the Node/Next server runtime.
  const rand = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${memSeq}`;
  return `${prefix}_${rand}`;
}

export async function addMessage(input: {
  channelId: string;
  userId: string;
  text: string;
  threadTs?: string | null;
}): Promise<StoreMessage> {
  const id = newId("M");
  const now = new Date();
  const mentionIds = parseMentions(input.text);

  if (db) {
    await db.insert(messagesTable).values({
      id,
      channelId: input.channelId,
      userId: input.userId,
      text: input.text,
      threadTs: input.threadTs ?? null,
      ts: now,
    });
    if (mentionIds.length) {
      await db
        .insert(mentionsTable)
        .values(mentionIds.map((uid) => ({ id: `${id}:${uid}`, messageId: id, mentionedUserId: uid })));
    }
  } else {
    const maxMinute = fx.messages.reduce((mx, m) => Math.max(mx, m.minute), 0);
    fx.messages.push({
      id,
      channelId: input.channelId,
      userId: input.userId,
      text: input.text,
      threadTs: input.threadTs ?? undefined,
      minute: maxMinute + 1,
    });
  }

  return {
    id,
    channelId: input.channelId,
    userId: input.userId,
    text: input.text,
    threadTs: input.threadTs ?? null,
    ts: now.toISOString(),
  };
}

/** Add a reaction; idempotent on (message, user, emoji). */
export async function addReaction(messageId: string, userId: string, emoji: string): Promise<void> {
  if (db) {
    await db.insert(reactionsTable).values({ messageId, userId, emoji }).onConflictDoNothing();
  } else if (!fx.reactions.some((r) => r.messageId === messageId && r.userId === userId && r.emoji === emoji)) {
    fx.reactions.push({ messageId, userId, emoji });
  }
}

export async function removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
  if (db) {
    await db
      .delete(reactionsTable)
      .where(
        and(
          eq(reactionsTable.messageId, messageId),
          eq(reactionsTable.userId, userId),
          eq(reactionsTable.emoji, emoji),
        ),
      );
  } else {
    const i = fx.reactions.findIndex(
      (r) => r.messageId === messageId && r.userId === userId && r.emoji === emoji,
    );
    if (i >= 0) fx.reactions.splice(i, 1);
  }
}

/** Add the reaction if absent, remove it if the user already reacted. */
export async function toggleReaction(messageId: string, userId: string, emoji: string): Promise<"added" | "removed"> {
  let exists: boolean;
  if (db) {
    const rows = await db
      .select()
      .from(reactionsTable)
      .where(
        and(
          eq(reactionsTable.messageId, messageId),
          eq(reactionsTable.userId, userId),
          eq(reactionsTable.emoji, emoji),
        ),
      );
    exists = rows.length > 0;
  } else {
    exists = fx.reactions.some((r) => r.messageId === messageId && r.userId === userId && r.emoji === emoji);
  }

  if (exists) {
    await removeReaction(messageId, userId, emoji);
    return "removed";
  }
  await addReaction(messageId, userId, emoji);
  return "added";
}
