import type { Channel, User } from "./types";

/** Initials for an avatar tile. */
export function initials(u: User): string {
  const parts = (u.realName || u.handle || "?").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (u.realName || u.handle || "?").slice(0, 2).toUpperCase();
}

/** Format an ISO/epoch ts into HH:MM:SS, tolerant of junk. */
export function fmtTime(ts: string): string {
  let d = new Date(ts);
  if (isNaN(d.getTime())) {
    const n = Number(ts);
    if (!isNaN(n)) d = new Date(n);
  }
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type Token =
  | { type: "text"; value: string }
  | { type: "mention"; label: string; color?: string }
  | { type: "channel"; label: string };

// Matches <@U123>, <#C123|name>, <#C123>, and bare @handle.
const TOKEN_RE = /<@([^>]+)>|<#([^>|]+)(?:\|([^>]+))?>|@([A-Za-z0-9._-]+)/g;

/**
 * Resolve mentions in message text into renderable tokens.
 * - <@id> / @handle -> user real name (+ color), falling back to the raw form
 * - <#id|name> / <#id> -> channel name
 */
export function tokenizeText(
  text: string,
  usersById: Record<string, User>,
  usersByHandle: Record<string, User>,
  channelsById: Record<string, Channel>,
): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) {
      tokens.push({ type: "text", value: text.slice(last, m.index) });
    }
    const [, atId, chId, chName, atHandle] = m;
    if (atId !== undefined) {
      const u = usersById[atId];
      tokens.push({
        type: "mention",
        label: u ? u.realName : `@${atId}`,
        color: u?.avatarColor,
      });
    } else if (chId !== undefined) {
      const ch = channelsById[chId];
      tokens.push({ type: "channel", label: ch ? ch.name : chName || chId });
    } else if (atHandle !== undefined) {
      const u = usersByHandle[atHandle.toLowerCase()];
      tokens.push({
        type: "mention",
        label: u ? u.realName : `@${atHandle}`,
        color: u?.avatarColor,
      });
    }
    last = TOKEN_RE.lastIndex;
  }
  if (last < text.length) tokens.push({ type: "text", value: text.slice(last) });
  return tokens;
}
