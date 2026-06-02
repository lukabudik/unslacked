import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  realName: text("real_name"),
  email: text("email"),
  title: text("title"),
  department: text("department"),
  avatarColor: text("avatar_color"),
  statusEmoji: text("status_emoji"),
  statusText: text("status_text"),
  timezone: text("timezone"),
  isBot: boolean("is_bot"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const channels = pgTable("channels", {
  id: text("id").primaryKey(),
  name: text("name"),
  kind: text("kind"),
  topic: text("topic"),
  purpose: text("purpose"),
  isArchived: boolean("is_archived"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

export const channelMembers = pgTable("channel_members", {
  channelId: text("channel_id"),
  userId: text("user_id"),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  channelId: text("channel_id"),
  userId: text("user_id"),
  text: text("text"),
  threadTs: text("thread_ts"),
  ts: timestamp("ts", { withTimezone: true }),
  editedAt: timestamp("edited_at", { withTimezone: true }),
});

export const mentions = pgTable("mentions", {
  id: text("id").primaryKey(),
  messageId: text("message_id"),
  mentionedUserId: text("mentioned_user_id"),
});

export const reactions = pgTable("reactions", {
  messageId: text("message_id"),
  userId: text("user_id"),
  emoji: text("emoji"),
});

export const routerScores = pgTable("router_scores", {
  userId: text("user_id"),
  routerScore: doublePrecision("router_score"),
  routedCount: integer("routed_count"),
  answeredCount: integer("answered_count"),
  summary: text("summary"),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});
