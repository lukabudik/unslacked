/**
 * Analysis read/write query layer. OWNED BY: Tom (analysis-worker).
 *
 * All writes require DATABASE_URL (unlike Slack reads which fall back to
 * fixtures). Callers that need DB must ensure it is configured.
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./client";
import {
  analysisRuns,
  automationOpportunities,
  channels,
  inefficiencies,
  messages,
  responsibilityClaims,
  routerScores,
  routingEvents,
  routingRules,
  users,
} from "./schema";

function requireDb() {
  if (!db) throw new Error("DATABASE_URL is required for analysis operations");
  return db;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface SaveRoutingEventInput {
  id: string;
  routerUserId: string;
  targetUserId: string;
  askerUserId?: string | null;
  channelId?: string | null;
  messageId?: string | null;
  topic?: string | null;
  confidence?: number;
  explanation?: string | null;
}

export interface SaveResponsibilityClaimInput {
  id: string;
  userId: string;
  topic: string;
  keywords: string; // comma-separated
  claimText?: string | null;
  messageId?: string | null;
  confidence?: number;
}

export interface SaveInefficiencyInput {
  id: string;
  viaUserId: string;
  toUserId: string;
  fromUserId?: string | null;
  topic: string;
  evidence: string; // JSON array string of message IDs
  suggestionText: string;
}

// ─── Writes ───────────────────────────────────────────────────────────────────

// ─── Run tracking ─────────────────────────────────────────────────────────────

/**
 * Returns the completedAt timestamp of the last successful run, or null if no
 * run has completed yet. This is the cutoff for incremental analysis — only
 * messages after this timestamp need to be processed.
 */
export async function getLastRunCompletedAt(): Promise<Date | null> {
  const d = requireDb();
  const [row] = await d
    .select({ completedAt: analysisRuns.completedAt })
    .from(analysisRuns)
    .where(sql`${analysisRuns.completedAt} is not null`)
    .orderBy(desc(analysisRuns.completedAt))
    .limit(1);
  return row?.completedAt ?? null;
}

export async function startAnalysisRun(isFull: boolean): Promise<string> {
  const d = requireDb();
  const id = crypto.randomUUID();
  await d.insert(analysisRuns).values({ id, isFull });
  return id;
}

export async function completeAnalysisRun(id: string, messagesSeen: number): Promise<void> {
  const d = requireDb();
  await d
    .update(analysisRuns)
    .set({ completedAt: new Date(), messagesSeen })
    .where(eq(analysisRuns.id, id));
}

// ─── Writes ───────────────────────────────────────────────────────────────────

/** Full reset — clears all analysis results. Only call for a full re-run. */
export async function clearAnalysis(): Promise<void> {
  const d = requireDb();
  await d.delete(inefficiencies);
  await d.delete(routingEvents);
  await d.delete(responsibilityClaims);
  await d.delete(automationOpportunities);
}

export async function saveRoutingEvent(input: SaveRoutingEventInput): Promise<void> {
  const d = requireDb();
  await d.insert(routingEvents).values({
    id: input.id,
    routerUserId: input.routerUserId,
    targetUserId: input.targetUserId,
    askerUserId: input.askerUserId ?? null,
    channelId: input.channelId ?? null,
    messageId: input.messageId ?? null,
    topic: input.topic ?? null,
    confidence: input.confidence ?? 0.8,
    explanation: input.explanation ?? null,
  });
}

export async function saveResponsibilityClaim(
  input: SaveResponsibilityClaimInput,
): Promise<void> {
  const d = requireDb();
  await d.insert(responsibilityClaims).values({
    id: input.id,
    userId: input.userId,
    topic: input.topic,
    keywords: input.keywords,
    claimText: input.claimText ?? null,
    messageId: input.messageId ?? null,
    confidence: input.confidence ?? 0.8,
  });
}

export async function saveInefficiency(input: SaveInefficiencyInput): Promise<void> {
  const d = requireDb();
  await d.insert(inefficiencies).values({
    id: input.id,
    viaUserId: input.viaUserId,
    toUserId: input.toUserId,
    fromUserId: input.fromUserId ?? null,
    topic: input.topic,
    evidence: input.evidence,
    suggestionText: input.suggestionText,
    approved: false,
  });
}

/**
 * Mark an inefficiency as approved and create the corresponding routing rule
 * (skips creation if a rule for the same topic+owner already exists).
 * Returns false if the inefficiency was not found.
 */
