/**
 * Shared read/write query layer over the Slack data. Reads from Neon when
 * DATABASE_URL is set, otherwise serves the in-memory fixtures so consumers run
 * with zero setup. Returns plain JS shapes; callers wrap into Slack envelopes.
 *
 * Lives in @unslacked/db so every service (slack-mock, admin) shares it.
 */
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
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
  team: string | null;
  avatarColor: string;
  statusEmoji: string | null;
  statusText: string | null;
  timezone: string | null;
  isBot: boolean;
  isActive: boolean;
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

/**
 * Tiny TTL cache for rarely-changing reference data (users, channels). Bounds
 * staleness to REF_TTL_MS and is safe because the mock's only writes touch
 * messages/reactions — never the users or channels tables. Saves a Neon HTTP
 * round trip (~100ms+ each) on every channel navigation.
 */
const REF_TTL_MS = 30_000;
const refCache = new Map<string, { at: number; val: Promise<unknown> }>();
function cachedRef<T>(key: string, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = refCache.get(key);
  if (hit && now - hit.at < REF_TTL_MS) return hit.val as Promise<T>;
  const val = load();
  refCache.set(key, { at: now, val });
  // Don't cache a rejected load — drop it so the next call retries.
  val.catch(() => {
    if (refCache.get(key)?.val === val) refCache.delete(key);
  });
  return val;
}

export function listUsers(): Promise<StoreUser[]> {
  return cachedRef("users", _listUsers);
}
async function _listUsers(): Promise<StoreUser[]> {
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
    team: u.team ?? null,
    avatarColor: u.avatarColor,
    statusEmoji: u.statusEmoji ?? null,
    statusText: u.statusText ?? null,
    timezone: u.timezone ?? null,
    isBot: Boolean(u.isBot),
    isActive: u.isActive ?? true,
  }));
}

