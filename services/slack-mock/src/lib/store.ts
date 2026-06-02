/**
 * Read layer for the slack-mock. Reads from Neon when DATABASE_URL is set,
 * otherwise serves the in-memory fixtures so the app/API run with zero setup.
 *
 * Everything here returns plain JS shapes; the API routes wrap them into
 * Slack-Web-API-style envelopes (see app/api/slack/*).
 */
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users as usersTable, channels as channelsTable, channelMembers, messages as messagesTable } from "@/db/schema";
import * as fx from "@/db/fixtures";

export interface StoreUser {
  id: string;
  name: string;
  realName: string;
  email: string | null;
  title: string | null;
  department: string | null;
  avatarColor: string;
  isBot: boolean;
}

export interface StoreChannel {
  id: string;
  name: string;
  kind: string;
  topic: string | null;
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
      members: mems.filter((m) => m.channelId === c.id).map((m) => m.userId),
    }));
  }
  return fx.channels.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    topic: c.topic ?? null,
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
