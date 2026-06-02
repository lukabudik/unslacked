/** Map our store shapes into Slack Web API response objects. */
import type { StoreUser, StoreChannel, StoreMessage } from "./store";

export function toSlackUser(u: StoreUser) {
  return {
    id: u.id,
    name: u.name,
    real_name: u.realName,
    is_bot: u.isBot,
    tz: u.timezone ?? undefined,
    profile: {
      real_name: u.realName,
      display_name: u.name,
      email: u.email,
      title: u.title,
      status_emoji: u.statusEmoji,
      status_text: u.statusText,
      // not a real Slack field, but handy for the mock UI / admin
      department: u.department,
      avatar_color: u.avatarColor,
    },
  };
}

export function toSlackChannel(c: StoreChannel) {
  const isIm = c.kind === "im";
  return {
    id: c.id,
    name: c.name,
    is_channel: c.kind === "public_channel" || c.kind === "private_channel",
    is_private: c.kind === "private_channel",
    is_im: isIm,
    is_mpim: c.kind === "mpim",
    is_archived: c.isArchived,
    topic: { value: c.topic ?? "" },
    num_members: c.members.length,
    members: c.members,
  };
}

export function toSlackMessage(m: StoreMessage) {
  return {
    type: "message",
    ts: m.ts,
    user: m.userId,
    text: m.text,
    thread_ts: m.threadTs ?? undefined,
    channel: m.channelId,
  };
}
