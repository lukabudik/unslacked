import type { StoreUser, StoreChannel } from "@unslacked/db";
import { VIEWER_ID } from "@/lib/viewer";

/** Two-letter initials for an avatar fallback. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** A stable display name for a user id. */
export function displayName(users: Record<string, StoreUser>, id: string): string {
  return users[id]?.realName ?? users[id]?.name ?? id;
}

/**
 * Slack shows the *other* participant(s) for DMs/MPIMs. For channels it's just
 * the channel name. Returns a human label without the `#`/lock glyph (those are
 * rendered separately).
 */
export function channelLabel(channel: StoreChannel, users: Record<string, StoreUser>): string {
  if (channel.kind === "im") {
    const otherId = channel.members.find((m) => m !== VIEWER_ID) ?? channel.members[0];
    return displayName(users, otherId);
  }
  if (channel.kind === "mpim") {
    const others = channel.members.filter((m) => m !== VIEWER_ID);
    return others.map((id) => displayName(users, id)).join(", ");
  }
  return channel.name;
}

/** The "other" user in a 1:1 DM (for presence dot / status emoji). */
export function dmCounterpart(channel: StoreChannel, users: Record<string, StoreUser>): StoreUser | null {
  if (channel.kind !== "im") return null;
  const otherId = channel.members.find((m) => m !== VIEWER_ID) ?? channel.members[0];
  return users[otherId] ?? null;
}

/** Deterministic pseudo-presence so the UI has online dots without a backend. */
export function isOnline(userId: string): boolean {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return h % 3 !== 0; // ~2/3 online
}

/** "9:32 AM" style time. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "Today" / "Yesterday" / "Monday, June 2nd" style day divider. */
export function formatDayDivider(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

export function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

/** Whether two messages should be visually grouped (same author, < 5 min apart). */
export function shouldGroup(prev: { userId: string; ts: string } | null, cur: { userId: string; ts: string }): boolean {
  if (!prev) return false;
  if (prev.userId !== cur.userId) return false;
  const gap = new Date(cur.ts).getTime() - new Date(prev.ts).getTime();
  return gap >= 0 && gap < 5 * 60_000;
}
