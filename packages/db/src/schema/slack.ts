/**
 * Canonical Slack-domain schema. OWNED BY: Luka (slack-mock).
 *
 * This mirrors the shapes the real Slack Web API returns, so the backend can be
 * pointed at real Slack later with no model changes. IDs are Slack-style strings
 * ("U…", "C…") rather than serials so fixtures read like the real thing.
 *
 * Change this freely while we iterate, but ping the channel — the backend and
 * admin both depend on these tables.
 */
import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

/** Workspace members (and bots). */
export const users = pgTable("users", {
  id: text("id").primaryKey(), // e.g. "U_ALICE"
  name: text("name").notNull(), // display/handle, e.g. "alice"
  realName: text("real_name").notNull(),
  email: text("email"),
  title: text("title"), // job title — signal for router analysis
  department: text("department"), // top-level org unit, e.g. "Engineering"
  team: text("team"), // sub-team, e.g. "Platform" — finer routing signal
  avatarColor: text("avatar_color").notNull().default("#4a154b"),
  statusEmoji: text("status_emoji"), // e.g. "🌴"
  statusText: text("status_text"), // e.g. "On vacation"
  timezone: text("timezone"), // IANA tz, e.g. "Europe/Prague"
  isBot: boolean("is_bot").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true), // deactivated accounts = broken routing targets
  isGuest: boolean("is_guest").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Slack usergroups (@data-team) — a primary routing *target*. */
export const userGroups = pgTable("user_groups", {
  id: text("id").primaryKey(), // e.g. "S_DATA"
  handle: text("handle").notNull(), // "data-team" (the @mention)
  name: text("name").notNull(), // "Data Team"
  description: text("description"),
});

export const userGroupMembers = pgTable(
  "user_group_members",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => userGroups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
);

/**
 * Conversations: public/private channels, DMs (im), and group DMs (mpim).
 * Matches Slack's conversations.* surface.
 */
export const channels = pgTable("channels", {
  id: text("id").primaryKey(), // e.g. "C_ENGINEERING" or "D_..." for DMs
  name: text("name").notNull(), // "engineering"; for DMs a synthetic label
  kind: text("kind", {
    enum: ["public_channel", "private_channel", "im", "mpim"],
  })
    .notNull()
    .default("public_channel"),
  topic: text("topic"),
  purpose: text("purpose"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Channel/DM membership (many-to-many). */
export const channelMembers = pgTable(
  "channel_members",
  {
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.channelId, t.userId] })],
);

/**
 * Messages. `threadTs` points at the parent message id when this is a reply;
 * null for top-level messages. `ts` is the Slack-style ordering timestamp.
 */
export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(), // synthetic "M_..." or slack ts
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    text: text("text").notNull(),
    threadTs: text("thread_ts"), // parent message id if this is a thread reply
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (t) => [
    index("messages_channel_idx").on(t.channelId),
    index("messages_thread_idx").on(t.threadTs),
    index("messages_user_idx").on(t.userId),
  ],
);

/**
 * Extracted @-mentions, one row per (message, mentioned user). Denormalized on
 * write so the backend can build the "who points at whom" graph cheaply without
 * re-parsing message text.
 */
export const mentions = pgTable(
  "mentions",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    mentionedUserId: text("mentioned_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("mentions_message_idx").on(t.messageId),
    index("mentions_user_idx").on(t.mentionedUserId),
  ],
);

/** Emoji reactions — light signal, optional for v1 analysis. */
export const reactions = pgTable(
  "reactions",
  {
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId, t.emoji] })],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Channel = typeof channels.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Mention = typeof mentions.$inferSelect;
export type UserGroup = typeof userGroups.$inferSelect;
