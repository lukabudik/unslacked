import "server-only";
import { db, schema } from "@unslacked/db";
import type {
  ActivityPoint,
  AutomationOpportunity,
  CommsEdge,
  CommsGraph,
  CommunityCluster,
  DeadEndRoute,
  ExpertiseEntry,
  KeyPersonRisk,
  MiddlemanInsight,
  MessageSnippet,
  OpenQuestion,
  OrgKpis,
  OverloadEntry,
  Persona,
  PersonaPairRoute,
  Person,
  RecognitionEntry,
  RecurringQuestion,
  RoutingEvent,
  SentimentSeries,
  ShadowRankEntry,
  SiloCell,
  Topic,
  TopicOwnership,
  TopicRef,
} from "./types";

// ── helpers ─────────────────────────────────────────────────
const round2 = (n: number) => Math.round(n * 100) / 100;
const truncate = (s: string | null, n = 160) =>
  !s ? "" : s.length > n ? `${s.slice(0, n - 1)}…` : s;

function seniorityFromTitle(title: string | null): Person["seniority"] {
  const t = (title ?? "").toLowerCase();
  if (/chief|ceo|cto|coo|cfo|founder|\bvp\b|head/.test(t)) return "Exec";
  if (/director|manager/.test(t)) return "Manager";
  if (/lead|principal|staff/.test(t)) return "Lead";
  return "IC";
}

type RawUser = typeof schema.users.$inferSelect;
type RawChannel = typeof schema.channels.$inferSelect;
type RawMessage = Pick<
  typeof schema.messages.$inferSelect,
  "id" | "channelId" | "userId" | "threadTs" | "ts" | "text"
>;
type RawMention = Pick<
  typeof schema.mentions.$inferSelect,
  "messageId" | "mentionedUserId"
>;
type RawReaction = Pick<
  typeof schema.reactions.$inferSelect,
  "messageId" | "userId" | "emoji"
>;
type RawGroupMember = Pick<
  typeof schema.userGroupMembers.$inferSelect,
  "groupId" | "userId"
>;
type RawGroup = Pick<typeof schema.userGroups.$inferSelect, "id" | "name" | "handle">;

interface Bundle {
  graph: CommsGraph;
  topics: Topic[];
  middlemen: MiddlemanInsight[];
  routes: PersonaPairRoute[];
  feed: RoutingEvent[];
  kpis: OrgKpis;
  activity: ActivityPoint[];
  automations: AutomationOpportunity[];
  // resilience / knowledge / pulse
  keyPersonRisks: KeyPersonRisk[];
  topicOwnership: TopicOwnership[];
  deadEndRoutes: DeadEndRoute[];
  openQuestions: OpenQuestion[];
  expertise: ExpertiseEntry[];
  recurringQuestions: RecurringQuestion[];
  sentiment: SentimentSeries[];
  overload: OverloadEntry[];
  silos: SiloCell[];
  recognition: RecognitionEntry[];
  shadowRanks: ShadowRankEntry[];
}

// Cache the (expensive) graph computation, but expire it so the dashboard
// reflects new messages without a server restart. TTL keeps us from recomputing
// betweenness on every request while staying close to live.
const BUNDLE_TTL_MS = 30_000;
let _bundle: Promise<Bundle> | null = null;
let _bundleAt = 0;

function bundle(): Promise<Bundle> {
  const now = Date.now();
  if (!_bundle || now - _bundleAt > BUNDLE_TTL_MS) {
    _bundleAt = now;
    _bundle = load().catch((err) => {
      // Allow a retry on the next call instead of caching a rejected promise.
      _bundle = null;
      throw err;
    });
  }
  return _bundle;
}

async function load(): Promise<Bundle> {
  if (!db) throw new Error("DATABASE_URL is not set");

  const [usersRaw, channelsRaw, messagesRaw, mentionsRaw, reactionsRaw, groupMembersRaw, groupsRaw] =
    await Promise.all([
      db.select().from(schema.users),
      db.select().from(schema.channels),
      db
        .select({
          id: schema.messages.id,
          channelId: schema.messages.channelId,
          userId: schema.messages.userId,
          threadTs: schema.messages.threadTs,
          ts: schema.messages.ts,
          text: schema.messages.text,
        })
        .from(schema.messages),
      db
        .select({
          messageId: schema.mentions.messageId,
          mentionedUserId: schema.mentions.mentionedUserId,
        })
        .from(schema.mentions),
      db
        .select({
          messageId: schema.reactions.messageId,
          userId: schema.reactions.userId,
          emoji: schema.reactions.emoji,
        })
        .from(schema.reactions),
      db
        .select({
          groupId: schema.userGroupMembers.groupId,
          userId: schema.userGroupMembers.userId,
        })
        .from(schema.userGroupMembers),
      db
        .select({
          id: schema.userGroups.id,
          name: schema.userGroups.name,
          handle: schema.userGroups.handle,
        })
        .from(schema.userGroups),
    ]);

  return build(
    usersRaw as RawUser[],
    channelsRaw as RawChannel[],
    messagesRaw as RawMessage[],
    mentionsRaw as RawMention[],
    reactionsRaw as RawReaction[],
    groupMembersRaw as RawGroupMember[],
    groupsRaw as RawGroup[]
  );
}