export async function approveInefficiency(id: string): Promise<boolean> {
  const d = requireDb();

  const [inefficiency] = await d
    .select()
    .from(inefficiencies)
    .where(eq(inefficiencies.id, id))
    .limit(1);
  if (!inefficiency) return false;

  await d
    .update(inefficiencies)
    .set({ approved: true })
    .where(eq(inefficiencies.id, id));

  const [existing] = await d
    .select({ id: routingRules.id })
    .from(routingRules)
    .where(
      and(
        eq(routingRules.topic, inefficiency.topic),
        eq(routingRules.ownerId, inefficiency.toUserId),
      ),
    )
    .limit(1);

  if (!existing) {
    const claims = await d
      .select({ keywords: responsibilityClaims.keywords })
      .from(responsibilityClaims)
      .where(
        and(
          eq(responsibilityClaims.userId, inefficiency.toUserId),
          eq(responsibilityClaims.topic, inefficiency.topic),
        ),
      );
    const keywords =
      claims.length > 0
        ? [
            ...new Set(
              claims.flatMap((c) => c.keywords.split(",").map((k) => k.trim())),
            ),
          ]
            .filter(Boolean)
            .join(",")
        : inefficiency.topic;

    await d.insert(routingRules).values({
      id: crypto.randomUUID(),
      topic: inefficiency.topic,
      keywords,
      ownerId: inefficiency.toUserId,
      description: inefficiency.suggestionText,
      approved: true,
    });
  }

  return true;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export interface EnrichedInefficiency {
  id: string;
  topic: string;
  via: { id: string; name: string; handle: string } | null;
  owner: { id: string; name: string; handle: string } | null;
  from: { id: string; name: string } | null;
  suggestionText: string;
  evidence: string[];
  approved: boolean;
  createdAt: Date;
}

export async function getInefficiencies(): Promise<EnrichedInefficiency[]> {
  const d = requireDb();
  const items = await d
    .select()
    .from(inefficiencies)
    .orderBy(desc(inefficiencies.createdAt));

  const userIds = [
    ...new Set(
      items.flatMap((i) =>
        [i.viaUserId, i.toUserId, i.fromUserId].filter(Boolean) as string[],
      ),
    ),
  ];
  const userRows =
    userIds.length > 0
      ? await d
          .select({ id: users.id, realName: users.realName, name: users.name })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];
  const um = new Map(userRows.map((u) => [u.id, u]));

  return items.map((i) => ({
    id: i.id,
    topic: i.topic,
    via: um.get(i.viaUserId)
      ? { id: i.viaUserId, name: um.get(i.viaUserId)!.realName, handle: um.get(i.viaUserId)!.name }
      : null,
    owner: um.get(i.toUserId)
      ? { id: i.toUserId, name: um.get(i.toUserId)!.realName, handle: um.get(i.toUserId)!.name }
      : null,
    from:
      i.fromUserId && um.get(i.fromUserId)
        ? { id: i.fromUserId, name: um.get(i.fromUserId)!.realName }
        : null,
    suggestionText: i.suggestionText,
    evidence: JSON.parse(i.evidence) as string[],
    approved: i.approved,
    createdAt: i.createdAt,
  }));
}

export interface GraphNode {
  id: string;
  label: string;
  handle: string;
  department: string | null;
  routerScore: number;
  isRouter: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  sourceLabel: string | undefined;
  targetLabel: string | undefined;
  count: number;
  topics: string[];
}

export async function getGraph(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const d = requireDb();
  const [allUsers, events] = await Promise.all([
    d.select().from(users).where(eq(users.isBot, false)),
    d.select().from(routingEvents),
  ]);

  const eventUserIds = [
    ...new Set(events.flatMap((e) => [e.routerUserId, e.targetUserId])),
  ];
  const eventUsers =
    eventUserIds.length > 0
      ? await d
          .select({ id: users.id, realName: users.realName, name: users.name })
          .from(users)
          .where(inArray(users.id, eventUserIds))
      : [];
  const um = new Map(eventUsers.map((u) => [u.id, u]));

  const edgeMap = new Map<
    string,
    { source: string; target: string; count: number; topics: Set<string> }
  >();
  const routerCounts = new Map<string, number>();

  for (const e of events) {
    const key = `${e.routerUserId}→${e.targetUserId}`;
    const existing = edgeMap.get(key);
    if (existing) {
      existing.count++;
      if (e.topic) existing.topics.add(e.topic);
    } else {
      edgeMap.set(key, {
        source: e.routerUserId,
        target: e.targetUserId,
        count: 1,
        topics: new Set(e.topic ? [e.topic] : []),
      });
    }
    routerCounts.set(e.routerUserId, (routerCounts.get(e.routerUserId) ?? 0) + 1);
  }

  return {
    nodes: allUsers.map((u) => ({
      id: u.id,
      label: u.realName,
      handle: u.name,
      department: u.department,
      routerScore: routerCounts.get(u.id) ?? 0,
      isRouter: (routerCounts.get(u.id) ?? 0) >= 2,
    })),
    edges: [...edgeMap.values()].map((e) => ({
      source: e.source,
      target: e.target,
      sourceLabel: um.get(e.source)?.realName,
      targetLabel: um.get(e.target)?.realName,
      count: e.count,
      topics: [...e.topics],
    })),
  };
}

