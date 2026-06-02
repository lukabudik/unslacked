/**
 * Analysis output schema. OWNED BY: Tom (backend tool).
 *
 * The backend writes its routing analysis here; the admin frontend reads from
 * here. Lives in the shared schema so the TS frontend gets types for free.
 */
import {
  pgTable,
  text,
  integer,
  doublePrecision,
  timestamp,
  boolean,
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
    topic: text("topic"),
    confidence: doublePrecision("confidence").notNull().default(0),
    explanation: text("explanation"),
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
  routedCount: integer("routed_count").notNull().default(0),
  answeredCount: integer("answered_count").notNull().default(0),
  summary: text("summary"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Extracted ownership signals. Both weak (someone answered a question) and
 * strong (explicit "X owns Y" claim) land here, differentiated by confidence.
 */
export const responsibilityClaims = pgTable(
  "responsibility_claims",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    topic: text("topic").notNull(),
    keywords: text("keywords").notNull(), // comma-separated: "billing,invoices,pricing"
    claimText: text("claim_text"),        // verbatim quote for strong claims; null for implicit
    messageId: text("message_id").references(() => messages.id, { onDelete: "set null" }),
    confidence: doublePrecision("confidence").notNull().default(0.8),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("resp_claims_user_idx").on(t.userId),
    index("resp_claims_topic_idx").on(t.topic),
  ],
);

/**
 * A detected routing anti-pattern: questions about `topic` flow through
 * `viaUser` unnecessarily — `toUser` is the likely real owner.
 * Approved entries promote to a RoutingRule used by the suggestion engine.
 */
export const inefficiencies = pgTable(
  "inefficiencies",
  {
    id: text("id").primaryKey(),
    viaUserId: text("via_user_id").notNull().references(() => users.id),
    toUserId: text("to_user_id").notNull().references(() => users.id),
    fromUserId: text("from_user_id").references(() => users.id, { onDelete: "set null" }),
    topic: text("topic").notNull(),
    evidence: text("evidence").notNull(), // JSON array of message IDs
    suggestionText: text("suggestion_text").notNull(),
    approved: boolean("approved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("inefficiencies_via_idx").on(t.viaUserId)],
);

/**
 * Approved routing rules used by the deterministic suggestion engine.
 * Created from an approved Inefficiency; keywords drive text matching.
 */
/**
 * One entry per analysis run. `completedAt` is the cutoff for the next
 * incremental run — only messages after this timestamp are re-processed.
 */
export const analysisRuns = pgTable("analysis_runs", {
  id: text("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  messagesSeen: integer("messages_seen").notNull().default(0),
  isFull: boolean("is_full").notNull().default(false),
});

export const routingRules = pgTable(
  "routing_rules",
  {
    id: text("id").primaryKey(),
    topic: text("topic").notNull(),
    keywords: text("keywords").notNull(), // comma-separated for matching
    ownerId: text("owner_id").notNull().references(() => users.id),
    description: text("description"),
    approved: boolean("approved").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("routing_rules_topic_idx").on(t.topic)],
);

/**
 * Automation opportunities mined by the analysis-worker's LLM pass.
 * Replaces the hardcoded list in the admin dashboard once populated.
 */
export const automationOpportunities = pgTable("automation_opportunities", {
  id: text("id").primaryKey(),
  taskFingerprint: text("task_fingerprint").notNull(),
  description: text("description").notNull(),
  verb: text("verb").notNull(),
  object: text("object").notNull(),
  source: text("source"), // nullable — not every task has a clear single source
  frequency: integer("frequency").notNull().default(1),
  distinctRequesters: integer("distinct_requesters").notNull().default(1),
  distinctAssignees: integer("distinct_assignees").notNull().default(1),
  requesterPersonas: text("requester_personas").notNull().default("[]"), // JSON array
  crossSystem: text("cross_system").notNull().default("[]"),             // JSON array
  duvoFitScore: doublePrecision("duvo_fit_score").notNull().default(0),
  estHoursPerMonth: doublePrecision("est_hours_per_month").notNull().default(0),
  humanHandoffCount: integer("human_handoff_count").notNull().default(1),
  duvoAgentBrief: text("duvo_agent_brief").notNull().default(""),
  // Grounding: real message IDs backing this opportunity + the likely domain
  // owner (matched from responsibility_claims). frequency / distinctRequesters /
  // requesterPersonas are recomputed from the actual corpus, not LLM-guessed.
  evidence: text("evidence").notNull().default("[]"),                    // JSON array of message IDs
  topic: text("topic"),                                                  // matched responsibility topic
  ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AnalysisRun = typeof analysisRuns.$inferSelect;
export type RoutingEvent = typeof routingEvents.$inferSelect;
export type RouterScore = typeof routerScores.$inferSelect;
export type ResponsibilityClaim = typeof responsibilityClaims.$inferSelect;
export type Inefficiency = typeof inefficiencies.$inferSelect;
export type RoutingRule = typeof routingRules.$inferSelect;
export type AutomationOpportunityRow = typeof automationOpportunities.$inferSelect;
