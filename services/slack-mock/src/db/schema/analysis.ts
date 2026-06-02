/**
 * Analysis output schema. OWNED BY: Tom (backend tool) — PROPOSED starting point.
 *
 * The backend writes its routing analysis here; the admin frontend reads from
 * here. Lives in the shared schema so the TS frontend gets types for free.
 * Tom: reshape this however the detection logic actually needs — it's a
 * scaffold to unblock the frontend, not a contract set in stone.
 */
import {
  pgTable,
  text,
  integer,
  doublePrecision,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users, channels, messages } from "./slack";

/**
 * A single detected routing event: `router` received/saw a question from
 * `asker` and pointed them at `target` instead of answering. These are the raw
 * edges the dependency graph is built from.
 */
export const routingEvents = pgTable(
  "routing_events",
  {
    id: text("id").primaryKey(),
    routerUserId: text("router_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    askerUserId: text("asker_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    targetUserId: text("target_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelId: text("channel_id").references(() => channels.id, {
      onDelete: "set null",
    }),
    messageId: text("message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    confidence: doublePrecision("confidence").notNull().default(0),
    explanation: text("explanation"), // why the model thinks this is routing
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("routing_events_router_idx").on(t.routerUserId),
    index("routing_events_target_idx").on(t.targetUserId),
  ],
);

/**
 * Per-user rollup the admin dashboard renders. One row per user the backend has
 * scored. `routerScore` is the headline 0–1 "how much is this person just a
 * router" number.
 */
export const routerScores = pgTable("router_scores", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  routerScore: doublePrecision("router_score").notNull().default(0),
  routedCount: integer("routed_count").notNull().default(0), // times they routed others
  answeredCount: integer("answered_count").notNull().default(0), // times they answered directly
  summary: text("summary"), // LLM-written "why flagged" blurb
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RoutingEvent = typeof routingEvents.$inferSelect;
export type RouterScore = typeof routerScores.$inferSelect;