export function listChannels(): Promise<StoreChannel[]> {
  return cachedRef("channels", _listChannels);
}
async function _listChannels(): Promise<StoreChannel[]> {
  if (db) {
    const [chans, mems] = await Promise.all([
      db.select().from(channelsTable),
      db.select().from(channelMembers),
    ]);
    const membersByChannel = new Map<string, string[]>();
    for (const m of mems) {
      const list = membersByChannel.get(m.channelId);
      if (list) list.push(m.userId);
      else membersByChannel.set(m.channelId, [m.userId]);
    }
    return chans.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      topic: c.topic,
      isArchived: c.isArchived,
      members: membersByChannel.get(c.id) ?? [],
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
  if (db) {
    // Parent + its replies only — uses messages_thread_idx / pk, not a full scan.
    const rows = await db
      .select()
      .from(messagesTable)
      .where(or(eq(messagesTable.id, threadTs), eq(messagesTable.threadTs, threadTs)))
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
    .filter((m) => m.id === threadTs || m.threadTs === threadTs)
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
  let rows: { messageId: string; userId: string; emoji: string }[];
  if (db) {
    // Single indexed query: join reactions to their messages and keep only this
    // channel's. Replaces the old "re-fetch history + scan the whole reactions
    // table in JS" path (two round trips + a full-table read).
    rows = await db
      .select({
        messageId: reactionsTable.messageId,
        userId: reactionsTable.userId,
        emoji: reactionsTable.emoji,
      })
      .from(reactionsTable)
      .innerJoin(messagesTable, eq(reactionsTable.messageId, messagesTable.id))
      .where(eq(messagesTable.channelId, channelId));
  } else {
    const msgIds = new Set(
      fx.messages.filter((m) => m.channelId === channelId).map((m) => m.id),
    );
    rows = fx.reactions.filter((r) => msgIds.has(r.messageId));
  }

  const byMessage: Record<string, ReactionGroup[]> = {};
  for (const r of rows) {
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

/**
 * Find-or-create a DM (im/mpim) for an exact member set. Deterministic id so
 * repeated calls return the same channel. Used for the assistant DM and for
 * auto-forwarding a message to the right person.
 */
export async function ensureDm(memberIds: string[]): Promise<string> {
  const ids = [...new Set(memberIds)].sort();
  const kind = (ids.length > 2 ? "mpim" : "im") as "im" | "mpim";
  const id = "D_DM_" + ids.map((x) => x.replace(/^U_/, "")).join("_").slice(0, 120);
  if (db) {
    await db.insert(channelsTable).values({ id, name: id, kind }).onConflictDoNothing();
    await db
      .insert(channelMembers)
      .values(ids.map((uid) => ({ channelId: id, userId: uid })))
      .onConflictDoNothing();
  } else if (!fx.channels.find((c) => c.id === id)) {
    fx.channels.push({ id, name: id, kind, members: ids });
  }
  refCache.delete("channels"); // surface the new DM in listChannels right away
  return id;
}

/**
 * The backend's `responsibility_claims` table joined with active users — the
 * "who is responsible for what" knowledge the analysis worker extracted from
 * the workspace. Read here so the slack-mock assistant can feed it to an LLM.
 * (Not in the Drizzle schema — it's backend-owned — so this is a raw read.)
 */
export interface ClaimWithUser {
  userId: string;
  realName: string | null;
  title: string | null;
  team: string | null;
  topic: string | null;
  keywords: string | null;
  claimText: string | null;
  confidence: number | null;
}

export async function getResponsibilityContext(): Promise<ClaimWithUser[]> {
  if (!db) return [];
  const res: unknown = await db.execute(sql`
    SELECT rc.user_id     AS "userId",
           u.real_name    AS "realName",
           u.title        AS "title",
           u.team         AS "team",
           rc.topic       AS "topic",
           rc.keywords    AS "keywords",
           rc.claim_text  AS "claimText",
           rc.confidence  AS "confidence"
    FROM responsibility_claims rc
    JOIN users u ON u.id = rc.user_id
    WHERE u.is_active = true
    ORDER BY rc.confidence DESC NULLS LAST
  `);
  const rows = (Array.isArray(res) ? res : (res as { rows?: unknown[] }).rows) ?? [];
  return rows as ClaimWithUser[];
}

// ---------------------------------------------------------------------------
// Paginated channel timeline — load only the newest N top-level messages, then
// older chunks on demand (scroll-up). Avoids fetching/rendering whole channels
// (e.g. #general has ~1,900 messages). Index-served via messages(channel_id, ts).
// ---------------------------------------------------------------------------

export interface ThreadMetaLite {
  count: number;
  lastReplyTs: string;
  participantIds: string[];
}

export interface TimelinePage {
  messages: StoreMessage[]; // top-level only, ascending ts
  reactions: Record<string, ReactionGroup[]>;
  threads: Record<string, ThreadMetaLite>; // keyed by parent message id
  hasMore: boolean; // are there older messages before this page?
}

const TIMELINE_LIMIT = 50;

export async function getChannelTimeline(
  channelId: string,
  opts: { limit?: number; before?: string } = {},
): Promise<TimelinePage> {
  const limit = opts.limit ?? TIMELINE_LIMIT;
  const beforeIso = opts.before ?? null;

  let parents: StoreMessage[];
  let hasMore: boolean;

  if (db) {
    const conds = [
      eq(messagesTable.channelId, channelId),
      or(isNull(messagesTable.threadTs), eq(messagesTable.threadTs, messagesTable.id)),
    ];
    if (beforeIso) conds.push(lt(messagesTable.ts, new Date(beforeIso)));
    const rows = await db
      .select()
      .from(messagesTable)
      .where(and(...conds))
      .orderBy(desc(messagesTable.ts)) // newest first, then take a page…
      .limit(limit + 1); // +1 to detect whether older messages remain
    hasMore = rows.length > limit;
    parents = rows
      .slice(0, limit)
      .reverse() // …reversed back to ascending for rendering
      .map((m) => ({
        id: m.id,
        channelId: m.channelId,
        userId: m.userId,
        text: m.text,
        threadTs: m.threadTs,
        ts: m.ts.toISOString(),
      }));
  } else {
    const all = fx.messages
      .filter((m) => m.channelId === channelId && (!m.threadTs || m.threadTs === m.id))
      .map((m) => ({ ...m, tsIso: fxTs(m.minute) }))
      .sort((a, b) => b.tsIso.localeCompare(a.tsIso)); // newest first
    const filtered = beforeIso ? all.filter((m) => m.tsIso < beforeIso) : all;
    hasMore = filtered.length > limit;
    parents = filtered
      .slice(0, limit)
      .reverse()
      .map((m) => ({
        id: m.id,
        channelId: m.channelId,
        userId: m.userId,
        text: m.text,
        threadTs: m.threadTs ?? null,
        ts: m.tsIso,
      }));
  }

  const ids = parents.map((m) => m.id);
  const [threads, reactions] = await Promise.all([
    _threadMeta(channelId, ids),
    _reactionsForMessages(channelId, ids),
  ]);
  return { messages: parents, reactions, threads, hasMore };
}

async function _threadMeta(channelId: string, parentIds: string[]): Promise<Record<string, ThreadMetaLite>> {
  if (!parentIds.length) return {};
  let replies: { threadTs: string; userId: string; ts: string }[];
  if (db) {
    const rows = await db
      .select({ threadTs: messagesTable.threadTs, userId: messagesTable.userId, ts: messagesTable.ts })
      .from(messagesTable)
      .where(inArray(messagesTable.threadTs, parentIds))
      .orderBy(asc(messagesTable.ts));
    replies = rows
      .filter((r) => r.threadTs)
      .map((r) => ({ threadTs: r.threadTs as string, userId: r.userId, ts: r.ts.toISOString() }));
  } else {
    const set = new Set(parentIds);
    replies = fx.messages
      .filter((m) => m.threadTs && m.threadTs !== m.id && set.has(m.threadTs))
      .map((m) => ({ threadTs: m.threadTs as string, userId: m.userId, ts: fxTs(m.minute) }))
      .sort((a, b) => a.ts.localeCompare(b.ts));
  }
  const out: Record<string, ThreadMetaLite> = {};
  for (const r of replies) {
    const meta = (out[r.threadTs] ??= { count: 0, lastReplyTs: r.ts, participantIds: [] });
    meta.count += 1;
    meta.lastReplyTs = r.ts;
    if (!meta.participantIds.includes(r.userId)) meta.participantIds.push(r.userId);
  }
  return out;
}

async function _reactionsForMessages(channelId: string, ids: string[]): Promise<Record<string, ReactionGroup[]>> {
  if (!ids.length) return {};
  let rows: { messageId: string; userId: string; emoji: string }[];
  if (db) {
    rows = await db
      .select({ messageId: reactionsTable.messageId, userId: reactionsTable.userId, emoji: reactionsTable.emoji })
      .from(reactionsTable)
      .where(inArray(reactionsTable.messageId, ids));
  } else {
    const set = new Set(ids);
    rows = fx.reactions.filter((r) => set.has(r.messageId));
  }
  const byMessage: Record<string, ReactionGroup[]> = {};
  for (const r of rows) {
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