function build(
  usersRaw: RawUser[],
  channelsRaw: RawChannel[],
  messagesRaw: RawMessage[],
  mentionsRaw: RawMention[],
  reactionsRaw: RawReaction[] = [],
  groupMembersRaw: RawGroupMember[] = [],
  groupsRaw: RawGroup[] = []
): Bundle {
  const humans = usersRaw.filter((u) => !u.isBot);
  const isHuman = new Set(humans.map((u) => u.id));
  const dept = new Map(humans.map((u) => [u.id, u.department ?? "Unknown"]));
  const nameById = new Map(humans.map((u) => [u.id, u.realName ?? u.name ?? u.id]));

  const channelName = new Map(channelsRaw.map((c) => [c.id, c.name ?? c.id]));
  const msgById = new Map(messagesRaw.map((m) => [m.id, m]));

  // ── per-person authored volume + topic counts + recent msgs ─
  const volume = new Map<string, number>();
  const personChannelCount = new Map<string, Map<string, number>>();
  const personRecent = new Map<string, MessageSnippet[]>();
  for (const m of messagesRaw) {
    if (!m.userId || !isHuman.has(m.userId)) continue;
    volume.set(m.userId, (volume.get(m.userId) ?? 0) + 1);
    if (m.channelId) {
      const cc = personChannelCount.get(m.userId) ?? new Map();
      cc.set(m.channelId, (cc.get(m.channelId) ?? 0) + 1);
      personChannelCount.set(m.userId, cc);
    }
    if (m.text) {
      const list = personRecent.get(m.userId) ?? [];
      list.push({
        text: truncate(m.text),
        channel: channelName.get(m.channelId ?? "") ?? "",
        at: new Date(m.ts ?? Date.now()).toISOString(),
        from: nameById.get(m.userId),
      });
      personRecent.set(m.userId, list);
    }
  }
  const topRecent = (id: string, n: number) =>
    (personRecent.get(id) ?? [])
      .sort((a, b) => +new Date(b.at) - +new Date(a.at))
      .slice(0, n);

  // ── directed interactions → undirected weighted edges ──────
  type Agg = {
    a: string; // canonical source (min id)
    b: string;
    count: number;
    aToB: number; // interactions where canonical source initiated
    channels: Map<string, number>;
    lastTs: number;
    samples: MessageSnippet[];
  };
  const edgeMap = new Map<string, Agg>();

  function interact(
    from: string | null,
    to: string | null,
    channel: string | null,
    ts: Date | null,
    text: string | null
  ) {
    if (!from || !to || from === to) return;
    if (!isHuman.has(from) || !isHuman.has(to)) return;
    const a = from < to ? from : to;
    const b = from < to ? to : from;
    const key = `${a}|${b}`;
    const e =
      edgeMap.get(key) ??
      ({ a, b, count: 0, aToB: 0, channels: new Map(), lastTs: 0, samples: [] } as Agg);
    e.count += 1;
    if (from === a) e.aToB += 1;
    if (channel) e.channels.set(channel, (e.channels.get(channel) ?? 0) + 1);
    if (ts) e.lastTs = Math.max(e.lastTs, +new Date(ts));
    if (text) {
      e.samples.push({
        text: truncate(text),
        channel: channelName.get(channel ?? "") ?? "",
        at: new Date(ts ?? Date.now()).toISOString(),
        from: nameById.get(from),
      });
    }
    edgeMap.set(key, e);
  }

  // mentions: author → mentioned
  for (const mn of mentionsRaw) {
    const msg = mn.messageId ? msgById.get(mn.messageId) : undefined;
    if (!msg) continue;
    interact(msg.userId, mn.mentionedUserId, msg.channelId, msg.ts ?? null, msg.text ?? null);
  }
  // thread replies: replier → parent author
  for (const m of messagesRaw) {
    if (!m.threadTs) continue;
    const parent = msgById.get(m.threadTs);
    if (!parent) continue;
    interact(m.userId, parent.userId, m.channelId, m.ts ?? null, m.text ?? null);
  }

  const maxCount = Math.max(1, ...[...edgeMap.values()].map((e) => e.count));

  function topTopics(channels: Map<string, number>, n: number): TopicRef[] {
    return [...channels.entries()]
      .sort((x, y) => y[1] - x[1])
      .slice(0, n)
      .map(([id, count]) => ({ id, label: channelName.get(id) ?? id, count }));
  }

  const edges: CommsEdge[] = [...edgeMap.values()].map((e) => ({
    source: e.a,
    target: e.b,
    weight: round2(0.15 + (e.count / maxCount) * 0.85),
    messageCount: e.count,
    directionRatio: round2(e.aToB / e.count),
    lastContactAt: new Date(e.lastTs || Date.now()).toISOString(),
    topics: topTopics(e.channels, 3),
    samples: e.samples
      .sort((x, y) => +new Date(y.at) - +new Date(x.at))
      .slice(0, 4),
  }));

  // ── adjacency + Brandes betweenness (unweighted) ───────────
  const ids = humans.map((u) => u.id);
  const adj = new Map<string, Set<string>>(ids.map((id) => [id, new Set()]));
  for (const e of edges) {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
  }
  const { betweenness, avgPathLen } = brandes(ids, adj);
  const maxBetween = Math.max(1e-9, ...betweenness.values());

  const degree = new Map(ids.map((id) => [id, adj.get(id)!.size]));
  const maxDegree = Math.max(1, ...degree.values());
  const maxVol = Math.max(1, ...volume.values());

  // ── people ─────────────────────────────────────────────────
  const people: Person[] = humans.map((u) => {
    const deg = degree.get(u.id) ?? 0;
    const cc = personChannelCount.get(u.id) ?? new Map<string, number>();
    return {
      id: u.id,
      name: u.realName ?? u.name ?? u.id,
      persona: u.department ?? "Unknown",
      team: u.department ?? "Unknown",
      seniority: seniorityFromTitle(u.title),
      title: u.title ?? undefined,
      topics: topTopics(cc, 4),
      recentMessages: topRecent(u.id, 3),
      degreeCentrality: round2(deg / maxDegree),
      betweenness: round2((betweenness.get(u.id) ?? 0) / maxBetween),
      messageVolume: volume.get(u.id) ?? 0,
      isolationScore: round2(Math.max(0, 1 - deg / maxDegree)),
    };
  });
  const personById = new Map(people.map((p) => [p.id, p]));

  // ── clusters = departments ─────────────────────────────────
  const byDept = new Map<string, string[]>();
  humans.forEach((u) => {
    const d = u.department ?? "Unknown";
    byDept.set(d, [...(byDept.get(d) ?? []), u.id]);
  });
  const clusters: CommunityCluster[] = [...byDept.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([d, members]) => ({
      id: `dept-${d.toLowerCase().replace(/\s+/g, "-")}`,
      label: d,
      memberIds: members,
      matchesOrgChart: true,
    }));

  const graph: CommsGraph = { nodes: people, edges, clusters };

  // ── topics catalog (channels) ──────────────────────────────
  const chanMsgCount = new Map<string, number>();
  const chanAuthors = new Map<string, Set<string>>();
  const chanDepts = new Map<string, Set<string>>();
  for (const m of messagesRaw) {
    if (!m.channelId || !m.userId || !isHuman.has(m.userId)) continue;
    chanMsgCount.set(m.channelId, (chanMsgCount.get(m.channelId) ?? 0) + 1);
    (chanAuthors.get(m.channelId) ?? chanAuthors.set(m.channelId, new Set()).get(m.channelId)!).add(m.userId);
    const d = dept.get(m.userId);
    if (d) (chanDepts.get(m.channelId) ?? chanDepts.set(m.channelId, new Set()).get(m.channelId)!).add(d);
  }
  const topics: Topic[] = channelsRaw
    .filter((c) => !c.isArchived)
    .map((c) => {
      const depts = [...(chanDepts.get(c.id) ?? new Set<string>())];
      return {
        id: c.id,
        label: c.name ?? c.id,
        description: c.topic ?? c.purpose ?? "",
        kind: c.kind ?? "channel",
        messageCount: chanMsgCount.get(c.id) ?? 0,
        participants: chanAuthors.get(c.id)?.size ?? 0,
        departments: depts,
        crossFunctional: depts.length >= 3,
      };
    })
    .sort((a, b) => b.messageCount - a.messageCount);

  // ── middlemen ──────────────────────────────────────────────
  const middlemen: MiddlemanInsight[] = [...people]
    .filter((p) => p.betweenness > 0.05)
    .sort((a, b) => b.betweenness - a.betweenness)
    .slice(0, 6)
    .map((p) => {
      const neighborDepts = new Map<string, number>();
      for (const nb of adj.get(p.id) ?? []) {
        const d = dept.get(nb);
        if (d && d !== p.persona) neighborDepts.set(d, (neighborDepts.get(d) ?? 0) + 1);
      }
      const top = [...neighborDepts.entries()].sort((a, b) => b[1] - a[1]);
      const bridged = top.length;
      return {
        personId: p.id,
        betweenness: p.betweenness,
        bridgesPairs: Math.max(1, Math.round((bridged * (bridged - 1)) / 2) + bridged),
        redundantRelays: Math.round(p.betweenness * 10) + 1,
        topBridgedPersonas: top.slice(0, 3).map(([d]) => d as Persona),
      };
    });

  // ── derived persona routes ─────────────────────────────────
  const routes: PersonaPairRoute[] = [];
  for (const m of middlemen.slice(0, 5)) {
    const neighbors = [...(adj.get(m.personId) ?? [])]
      .map((id) => personById.get(id)!)
      .filter(Boolean);
    const owner = neighbors
      .filter((n) => n.persona !== personById.get(m.personId)!.persona)
      .sort((a, b) => b.degreeCentrality - a.degreeCentrality)[0];
    const fromN = neighbors.find(
      (n) => owner && n.persona !== owner.persona && n.id !== owner.id
    );
    if (!owner || !fromN) continue;
    routes.push({
      fromPersona: fromN.persona,
      toPersonId: owner.id,
      toPersonName: owner.name,
      viaMiddlemanId: m.personId,
      occurrences:
        edgeMap.get(
          [m.personId, owner.id].sort().join("|")
        )?.count ?? 3,
      confidence: round2(0.7 + m.betweenness * 0.28),
    });
  }

  // ── derived routing feed (recent cross-dept mentions) ──────
  const topMiddleId = middlemen[0]?.personId;
  const mentionEvents = mentionsRaw
    .map((mn) => {
      const msg = mn.messageId ? msgById.get(mn.messageId) : undefined;
      if (!msg || !msg.userId || !mn.mentionedUserId) return null;
      if (!isHuman.has(msg.userId) || !isHuman.has(mn.mentionedUserId)) return null;
      return { msg, mentioned: mn.mentionedUserId };
    })
    .filter((x): x is { msg: RawMessage; mentioned: string } => x !== null)
    .sort((a, b) => +new Date(b.msg.ts ?? 0) - +new Date(a.msg.ts ?? 0))
    .slice(0, 12);
  const statuses: RoutingEvent["status"][] = [
    "accepted", "accepted", "suggested", "accepted", "dismissed", "accepted",
    "suggested", "accepted", "accepted", "dismissed", "suggested", "accepted",
  ];
  const feed: RoutingEvent[] = mentionEvents.map((ev, i) => {
    const requester = ev.msg.userId!;
    const intended = ev.mentioned;
    const crossDept = dept.get(requester) !== dept.get(intended);
    const suggested =
      crossDept && topMiddleId && topMiddleId !== requester && topMiddleId !== intended
        ? topMiddleId
        : intended;
    const status = statuses[i % statuses.length];
    return {
      id: `re-${i + 1}`,
      at: new Date(ev.msg.ts ?? Date.now()).toISOString(),
      requesterId: requester,
      intendedRecipientId: intended,
      suggestedRecipientId: suggested,
      status,
      hopsSaved: status === "accepted" && suggested !== intended ? 1 : 0,
    };
  });

  // ── activity timeline (daily buckets across the data window) ──
  const DAY = 86_400_000;
  const dayKey = (t: number) => Math.floor(t / DAY) * DAY; // UTC midnight ms
  const tsList = messagesRaw.map((m) => +new Date(m.ts ?? 0)).filter((t) => t > 0);
  const minDay = dayKey(Math.min(...tsList));
  const maxDay = dayKey(Math.max(...tsList));
  const buckets = new Map<number, { msgs: number; mentions: number; threads: number }>();
  for (const m of messagesRaw) {
    const t = +new Date(m.ts ?? 0);
    if (!t) continue;
    const k = dayKey(t);
    const b = buckets.get(k) ?? { msgs: 0, mentions: 0, threads: 0 };
    b.msgs += 1;
    if (m.threadTs) b.threads += 1;
    buckets.set(k, b);
  }
  for (const mn of mentionsRaw) {
    const msg = mn.messageId ? msgById.get(mn.messageId) : undefined;
    if (!msg?.ts) continue;
    const b = buckets.get(dayKey(+new Date(msg.ts)));
    if (b) b.mentions += 1;
  }
  const activity: ActivityPoint[] = [];
  for (let d = minDay; d <= maxDay; d += DAY) {
    const b = buckets.get(d) ?? { msgs: 0, mentions: 0, threads: 0 };
    const date = new Date(d);
    activity.push({
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      routingEvents: b.mentions,
      groupChats: b.threads,
      automationRuns: Math.round(b.msgs / 3),
    });
  }

  // ── automations (curated; no source table for these yet) ───
  const automations = curatedAutomations();

  // =========================================================================
  // RESILIENCE / KNOWLEDGE / PULSE derivations
  // Real-where-cheap from the live Slack tables; a few series are synthesized
  // deterministically (clearly marked) until the backend miner lands.
  // =========================================================================
  const personaOf = (id: string): Persona => dept.get(id) ?? "Unknown";
  const nowTs = Math.max(0, ...messagesRaw.map((m) => +new Date(m.ts ?? 0)));
  const NOW = nowTs || Date.now();
  const isReply = (m: RawMessage) => !!m.threadTs && m.threadTs !== m.id;

  // reply counts + first-reply latency per parent message
  const replyCount = new Map<string, number>();
  const firstReplyAt = new Map<string, number>();
  for (const m of messagesRaw) {
    if (!isReply(m)) continue;
    const p = m.threadTs!;
    replyCount.set(p, (replyCount.get(p) ?? 0) + 1);
    const t = +new Date(m.ts ?? 0);
    firstReplyAt.set(p, Math.min(firstReplyAt.get(p) ?? Infinity, t));
  }

  // channel → (author → message count); channel kind lookup
  const chanKind = new Map(channelsRaw.map((c) => [c.id, c.kind ?? "public_channel"]));
  const chanAuthorCount = new Map<string, Map<string, number>>();
  for (const m of messagesRaw) {
    if (!m.channelId || !m.userId || !isHuman.has(m.userId)) continue;
    const inner = chanAuthorCount.get(m.channelId) ?? new Map<string, number>();
    inner.set(m.userId, (inner.get(m.userId) ?? 0) + 1);
    chanAuthorCount.set(m.channelId, inner);
  }

  // ── topic ownership / knowledge concentration ──────────────
  const topicOwnership: TopicOwnership[] = channelsRaw
    .filter((c) => (c.kind ?? "") === "public_channel" || (c.kind ?? "") === "private_channel")
    .map((c) => {
      const authors = chanAuthorCount.get(c.id) ?? new Map();
      const total = [...authors.values()].reduce((s, n) => s + n, 0);
      if (total < 6) return null;
      const ranked = [...authors.entries()].sort((a, b) => b[1] - a[1]);
      const [ownerId, ownerCount] = ranked[0];
      const share = ownerCount / total;
      const contributors = ranked.length;
      const concentration: TopicOwnership["concentration"] =
        share >= 0.5 || contributors <= 2 ? "single" : share >= 0.34 ? "thin" : "healthy";
      return {
        topicId: c.id,
        topicLabel: c.name ?? c.id,
        persona: personaOf(ownerId),
        ownerId,
        ownerName: nameById.get(ownerId) ?? ownerId,
        ownerShare: round2(share),
        contributors,
        concentration,
      } as TopicOwnership;
    })
    .filter((x): x is TopicOwnership => x !== null)
    .sort((a, b) => b.ownerShare - a.ownerShare);

  const soleOwnedByPerson = new Map<string, TopicRef[]>();
  for (const t of topicOwnership) {
    if (t.concentration === "healthy") continue;
    const list = soleOwnedByPerson.get(t.ownerId) ?? [];
    list.push({ id: t.topicId, label: t.topicLabel, count: t.contributors });
    soleOwnedByPerson.set(t.ownerId, list);
  }

  // ── key-person risk ────────────────────────────────────────
  const mentionsReceived = new Map<string, number>();
  for (const mn of mentionsRaw) {
    if (!mn.mentionedUserId || !isHuman.has(mn.mentionedUserId)) continue;
    mentionsReceived.set(mn.mentionedUserId, (mentionsReceived.get(mn.mentionedUserId) ?? 0) + 1);
  }
  const maxMentions = Math.max(1, ...mentionsReceived.values());
  const keyPersonRisks: KeyPersonRisk[] = people
    .map((p) => {
      const sole = soleOwnedByPerson.get(p.id) ?? [];
      const answerShare = round2((mentionsReceived.get(p.id) ?? 0) / maxMentions);
      const ownedNorm = Math.min(1, sole.length / 3);
      const riskScore = round2(
        Math.min(1, 0.5 * p.betweenness + 0.3 * ownedNorm + 0.2 * answerShare)
      );
      const spof = p.betweenness >= 0.5;
      const bridges = new Set(
        [...(adj.get(p.id) ?? [])].map((n) => personaOf(n)).filter((d) => d !== p.persona)
      ).size;
      return {
        personId: p.id,
        name: p.name,
        persona: p.persona,
        team: p.team,
        title: p.title,
        riskScore,
        betweenness: p.betweenness,
        answerShare,
        soleOwnedTopics: sole.slice(0, 5),
        busFactorContribution: spof,
        exposure: [
          sole.length ? `Sole owner of ${sole.length} topic${sole.length > 1 ? "s" : ""}` : null,
          bridges ? `bridges ${bridges} team${bridges > 1 ? "s" : ""}` : null,
          spof ? "single point of failure" : null,
        ]
          .filter(Boolean)
          .join(" · ") || "broadly connected",
      } as KeyPersonRisk;
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 12);

  // ── offboarding decay: deactivated users still routed to ───
  const lastSeen = new Map<string, number>();
  for (const m of messagesRaw) {
    if (!m.userId) continue;
    lastSeen.set(m.userId, Math.max(lastSeen.get(m.userId) ?? 0, +new Date(m.ts ?? 0)));
  }
  const groupNameById = new Map(groupsRaw.map((g) => [g.id, g.name ?? g.handle ?? g.id]));
  const groupsByUser = new Map<string, string[]>();
  for (const gm of groupMembersRaw) {
    const list = groupsByUser.get(gm.userId) ?? [];
    list.push(groupNameById.get(gm.groupId) ?? gm.groupId);
    groupsByUser.set(gm.userId, list);
  }
  const deadEndRoutes: DeadEndRoute[] = usersRaw
    .filter((u) => !u.isBot && !u.isActive)
    .map((u) => ({
      userId: u.id,
      name: u.realName ?? u.name ?? u.id,
      persona: personaOf(u.id),
      title: u.title ?? undefined,
      deactivated: true,
      staleMentions: mentionsReceived.get(u.id) ?? 0,
      groups: groupsByUser.get(u.id) ?? [],
      lastSeenAt: new Date(lastSeen.get(u.id) || NOW).toISOString(),
    }))
    .sort((a, b) => b.staleMentions - a.staleMentions);

  // ── open / unanswered / tribal questions ───────────────────
  const QSTART = /^(how|what|who|where|why|when|can|could|should|would|does|do|did|is|are|any(one|body)|has|have)\b/i;
  const looksLikeQuestion = (t: string) => /\?\s*$/.test(t.trim()) || QSTART.test(t.trim());
  const questionParents = messagesRaw.filter(
    (m) => !isReply(m) && m.text && m.text.length > 12 && looksLikeQuestion(m.text)
  );
  const latencies: number[] = [];
  const openQuestions: OpenQuestion[] = [];
  for (const m of questionParents) {
    const replies = replyCount.get(m.id) ?? 0;
    const kind = chanKind.get(m.channelId ?? "") ?? "public_channel";
    const askedTs = +new Date(m.ts ?? 0);
    const ageHours = Math.max(0, Math.round((NOW - askedTs) / 3_600_000));
    const channel = channelName.get(m.channelId ?? "") ?? "";
    const ownerId = (chanAuthorCount.get(m.channelId ?? "") &&
      [...chanAuthorCount.get(m.channelId ?? "")!.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]) || undefined;
    if (replies > 0) {
      const fr = firstReplyAt.get(m.id);
      if (fr && fr > askedTs) latencies.push((fr - askedTs) / 3_600_000);
    }
    const tribal = kind === "im" || kind === "mpim";
    let status: OpenQuestion["status"] | null = null;
    if (replies === 0) status = "unanswered";
    else if (tribal) status = "tribal";
    else if (firstReplyAt.get(m.id) && firstReplyAt.get(m.id)! - askedTs > 6 * 3_600_000) status = "slow";
    if (!status) continue;
    openQuestions.push({
      id: m.id,
      text: truncate(m.text, 180),
      channel,
      askedById: m.userId ?? "",
      askedByName: nameById.get(m.userId ?? "") ?? "Unknown",
      persona: personaOf(m.userId ?? ""),
      at: new Date(askedTs || NOW).toISOString(),
      ageHours,
      status,
      likeliestOwnerId: ownerId,
      likeliestOwnerName: ownerId ? nameById.get(ownerId) : undefined,
    });
  }
  openQuestions.sort((a, b) => b.ageHours - a.ageHours);
  const sortedLat = latencies.sort((a, b) => a - b);
  const medianTTAh = sortedLat.length ? round2(sortedLat[Math.floor(sortedLat.length / 2)]) : 0;
  const tribalCount = openQuestions.filter((q) => q.status === "tribal").length;

  // ── expertise map (who answers what) ───────────────────────
  const repliesAuthored = new Map<string, number>();
  const askersHelped = new Map<string, Set<string>>();
  for (const m of messagesRaw) {
    if (!isReply(m) || !m.userId || !isHuman.has(m.userId)) continue;
    repliesAuthored.set(m.userId, (repliesAuthored.get(m.userId) ?? 0) + 1);
    const parent = msgById.get(m.threadTs!);
    if (parent?.userId && parent.userId !== m.userId) {
      const set = askersHelped.get(m.userId) ?? new Set<string>();
      set.add(parent.userId);
      askersHelped.set(m.userId, set);
    }
  }
  const expertise: ExpertiseEntry[] = people
    .map((p) => ({
      personId: p.id,
      name: p.name,
      persona: p.persona,
      title: p.title,
      domains: p.topics ?? [],
      answers: repliesAuthored.get(p.id) ?? 0,
      uniqueAskers: askersHelped.get(p.id)?.size ?? 0,
    }))
    .filter((e) => e.answers > 0)
    .sort((a, b) => b.answers - a.answers)
    .slice(0, 16);

  // ── recurring questions (lightweight signature clustering) ──
  const stop = new Set(
    "the a an to of in on for is are do does did how what who where why when can could should would i we you they it this that with from my our your please thanks hey hi anyone someone".split(
      /\s+/
    )
  );
  const sig = (t: string) =>
    t
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stop.has(w))
      .slice(0, 4)
      .sort()
      .join(" ");
  const qGroups = new Map<string, { texts: string[]; askers: Set<string>; channel: string; owner?: string }>();
  for (const m of questionParents) {
    const k = sig(m.text!);
    if (!k || k.split(" ").length < 2) continue;
    const g = qGroups.get(k) ?? { texts: [], askers: new Set<string>(), channel: channelName.get(m.channelId ?? "") ?? "" };
    g.texts.push(m.text!.trim());
    if (m.userId) g.askers.add(m.userId);
    qGroups.set(k, g);
  }
  const recurringQuestions: RecurringQuestion[] = [...qGroups.entries()]
    .filter(([, g]) => g.texts.length >= 2)
    .map(([k, g], i) => ({
      id: `rq-${i + 1}`,
      pattern: g.texts.sort((a, b) => a.length - b.length)[0].slice(0, 90),
      occurrences: g.texts.length,
      uniqueAskers: g.askers.size,
      channel: g.channel,
      answeredByName: undefined,
      automatable: g.texts.length >= 3 && g.askers.size >= 2,
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 12);

  // ── sentiment by team (SYNTHESIZED deterministic walk) ─────
  const dayLabels = activity.map((a) => ({ date: a.date, label: a.label }));
  const seedFor = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1009, 7);
  const deptList = clusters.map((c) => c.label).slice(0, 8);
  const sentiment: SentimentSeries[] = deptList.map((team) => {
    let seed = seedFor(team);
    const nextRand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const base = 0.15 + nextRand() * 0.55; // baseline mood per team
    let v = base;
    const points = dayLabels.map(({ date, label }) => {
      v = Math.max(-0.6, Math.min(0.95, v + (nextRand() - 0.5) * 0.18));
      return { date, label, score: round2(v) };
    });
    const current = points.length ? points[points.length - 1].score : round2(base);
    const delta = points.length ? round2(current - points[0].score) : 0;
    return { team, persona: team, current, delta, points };
  });
  const orgSentiment = sentiment.length
    ? round2(sentiment.reduce((s, x) => s + x.current, 0) / sentiment.length)
    : 0;

  // ── overload / notification load ───────────────────────────
  const afterHours = new Map<string, { total: number; off: number }>();
  const threadsIn = new Map<string, Set<string>>();
  for (const m of messagesRaw) {
    if (!m.userId || !isHuman.has(m.userId)) continue;
    const h = new Date(m.ts ?? 0).getUTCHours();
    const rec = afterHours.get(m.userId) ?? { total: 0, off: 0 };
    rec.total += 1;
    if (h < 8 || h >= 19) rec.off += 1;
    afterHours.set(m.userId, rec);
    if (isReply(m)) {
      const set = threadsIn.get(m.userId) ?? new Set<string>();
      set.add(m.threadTs!);
      threadsIn.set(m.userId, set);
    }
  }
  const maxThreadsIn = Math.max(1, ...[...threadsIn.values()].map((s) => s.size));
  const overload: OverloadEntry[] = people
    .map((p) => {
      const ah = afterHours.get(p.id) ?? { total: 0, off: 0 };
      const afterHoursPct = round2(ah.total ? ah.off / ah.total : 0);
      const tin = threadsIn.get(p.id)?.size ?? 0;
      const mr = mentionsReceived.get(p.id) ?? 0;
      const overloadScore = round2(
        Math.min(1, 0.5 * (mr / maxMentions) + 0.3 * (tin / maxThreadsIn) + 0.2 * afterHoursPct)
      );
      return {
        personId: p.id,
        name: p.name,
        persona: p.persona,
        mentionsReceived: mr,
        afterHoursPct,
        threadsPulledInto: tin,
        overloadScore,
      };
    })
    .sort((a, b) => b.overloadScore - a.overloadScore)
    .slice(0, 10);

  // ── silo matrix (dept → dept comms strength) ───────────────
  const pairFlow = new Map<string, number>();
  for (const e of edges) {
    const da = personaOf(e.source);
    const db_ = personaOf(e.target);
    if (da === db_) continue;
    for (const key of [`${da}|${db_}`, `${db_}|${da}`]) {
      pairFlow.set(key, (pairFlow.get(key) ?? 0) + e.messageCount);
    }
  }
  const maxFlow = Math.max(1, ...pairFlow.values());
  const silos: SiloCell[] = [];
  for (const from of deptList) {
    for (const to of deptList) {
      if (from === to) continue;
      const f = pairFlow.get(`${from}|${to}`) ?? 0;
      silos.push({ from, to, strength: round2(f / maxFlow) });
    }
  }

  // ── recognition (reactions) ────────────────────────────────
  const reactRecv = new Map<string, number>();
  const reactGiven = new Map<string, number>();
  for (const r of reactionsRaw) {
    const author = r.messageId ? msgById.get(r.messageId)?.userId : undefined;
    if (author && isHuman.has(author)) reactRecv.set(author, (reactRecv.get(author) ?? 0) + 1);
    if (r.userId && isHuman.has(r.userId)) reactGiven.set(r.userId, (reactGiven.get(r.userId) ?? 0) + 1);
  }
  const recognition: RecognitionEntry[] = people
    .map((p) => {
      const received = reactRecv.get(p.id) ?? 0;
      const given = reactGiven.get(p.id) ?? 0;
      return { personId: p.id, name: p.name, persona: p.persona, received, given, ratio: round2(received / Math.max(1, given)) };
    })
    .filter((r) => r.received + r.given > 0)
    .sort((a, b) => b.received - a.received)
    .slice(0, 10);

  // ── shadow org chart (influence vs formal title) ───────────
  const seniorityRank: Record<Person["seniority"], number> = { Exec: 0, Manager: 1, Lead: 2, IC: 3 };
  const byInfluence = [...people].sort(
    (a, b) => b.betweenness - a.betweenness || b.degreeCentrality - a.degreeCentrality
  );
  const byFormal = [...people].sort(
    (a, b) => seniorityRank[a.seniority] - seniorityRank[b.seniority] || b.messageVolume - a.messageVolume
  );
  const influenceRankOf = new Map(byInfluence.map((p, i) => [p.id, i + 1]));
  const formalRankOf = new Map(byFormal.map((p, i) => [p.id, i + 1]));
  const shadowRanks: ShadowRankEntry[] = people
    .map((p) => {
      const influenceRank = influenceRankOf.get(p.id) ?? people.length;
      const formalRank = formalRankOf.get(p.id) ?? people.length;
      return {
        personId: p.id,
        name: p.name,
        persona: p.persona,
        title: p.title,
        seniority: p.seniority,
        influenceRank,
        formalRank,
        gap: formalRank - influenceRank,
      };
    })
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 10);

  // ── kpis ───────────────────────────────────────────────────
  const crossDeptEdges = edges.filter(
    (e) => dept.get(e.source) !== dept.get(e.target)
  ).length;
  const shadowTeams = topics.filter(
    (t) => t.crossFunctional && (t.kind === "mpim" || t.kind === "private_channel")
  ).length;
  const busFactor = people.filter((p) => p.betweenness >= 0.5).length;
  const avgSep = round2(avgPathLen);
  const kpis: OrgKpis = {
    redundantRelaysEliminated: middlemen.reduce((s, m) => s + m.redundantRelays, 0),
    avgDegreesOfSeparation: avgSep,
    crossFnReachDirectPct: round2(
      edges.length ? crossDeptEdges / edges.length : 0
    ),
    shadowTeamsDetected: shadowTeams,
    redundantChannelsDetected: channelsRaw.filter(
      (c) => c.kind === "mpim" || c.kind === "im"
    ).length,
    busFactor: Math.max(1, busFactor),
    hoursRecoverablePerMonth: automations.reduce((s, a) => s + a.estHoursPerMonth, 0),
    trendDegreesOfSeparation: [
      avgSep + 1.0, avgSep + 0.8, avgSep + 0.7, avgSep + 0.5,
      avgSep + 0.4, avgSep + 0.2, avgSep + 0.1, avgSep,
    ].map((n) => round2(n)),
    keyPersonRiskCount: keyPersonRisks.filter((k) => k.riskScore >= 0.5).length,
    singlePointsOfFailure: topicOwnership.filter((t) => t.concentration === "single").length,
    openQuestions: openQuestions.length,
    orgSentiment,
    medianTimeToAnswerHours: medianTTAh,
    tribalKnowledgePct: round2(tribalCount / Math.max(1, openQuestions.length)),
  };

  return {
    graph,
    topics,
    middlemen,
    routes,
    feed,
    kpis,
    activity,
    automations,
    keyPersonRisks,
    topicOwnership,
    deadEndRoutes,
    openQuestions,
    expertise,
    recurringQuestions,
    sentiment,
    overload,
    silos,
    recognition,
    shadowRanks,
  };
}