export interface AnalysisStats {
  userCount: number;
  messageCount: number;
  handoffCount: number;
  inefficiencyCount: number;
  approvedRuleCount: number;
  topRouters: Array<{ id: string; name: string; count: number }>;
}

export async function getAnalysisStats(): Promise<AnalysisStats> {
  const d = requireDb();

  const [
    userCount,
    messageCount,
    handoffCount,
    inefficiencyCount,
    approvedRuleCount,
  ] = await Promise.all([
    d
      .select({ count: sql<string>`count(*)` })
      .from(users)
      .where(eq(users.isBot, false))
      .then((r) => Number(r[0]?.count ?? 0)),
    d
      .select({ count: sql<string>`count(*)` })
      .from(messages)
      .then((r) => Number(r[0]?.count ?? 0)),
    d
      .select({ count: sql<string>`count(*)` })
      .from(routingEvents)
      .then((r) => Number(r[0]?.count ?? 0)),
    d
      .select({ count: sql<string>`count(*)` })
      .from(inefficiencies)
      .then((r) => Number(r[0]?.count ?? 0)),
    d
      .select({ count: sql<string>`count(*)` })
      .from(routingRules)
      .where(eq(routingRules.approved, true))
      .then((r) => Number(r[0]?.count ?? 0)),
  ]);

  const events = await d
    .select({ routerUserId: routingEvents.routerUserId })
    .from(routingEvents);

  const routerCounts = new Map<string, number>();
  for (const e of events) {
    routerCounts.set(e.routerUserId, (routerCounts.get(e.routerUserId) ?? 0) + 1);
  }

  const routerIds = [...routerCounts.keys()];
  const routerUsers =
    routerIds.length > 0
      ? await d
          .select({ id: users.id, realName: users.realName })
          .from(users)
          .where(inArray(users.id, routerIds))
      : [];
  const routerNameMap = new Map(routerUsers.map((u) => [u.id, u.realName]));

  return {
    userCount,
    messageCount,
    handoffCount,
    inefficiencyCount,
    approvedRuleCount,
    topRouters: [...routerCounts.entries()]
      .map(([id, count]) => ({ id, name: routerNameMap.get(id) ?? id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

export interface EnrichedRoutingRule {
  id: string;
  topic: string;
  keywords: string;
  description: string | null;
  approved: boolean;
  owner: { id: string; name: string; handle: string } | null;
}

export async function getRoutingRules(): Promise<EnrichedRoutingRule[]> {
  const d = requireDb();
  const rules = await d
    .select()
    .from(routingRules)
    .where(eq(routingRules.approved, true));

  const ownerIds = [...new Set(rules.map((r) => r.ownerId))];
  const owners =
    ownerIds.length > 0
      ? await d
          .select({ id: users.id, realName: users.realName, name: users.name })
          .from(users)
          .where(inArray(users.id, ownerIds))
      : [];
  const om = new Map(owners.map((o) => [o.id, o]));

  return rules.map((r) => ({
    id: r.id,
    topic: r.topic,
    keywords: r.keywords,
    description: r.description,
    approved: r.approved,
    owner: om.get(r.ownerId)
      ? { id: r.ownerId, name: om.get(r.ownerId)!.realName, handle: om.get(r.ownerId)!.name }
      : null,
  }));
}

export interface SuggestionResult {
  topic: string;
  ownerId: string;
  ownerName: string;
  ownerHandle: string;
  description: string | null;
  confidence: number;
}

export async function findSuggestion(
  text: string,
  mentionedUserId?: string,
): Promise<SuggestionResult | null> {
  const d = requireDb();
  const rules = await d
    .select()
    .from(routingRules)
    .where(eq(routingRules.approved, true));
  if (rules.length === 0) return null;

  const ownerIds = [...new Set(rules.map((r) => r.ownerId))];
  const owners = await d
    .select({ id: users.id, realName: users.realName, name: users.name })
    .from(users)
    .where(inArray(users.id, ownerIds));
  const om = new Map(owners.map((o) => [o.id, o]));

  const textLower = text.toLowerCase();
  const scored: Array<{ rule: (typeof rules)[0]; score: number }> = [];

  for (const rule of rules) {
    let score = 0;
    const keywords = rule.keywords.split(",").map((k) => k.trim().toLowerCase());
    score += keywords.filter((k) => k && textLower.includes(k)).length * 10;

    if (mentionedUserId) {
      const [match] = await d
        .select({ id: inefficiencies.id })
        .from(inefficiencies)
        .where(
          and(
            eq(inefficiencies.viaUserId, mentionedUserId),
            eq(inefficiencies.topic, rule.topic),
            eq(inefficiencies.approved, true),
          ),
        )
        .limit(1);
      if (match) score += 20;
    }

    if (score > 0) scored.push({ rule, score });
  }

  if (scored.length === 0) return null;

  const best = scored.sort((a, b) => b.score - a.score)[0];
  const owner = om.get(best.rule.ownerId);

  return {
    topic: best.rule.topic,
    ownerId: best.rule.ownerId,
    ownerName: owner?.realName ?? best.rule.ownerId,
    ownerHandle: owner?.name ?? best.rule.ownerId,
    description: best.rule.description,
    confidence: Math.min(best.score / 30, 1.0),
  };
}

/**
 * Aggregate collected routing events into inefficiency records.
 * Purely deterministic — no LLM needed. Groups routing_events by
 * (routerUserId, targetUserId, topic) and flags pairs that appear 2+ times.
 * Safe to call multiple times; skips patterns that already have a record.
 * Returns the number of new inefficiency records created.
 */
export async function detectAndSaveInefficiencies(): Promise<number> {
  const d = requireDb();

  // Find repeated handoff patterns
  const patterns = await d
    .select({
      routerUserId: routingEvents.routerUserId,
      targetUserId: routingEvents.targetUserId,
      topic: routingEvents.topic,
      occurrences: sql<number>`count(*)::int`,
    })
    .from(routingEvents)
    .where(sql`${routingEvents.topic} is not null`)
    .groupBy(routingEvents.routerUserId, routingEvents.targetUserId, routingEvents.topic)
    .having(sql`count(*) >= 2`)
    .orderBy(desc(sql`count(*)`));

  if (patterns.length === 0) return 0;

  const userIds = [
    ...new Set(patterns.flatMap((p) => [p.routerUserId, p.targetUserId])),
  ];
  const userRows = await d
    .select({ id: users.id, realName: users.realName, name: users.name })
    .from(users)
    .where(inArray(users.id, userIds));
  const um = new Map(userRows.map((u) => [u.id, u]));

  let created = 0;
  for (const p of patterns) {
    if (!p.topic) continue;

    // Skip if already recorded
    const [existing] = await d
      .select({ id: inefficiencies.id })
      .from(inefficiencies)
      .where(
        and(
          eq(inefficiencies.viaUserId, p.routerUserId),
          eq(inefficiencies.toUserId, p.targetUserId),
          eq(inefficiencies.topic, p.topic),
        ),
      )
      .limit(1);
    if (existing) continue;

    // Collect evidence message IDs
    const evidenceRows = await d
      .select({ messageId: routingEvents.messageId })
      .from(routingEvents)
      .where(
        and(
          eq(routingEvents.routerUserId, p.routerUserId),
          eq(routingEvents.targetUserId, p.targetUserId),
          eq(routingEvents.topic, p.topic),
        ),
      )
      .limit(5);
    const evidence = evidenceRows
      .map((r) => r.messageId)
      .filter(Boolean) as string[];

    const via = um.get(p.routerUserId);
    const owner = um.get(p.targetUserId);
    const suggestionText = `Ask @${owner?.name ?? p.targetUserId} directly about ${p.topic} instead of going through @${via?.name ?? p.routerUserId} (${p.occurrences} handoffs detected)`;

    await d.insert(inefficiencies).values({
      id: crypto.randomUUID(),
      viaUserId: p.routerUserId,
      toUserId: p.targetUserId,
      topic: p.topic,
      evidence: JSON.stringify(evidence),
      suggestionText,
      approved: false,
    });
    created++;
  }

  return created;
}

// ─── Automation opportunities ─────────────────────────────────────────────────

export interface SaveAutomationOpportunityInput {
  id: string;
  taskFingerprint: string;
  description: string;
  verb: string;
  object: string;
  source: string;
  frequency: number;
  distinctRequesters: number;
  distinctAssignees: number;
  requesterPersonas: string[];
  crossSystem: string[];
  duvoFitScore: number;
  estHoursPerMonth: number;
  humanHandoffCount: number;
  duvoAgentBrief: string;
}

export async function saveAutomationOpportunity(
  input: SaveAutomationOpportunityInput,
): Promise<void> {
  const d = requireDb();
  await d.insert(automationOpportunities).values({
    id: input.id,
    taskFingerprint: input.taskFingerprint,
    description: input.description,
    verb: input.verb,
    object: input.object,
    source: input.source,
    frequency: input.frequency,
    distinctRequesters: input.distinctRequesters,
    distinctAssignees: input.distinctAssignees,
    requesterPersonas: JSON.stringify(input.requesterPersonas),
    crossSystem: JSON.stringify(input.crossSystem),
    duvoFitScore: input.duvoFitScore,
    estHoursPerMonth: input.estHoursPerMonth,
    humanHandoffCount: input.humanHandoffCount,
    duvoAgentBrief: input.duvoAgentBrief,
  });
}

export async function getAutomationOpportunities(): Promise<SaveAutomationOpportunityInput[]> {
  const d = requireDb();
  const rows = await d
    .select()
    .from(automationOpportunities)
    .orderBy(desc(automationOpportunities.duvoFitScore));
  return rows.map((r) => ({
    id: r.id,
    taskFingerprint: r.taskFingerprint,
    description: r.description,
    verb: r.verb,
    object: r.object,
    source: r.source,
    frequency: r.frequency,
    distinctRequesters: r.distinctRequesters,
    distinctAssignees: r.distinctAssignees,
    requesterPersonas: JSON.parse(r.requesterPersonas) as string[],
    crossSystem: JSON.parse(r.crossSystem) as string[],
    duvoFitScore: r.duvoFitScore,
    estHoursPerMonth: r.estHoursPerMonth,
    humanHandoffCount: r.humanHandoffCount,
    duvoAgentBrief: r.duvoAgentBrief,
  }));
}

// ─── Message corpus for automation mining ────────────────────────────────────

export interface MessageForMining {
  text: string;
  channelName: string;
  department: string;
}

/**
 * Fetch a sample of recent non-trivial messages with channel and department
 * context, for use as the LLM corpus during automation mining.
 */
export async function getMessagesForMining(
  limit = 200,
  since?: Date | null,
): Promise<MessageForMining[]> {
  const d = requireDb();
  const rows = await d
    .select({
      text: messages.text,
      channelId: messages.channelId,
      userId: messages.userId,
    })
    .from(messages)
    .where(
      since
        ? sql`${messages.text} is not null and length(${messages.text}) > 15 and ${messages.ts} >= ${since}`
        : sql`${messages.text} is not null and length(${messages.text}) > 15`,
    )
    .orderBy(desc(messages.ts))
    .limit(limit);

  const channelIds = [...new Set(rows.map((r) => r.channelId).filter(Boolean) as string[])];
  const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean) as string[])];

  const [channelRows, userRows] = await Promise.all([
    channelIds.length > 0
      ? d.select({ id: channels.id, name: channels.name }).from(channels).where(inArray(channels.id, channelIds))
      : [],
    userIds.length > 0
      ? d.select({ id: users.id, department: users.department }).from(users).where(inArray(users.id, userIds))
      : [],
  ]);

  const channelNameMap = new Map(channelRows.map((c) => [c.id, c.name ?? c.id]));
  const deptMap = new Map(userRows.map((u) => [u.id, u.department ?? "Unknown"]));

  return rows.map((r) => ({
    text: r.text!,
    channelName: channelNameMap.get(r.channelId ?? "") ?? "general",
    department: deptMap.get(r.userId ?? "") ?? "Unknown",
  }));
}

// Re-export for convenience so callers don't need to import schema separately
export { routerScores };
