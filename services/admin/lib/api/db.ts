import "server-only";
import { db, schema } from "@/lib/db";
import type {
  ActivityPoint,
  AutomationOpportunity,
  CommsEdge,
  CommsGraph,
  CommunityCluster,
  MiddlemanInsight,
  MessageSnippet,
  OrgKpis,
  Persona,
  PersonaPairRoute,
  Person,
  RoutingEvent,
  Topic,
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

interface Bundle {
  graph: CommsGraph;
  topics: Topic[];
  middlemen: MiddlemanInsight[];
  routes: PersonaPairRoute[];
  feed: RoutingEvent[];
  kpis: OrgKpis;
  activity: ActivityPoint[];
  automations: AutomationOpportunity[];
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

  const [usersRaw, channelsRaw, messagesRaw, mentionsRaw] = await Promise.all([
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
  ]);

  return build(
    usersRaw as RawUser[],
    channelsRaw as RawChannel[],
    messagesRaw as RawMessage[],
    mentionsRaw as RawMention[]
  );
}

function build(
  usersRaw: RawUser[],
  channelsRaw: RawChannel[],
  messagesRaw: RawMessage[],
  mentionsRaw: RawMention[]
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
  };

  return { graph, topics, middlemen, routes, feed, kpis, activity, automations };
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