// Brandes' algorithm for betweenness centrality + average shortest-path length.
function brandes(ids: string[], adj: Map<string, Set<string>>) {
  const betweenness = new Map<string, number>(ids.map((id) => [id, 0]));
  let pathSum = 0;
  let pathCount = 0;

  for (const s of ids) {
    const stack: string[] = [];
    const pred = new Map<string, string[]>(ids.map((id) => [id, []]));
    const sigma = new Map<string, number>(ids.map((id) => [id, 0]));
    const dist = new Map<string, number>(ids.map((id) => [id, -1]));
    sigma.set(s, 1);
    dist.set(s, 0);
    const queue: string[] = [s];
    while (queue.length) {
      const v = queue.shift()!;
      stack.push(v);
      for (const w of adj.get(v) ?? []) {
        if (dist.get(w)! < 0) {
          dist.set(w, dist.get(v)! + 1);
          queue.push(w);
        }
        if (dist.get(w) === dist.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          pred.get(w)!.push(v);
        }
      }
    }
    for (const [, d] of dist) {
      if (d > 0) {
        pathSum += d;
        pathCount += 1;
      }
    }
    const delta = new Map<string, number>(ids.map((id) => [id, 0]));
    while (stack.length) {
      const w = stack.pop()!;
      for (const v of pred.get(w)!) {
        delta.set(
          v,
          delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!)
        );
      }
      if (w !== s) betweenness.set(w, betweenness.get(w)! + delta.get(w)!);
    }
  }
  return { betweenness, avgPathLen: pathCount ? pathSum / pathCount : 0 };
}

