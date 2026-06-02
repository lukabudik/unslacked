import { EventEmitter } from "node:events";

export type ChannelKind = "channel" | "dm";

export interface User {
  id: string;
  handle: string;
  realName: string;
  title: string;
  team: string;
  department?: string;
  avatarColor: string;
  persona?: string;
}

export interface Channel {
  id: string;
  name: string;
  kind: ChannelKind;
  members: string[];
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  ts: number;
  text: string;
  threadTs?: string;
  mentions: string[];
}

/**
 * In-memory Slack-like workspace. Single source of truth for the sim.
 * Extends EventEmitter and fires events that match the README WS protocol:
 *   "message" -> { id, channelId, userId, ts, text, threadTs? }
 *   "channel" -> { id, name, kind, members }
 *   "agent"   -> { userId, status, note? }
 */
export class World extends EventEmitter {
  users = new Map<string, User>();
  channels = new Map<string, Channel>();
  messages = new Map<string, Message[]>(); // channelId -> messages (chronological)

  private msgSeq = 0;
  private dmSeq = 0;
  /** per-user cursor: last message ts they "saw" for notifications */
  private lastSeen = new Map<string, number>();
  /** handle (lowercased, no @) -> userId */
  private handleIndex = new Map<string, string>();

  constructor() {
    super();
    this.setMaxListeners(0);
  }

  // ---- setup ----

  addUser(u: User) {
    this.users.set(u.id, u);
    this.handleIndex.set(u.handle.toLowerCase(), u.id);
    if (!this.lastSeen.has(u.id)) this.lastSeen.set(u.id, 0);
  }

  addChannel(c: Channel) {
    this.channels.set(c.id, c);
    if (!this.messages.has(c.id)) this.messages.set(c.id, []);
  }

  // ---- lookups ----

  userByHandle(handle: string): User | undefined {
    const id = this.handleIndex.get(handle.replace(/^@/, "").toLowerCase());
    return id ? this.users.get(id) : undefined;
  }

  channelsFor(userId: string): Channel[] {
    return [...this.channels.values()].filter((c) => c.members.includes(userId));
  }

  readChannel(channelId: string, limit = 30): Message[] {
    const all = this.messages.get(channelId) ?? [];
    return limit > 0 ? all.slice(-limit) : all;
  }

  /** parse @handle tokens in text -> resolved user ids */
  private parseMentions(text: string): string[] {
    const ids = new Set<string>();
    for (const m of text.matchAll(/@([a-z0-9._-]+)/gi)) {
      const u = this.userByHandle(m[1]);
      if (u) ids.add(u.id);
    }
    return [...ids];
  }

  // ---- mutations ----

  addMessage(
    channelId: string,
    userId: string,
    text: string,
    threadTs?: string,
  ): Message {
    const ch = this.channels.get(channelId);
    if (!ch) throw new Error(`unknown channel ${channelId}`);
    const ts = Date.now() + this.msgSeq; // monotonic, unique
    const msg: Message = {
      id: `M_${(this.msgSeq++).toString(36)}`,
      channelId,
      userId,
      ts,
      text,
      threadTs,
      mentions: this.parseMentions(text),
    };
    this.messages.get(channelId)!.push(msg);
    // poster has seen their own message
    this.lastSeen.set(userId, ts);
    this.emit("message", {
      id: msg.id,
      channelId: msg.channelId,
      userId: msg.userId,
      ts: msg.ts,
      text: msg.text,
      ...(msg.threadTs ? { threadTs: msg.threadTs } : {}),
    });
    return msg;
  }

  /** find or create a 1:1 DM channel between two users */
  ensureDm(a: string, b: string): Channel {
    const pair = [a, b].sort();
    const existing = [...this.channels.values()].find(
      (c) =>
        c.kind === "dm" &&
        c.members.length === 2 &&
        c.members.includes(pair[0]) &&
        c.members.includes(pair[1]),
    );
    if (existing) return existing;
    const ua = this.users.get(a);
    const ub = this.users.get(b);
    const ch: Channel = {
      id: `D_${(this.dmSeq++).toString(36)}`,
      name: `dm:${ua?.handle ?? a}-${ub?.handle ?? b}`,
      kind: "dm",
      members: pair,
    };
    this.addChannel(ch);
    this.emit("channel", {
      id: ch.id,
      name: ch.name,
      kind: ch.kind,
      members: ch.members,
    });
    return ch;
  }

  /**
   * Messages that mention me or are DMs to me since I last checked.
   * Advances my cursor to "now".
   */
  notificationsFor(
    userId: string,
  ): { message: Message; channel: Channel }[] {
    const since = this.lastSeen.get(userId) ?? 0;
    const out: { message: Message; channel: Channel }[] = [];
    let maxTs = since;
    for (const ch of this.channels.values()) {
      const isMyDm = ch.kind === "dm" && ch.members.includes(userId);
      for (const m of this.messages.get(ch.id) ?? []) {
        if (m.ts <= since) continue;
        if (m.userId === userId) continue; // not my own
        if (m.ts > maxTs) maxTs = m.ts;
        const mentionsMe = m.mentions.includes(userId);
        if (mentionsMe || isMyDm) out.push({ message: m, channel: ch });
      }
    }
    this.lastSeen.set(userId, Math.max(maxTs, since));
    return out.sort((x, y) => x.message.ts - y.message.ts);
  }

  /** does this user have anything pending (mentions / DMs) without consuming it */
  hasPending(userId: string): boolean {
    const since = this.lastSeen.get(userId) ?? 0;
    for (const ch of this.channels.values()) {
      const isMyDm = ch.kind === "dm" && ch.members.includes(userId);
      for (const m of this.messages.get(ch.id) ?? []) {
        if (m.ts <= since || m.userId === userId) continue;
        if (m.mentions.includes(userId) || isMyDm) return true;
      }
    }
    return false;
  }

  unreadCount(userId: string, channelId: string): number {
    const since = this.lastSeen.get(userId) ?? 0;
    return (this.messages.get(channelId) ?? []).filter(
      (m) => m.ts > since && m.userId !== userId,
    ).length;
  }

  emitAgent(userId: string, status: "thinking" | "acting" | "idle", note?: string) {
    this.emit("agent", { userId, status, ...(note ? { note } : {}) });
  }

  // ---- snapshots (for ws init) ----

  userList(): User[] {
    return [...this.users.values()];
  }

  channelList(): Channel[] {
    return [...this.channels.values()];
  }
}
