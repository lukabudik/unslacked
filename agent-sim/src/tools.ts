import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { World, Message } from "./world.js";

const txt = (s: string) => ({ content: [{ type: "text" as const, text: s }] });

function fmtMsg(world: World, m: Message): string {
  const u = world.users.get(m.userId);
  const who = u ? `@${u.handle}` : m.userId;
  return `${who}: ${m.text}`;
}

function channelLabel(world: World, channelId: string, selfId: string): string {
  const ch = world.channels.get(channelId);
  if (!ch) return channelId;
  if (ch.kind === "dm") {
    const other = ch.members.find((id) => id !== selfId);
    const ou = other ? world.users.get(other) : undefined;
    return `DM with @${ou?.handle ?? other}`;
  }
  return `#${ch.name}`;
}

/**
 * Build the per-agent tool surface. Every tool is bound to `selfId`,
 * mutates the world, emits events, and returns concise text the agent reads.
 */
export function buildAgentServer(world: World, selfId: string) {
  const list_channels = tool(
    "list_channels",
    "List the channels you are a member of, with unread counts.",
    {},
    async () => {
      const chans = world.channelsFor(selfId);
      if (!chans.length) return txt("You're not in any channels.");
      const lines = chans.map((c) => {
        const unread = world.unreadCount(selfId, c.id);
        const label = c.kind === "dm" ? channelLabel(world, c.id, selfId) : `#${c.name}`;
        return `${c.id}  ${label}${unread ? `  (${unread} unread)` : ""}`;
      });
      return txt(`Your channels:\n${lines.join("\n")}`);
    },
  );

  const read_channel = tool(
    "read_channel",
    "Read recent messages in a channel by its id.",
    { channelId: z.string(), limit: z.number().int().positive().max(50).optional() },
    async ({ channelId, limit }) => {
      const ch = world.channels.get(channelId);
      if (!ch) return txt(`No channel ${channelId}.`);
      if (!ch.members.includes(selfId)) return txt(`You're not a member of ${channelId}.`);
      const msgs = world.readChannel(channelId, limit ?? 30);
      const header = channelLabel(world, channelId, selfId);
      if (!msgs.length) return txt(`${header} is empty.`);
      return txt(`${header}:\n${msgs.map((m) => fmtMsg(world, m)).join("\n")}`);
    },
  );

  const check_notifications = tool(
    "check_notifications",
    "Show messages that @-mention you or are DMs to you since you last checked. Advances your cursor.",
    {},
    async () => {
      const notifs = world.notificationsFor(selfId);
      if (!notifs.length) return txt("No new notifications.");
      const lines = notifs.map(({ message, channel }) => {
        const where = channelLabel(world, channel.id, selfId);
        return `[${channel.id} ${where}] ${fmtMsg(world, message)}`;
      });
      return txt(`Notifications (${notifs.length}):\n${lines.join("\n")}`);
    },
  );

  const post_message = tool(
    "post_message",
    "Post a message to a channel. Use @handle to mention people and notify them.",
    { channelId: z.string(), text: z.string() },
    async ({ channelId, text }) => {
      const ch = world.channels.get(channelId);
      if (!ch) return txt(`No channel ${channelId}.`);
      if (!ch.members.includes(selfId)) return txt(`You're not a member of ${channelId}; can't post.`);
      world.addMessage(channelId, selfId, text);
      return txt(`Posted to ${channelLabel(world, channelId, selfId)}.`);
    },
  );

  const send_dm = tool(
    "send_dm",
    "Open (or reuse) a direct message with a user and send them a message. Pass their user id or @handle.",
    { userId: z.string(), text: z.string() },
    async ({ userId, text }) => {
      let target = world.users.get(userId);
      if (!target) target = world.userByHandle(userId);
      if (!target) return txt(`No user "${userId}". Use a U_ id or @handle.`);
      if (target.id === selfId) return txt("Can't DM yourself.");
      const dm = world.ensureDm(selfId, target.id);
      world.addMessage(dm.id, selfId, text);
      return txt(`DM sent to @${target.handle}.`);
    },
  );

  return createSdkMcpServer({
    name: "slack",
    version: "1.0.0",
    tools: [list_channels, read_channel, check_notifications, post_message, send_dm],
  });
}

export const SLACK_TOOL_NAMES = [
  "mcp__slack__list_channels",
  "mcp__slack__read_channel",
  "mcp__slack__check_notifications",
  "mcp__slack__post_message",
  "mcp__slack__send_dm",
];