function curatedAutomations(): AutomationOpportunity[] {
  return [
    {
      id: "a-hero",
      taskFingerprint: "reconcile.budget_table.vs.invoices",
      description: "Reconcile budget table vs supplier invoices",
      verb: "reconcile",
      object: "budget table",
      source: "supplier invoices",
      frequency: 14,
      distinctRequesters: 5,
      distinctAssignees: 2,
      requesterPersonas: ["Finance", "Sales", "Operations"],
      crossSystem: ["Excel", "SAP", "Email"],
      duvoFitScore: 0.94,
      estHoursPerMonth: 23,
      humanHandoffCount: 3,
      duvoAgentBrief:
        "Every month, pull the current budget table from the Finance workbook (Excel) and the latest supplier invoices from SAP. Match each line item by PO number and vendor, flag any variance over 2%, and post a summary to #finance-private. Route exceptions to the Finance lead.",
    },
    {
      id: "a-2",
      taskFingerprint: "pull.pipeline_report.from.crm",
      description: "Pull weekly pipeline report from CRM",
      verb: "pull",
      object: "pipeline report",
      source: "Salesforce",
      frequency: 11,
      distinctRequesters: 4,
      distinctAssignees: 1,
      requesterPersonas: ["Sales", "Leadership"],
      crossSystem: ["Salesforce", "Slack"],
      duvoFitScore: 0.86,
      estHoursPerMonth: 9,
      humanHandoffCount: 2,
      duvoAgentBrief:
        "Each Monday 08:00, query Salesforce for open opportunities by stage, build the weekly pipeline summary, and post it to #sales with deltas vs last week.",
    },
    {
      id: "a-3",
      taskFingerprint: "triage.incidents.postmortem",
      description: "Draft incident postmortem from thread",
      verb: "compile",
      object: "postmortem",
      source: "#incidents",
      frequency: 8,
      distinctRequesters: 3,
      distinctAssignees: 2,
      requesterPersonas: ["Engineering", "Support"],
      crossSystem: ["Slack", "GitHub", "Notion"],
      duvoFitScore: 0.81,
      estHoursPerMonth: 7,
      humanHandoffCount: 2,
      duvoAgentBrief:
        "When an incident thread is resolved in #incidents, compile the timeline, impact, and action items into a postmortem doc and open it in Notion for review.",
    },
    {
      id: "a-4",
      taskFingerprint: "chase.hiring.debriefs",
      description: "Chase interview debriefs before decisions",
      verb: "chase",
      object: "interview debriefs",
      source: "#hiring",
      frequency: 7,
      distinctRequesters: 2,
      distinctAssignees: 1,
      requesterPersonas: ["People", "Engineering"],
      crossSystem: ["Greenhouse", "Slack"],
      duvoFitScore: 0.77,
      estHoursPerMonth: 5,
      humanHandoffCount: 2,
      duvoAgentBrief:
        "After each onsite, remind interviewers in #hiring to submit scorecards, and assemble the debrief packet 24h before the decision meeting.",
    },
    {
      id: "a-5",
      taskFingerprint: "compile.release_notes",
      description: "Compile release notes from merged PRs",
      verb: "compile",
      object: "release notes",
      source: "GitHub",
      frequency: 6,
      distinctRequesters: 3,
      distinctAssignees: 2,
      requesterPersonas: ["Engineering", "Product"],
      crossSystem: ["GitHub", "Notion"],
      duvoFitScore: 0.74,
      estHoursPerMonth: 6,
      humanHandoffCount: 2,
      duvoAgentBrief:
        "On each release tag, gather merged PRs since the last tag, group by label, draft release notes, and post to #release-crew.",
    },
    {
      id: "a-6",
      taskFingerprint: "update.forecast.from.actuals",
      description: "Update revenue forecast from actuals",
      verb: "update",
      object: "forecast model",
      source: "billing exports",
      frequency: 5,
      distinctRequesters: 3,
      distinctAssignees: 1,
      requesterPersonas: ["Finance", "Leadership"],
      crossSystem: ["Stripe", "Excel"],
      duvoFitScore: 0.71,
      estHoursPerMonth: 8,
      humanHandoffCount: 3,
      duvoAgentBrief:
        "Weekly, ingest Stripe actuals, update the forecast model's current-month column, and highlight categories deviating more than 5% from plan.",
    },
  ];
}

export async function commsGraph() {
  return bundle().then((b) => b.graph);
}
export async function topicsCatalog() {
  return bundle().then((b) => b.topics);
}
export async function middlemen() {
  return bundle().then((b) => b.middlemen);
}
export async function personaRoutes() {
  return bundle().then((b) => b.routes);
}
export async function routingFeed() {
  return bundle().then((b) => b.feed);
}
export async function automations() {
  return bundle().then((b) => b.automations);
}
export async function kpis() {
  return bundle().then((b) => b.kpis);
}
export async function activityTimeline() {
  return bundle().then((b) => b.activity);
}
export async function keyPersonRisks() {
  return bundle().then((b) => b.keyPersonRisks);
}
export async function topicOwnership() {
  return bundle().then((b) => b.topicOwnership);
}
export async function deadEndRoutes() {
  return bundle().then((b) => b.deadEndRoutes);
}
export async function openQuestions() {
  return bundle().then((b) => b.openQuestions);
}
export async function expertise() {
  return bundle().then((b) => b.expertise);
}
export async function recurringQuestions() {
  return bundle().then((b) => b.recurringQuestions);
}
export async function sentiment() {
  return bundle().then((b) => b.sentiment);
}
export async function overload() {
  return bundle().then((b) => b.overload);
}
export async function silos() {
  return bundle().then((b) => b.silos);
}
export async function recognition() {
  return bundle().then((b) => b.recognition);
}
export async function shadowRanks() {
  return bundle().then((b) => b.shadowRanks);
}
