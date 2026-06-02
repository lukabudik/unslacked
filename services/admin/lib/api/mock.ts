import { faker } from "@faker-js/faker";
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
} from "./types";

// ── Deterministic RNG ───────────────────────────────────────
// mulberry32 — fully deterministic across runs/engines so the demo
// looks identical every time.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 42;
const rand = mulberry32(SEED);
faker.seed(SEED);

const rnd = (min: number, max: number) => min + rand() * (max - min);
const rndInt = (min: number, max: number) => Math.floor(rnd(min, max + 1));
const round2 = (n: number) => Math.round(n * 100) / 100;
const pick = <T>(arr: T[]): T => arr[rndInt(0, arr.length - 1)];

// ── Roster definition (controls the narrative) ──────────────
type Seniority = Person["seniority"];
interface RosterEntry {
  persona: Persona;
  seniority: Seniority;
  clusterIdx: number;
  middleman?: { betweenness: number; bridges: Persona[] };
}

// Clusters: 3 that match the org chart + 1 detected "shadow team"
// whose members span multiple org functions (the board insight).
const clusterMeta = [
  { id: "c-revenue", label: "Revenue Pod", matchesOrgChart: true },
  { id: "c-platform", label: "Platform Engineering", matchesOrgChart: true },
  { id: "c-backoffice", label: "Back Office", matchesOrgChart: true },
  { id: "c-warroom", label: "Budget War Room", matchesOrgChart: false },
];

const roster: RosterEntry[] = [
  // Cluster 0 — Revenue Pod (GTM-heavy, org-aligned)
  { persona: "GTM", seniority: "Manager", clusterIdx: 0, middleman: { betweenness: 0.78, bridges: ["GTM", "Engineering", "Finance"] } },
  { persona: "GTM", seniority: "IC", clusterIdx: 0 },
  { persona: "GTM", seniority: "IC", clusterIdx: 0 },
  { persona: "GTM", seniority: "Lead", clusterIdx: 0 },
  { persona: "Leadership", seniority: "Exec", clusterIdx: 0 },
  { persona: "Product", seniority: "IC", clusterIdx: 0 },

  // Cluster 1 — Platform Engineering (org-aligned)
  { persona: "Engineering", seniority: "Manager", clusterIdx: 1, middleman: { betweenness: 0.72, bridges: ["Engineering", "Product", "GTM"] } },
  { persona: "Engineering", seniority: "Lead", clusterIdx: 1 },
  { persona: "Engineering", seniority: "IC", clusterIdx: 1 },
  { persona: "Engineering", seniority: "IC", clusterIdx: 1 },
  { persona: "Engineering", seniority: "IC", clusterIdx: 1 },
  { persona: "Product", seniority: "Lead", clusterIdx: 1 },
  { persona: "Product", seniority: "IC", clusterIdx: 1 },

  // Cluster 2 — Back Office (Finance/HR/Legal/Ops, org-aligned)
  { persona: "Finance", seniority: "Lead", clusterIdx: 2, middleman: { betweenness: 0.66, bridges: ["Finance", "Ops", "Leadership"] } },
  { persona: "Finance", seniority: "IC", clusterIdx: 2 },
  { persona: "HR", seniority: "Manager", clusterIdx: 2 },
  { persona: "HR", seniority: "IC", clusterIdx: 2 },
  { persona: "Legal", seniority: "Lead", clusterIdx: 2 },
  { persona: "Ops", seniority: "IC", clusterIdx: 2 },
  { persona: "Ops", seniority: "IC", clusterIdx: 2 },

  // Cluster 3 — Budget War Room (SHADOW TEAM, cross-functional)
  { persona: "Ops", seniority: "Lead", clusterIdx: 3, middleman: { betweenness: 0.95, bridges: ["Finance", "GTM", "Engineering", "Ops"] } },
  { persona: "Finance", seniority: "Manager", clusterIdx: 3, middleman: { betweenness: 0.61, bridges: ["Finance", "GTM"] } },
  { persona: "Finance", seniority: "IC", clusterIdx: 3 },
  { persona: "GTM", seniority: "IC", clusterIdx: 3 },
  { persona: "GTM", seniority: "Lead", clusterIdx: 3 },
  { persona: "Engineering", seniority: "IC", clusterIdx: 3 },
  { persona: "Engineering", seniority: "Lead", clusterIdx: 3 },
  { persona: "Product", seniority: "IC", clusterIdx: 3 },
];

// ── Build the graph once (cached singleton) ─────────────────
function buildGraph(): CommsGraph {
  const people: Person[] = roster.map((entry, i) => {
    const id = `p${String(i + 1).padStart(2, "0")}`;
    const name = faker.person.fullName();
    return {
      id,
      name,
      persona: entry.persona,
      team: clusterMeta[entry.clusterIdx].label,
      seniority: entry.seniority,
      avatarUrl: undefined,
      // metrics filled in after edges are built
      degreeCentrality: 0,
      betweenness: entry.middleman?.betweenness ?? 0,
      messageVolume: 0,
      isolationScore: 0,
    };
  });

  const clusters: CommunityCluster[] = clusterMeta.map((c, idx) => ({
    id: c.id,
    label: c.label,
    matchesOrgChart: c.matchesOrgChart,
    memberIds: people
      .filter((_, i) => roster[i].clusterIdx === idx)
      .map((p) => p.id),
  }));

  const middlemanIdx = roster
    .map((r, i) => (r.middleman ? i : -1))
    .filter((i) => i >= 0);

  // Edge accumulator keyed by unordered pair
  const edgeMap = new Map<string, CommsEdge>();
  const now = Date.now();
  const isoBack = (daysMax: number) =>
    new Date(now - rndInt(0, daysMax) * 86_400_000 - rndInt(0, 23) * 3_600_000).toISOString();

  function addEdge(aIdx: number, bIdx: number, baseWeight: number) {
    if (aIdx === bIdx) return;
    const a = people[aIdx].id;
    const b = people[bIdx].id;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (edgeMap.has(key)) {
      const e = edgeMap.get(key)!;
      e.messageCount += rndInt(3, 20);
      e.weight = round2(Math.min(1, e.weight + 0.08));
      return;
    }
    const messageCount = rndInt(6, 90);
    edgeMap.set(key, {
      source: a < b ? a : b,
      target: a < b ? b : a,
      weight: round2(Math.min(1, baseWeight + rnd(-0.1, 0.15))),
      messageCount,
      directionRatio: round2(rnd(0.3, 0.7)),
      lastContactAt: isoBack(21),
    });
  }

  // Dense intra-cluster comms
  clusterMeta.forEach((_, idx) => {
    const members = roster
      .map((r, i) => (r.clusterIdx === idx ? i : -1))
      .filter((i) => i >= 0);
    // ring to guarantee connectivity
    for (let k = 0; k < members.length; k++) {
      addEdge(members[k], members[(k + 1) % members.length], rnd(0.55, 0.85));
    }
    // extra random intra edges
    const extra = members.length * 2;
    for (let e = 0; e < extra; e++) {
      addEdge(pick(members), pick(members), rnd(0.45, 0.8));
    }
  });

  // Cross-cluster bridges routed through middlemen → gives them betweenness
  middlemanIdx.forEach((mi) => {
    const home = roster[mi].clusterIdx;
    const others = roster
      .map((r, i) => (r.clusterIdx !== home ? i : -1))
      .filter((i) => i >= 0);
    const bridgeCount = rndInt(5, 9);
    for (let b = 0; b < bridgeCount; b++) {
      addEdge(mi, pick(others), rnd(0.35, 0.7));
    }
  });

  // A few non-middleman cross edges so it isn't perfectly clean
  for (let i = 0; i < 8; i++) {
    addEdge(rndInt(0, people.length - 1), rndInt(0, people.length - 1), rnd(0.2, 0.45));
  }

  const edges = Array.from(edgeMap.values());

  // ── Derive node metrics from edges ────────────────────────
  const degree = new Map<string, number>();
  const volume = new Map<string, number>();
  people.forEach((p) => {
    degree.set(p.id, 0);
    volume.set(p.id, 0);
  });
  edges.forEach((e) => {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    volume.set(e.source, (volume.get(e.source) ?? 0) + e.messageCount);
    volume.set(e.target, (volume.get(e.target) ?? 0) + e.messageCount);
  });
  const maxDegree = Math.max(...degree.values());
  const maxVolume = Math.max(...volume.values());

  people.forEach((p) => {
    const deg = degree.get(p.id) ?? 0;
    p.degreeCentrality = round2(deg / maxDegree);
    p.messageVolume = volume.get(p.id) ?? 0;
    // isolation: low degree + low cross-talk. A couple of true isolates emerge.
    p.isolationScore = round2(Math.max(0, 1 - deg / maxDegree - rnd(0, 0.1)));
  });

  // Two deliberately isolated voices for the narrative
  people[16].isolationScore = 0.88; // an HR IC
  people[12].isolationScore = 0.81; // a Product IC

  // normalize betweenness already set on middlemen; everyone else gets a
  // small value proportional to cross-cluster degree
  const clusterOf = new Map<string, number>();
  roster.forEach((r, i) => clusterOf.set(people[i].id, r.clusterIdx));
  const crossDeg = new Map<string, number>();
  edges.forEach((e) => {
    if (clusterOf.get(e.source) !== clusterOf.get(e.target)) {
      crossDeg.set(e.source, (crossDeg.get(e.source) ?? 0) + 1);
      crossDeg.set(e.target, (crossDeg.get(e.target) ?? 0) + 1);
    }
  });
  const maxCross = Math.max(1, ...crossDeg.values());
  people.forEach((p, i) => {
    if (!roster[i].middleman) {
      p.betweenness = round2(((crossDeg.get(p.id) ?? 0) / maxCross) * 0.3);
    }
  });
  void maxVolume;

  return { nodes: people, edges, clusters };
}

let _graph: CommsGraph | null = null;
function graph(): CommsGraph {
  if (!_graph) _graph = buildGraph();
  return _graph;
}

const personById = (id: string) => graph().nodes.find((n) => n.id === id)!;

// ── Public mock API (mirrors lib/api/client.ts) ─────────────
export function commsGraph(): CommsGraph {
  return graph();
}

export function middlemen(): MiddlemanInsight[] {
  return roster
    .map((r, i) => ({ r, i }))
    .filter((x) => x.r.middleman)
    .map(({ r, i }) => {
      const p = graph().nodes[i];
      return {
        personId: p.id,
        betweenness: p.betweenness,
        bridgesPairs: Math.round(p.betweenness * 40) + rndInt(4, 14),
        redundantRelays: Math.round(p.betweenness * 18) + rndInt(1, 6),
        topBridgedPersonas: r.middleman!.bridges,
      };
    })
    .sort((a, b) => b.betweenness - a.betweenness);
}

export function personaRoutes(): PersonaPairRoute[] {
  const mids = middlemen();
  const nodes = graph().nodes;
  // Hand-authored to read cleanly: "GTM → [owner B] (via [middleman], N×, C% conf)"
  const owners = [
    { from: "GTM" as Persona, owner: "p08", via: mids[0].personId },
    { from: "Engineering" as Persona, owner: "p14", via: mids[0].personId },
    { from: "GTM" as Persona, owner: "p18", via: "p21" },
    { from: "Product" as Persona, owner: "p21", via: "p07" },
    { from: "Finance" as Persona, owner: "p05", via: "p14" },
  ];
  return owners.map((o) => {
    const ownerNode = nodes.find((n) => n.id === o.owner) ?? nodes[7];
    return {
      fromPersona: o.from,
      toPersonId: ownerNode.id,
      toPersonName: ownerNode.name,
      viaMiddlemanId: o.via,
      occurrences: rndInt(3, 9),
      confidence: round2(rnd(0.78, 0.96)),
    };
  });
}

export function routingFeed(): RoutingEvent[] {
  const nodes = graph().nodes;
  const statuses: RoutingEvent["status"][] = [
    "accepted", "accepted", "accepted", "suggested", "dismissed", "accepted",
    "suggested", "accepted", "dismissed", "accepted", "suggested", "accepted",
  ];
  const now = Date.now();
  return statuses
    .map((status, i) => {
      const requester = nodes[rndInt(0, nodes.length - 1)];
      let intended = nodes[rndInt(0, nodes.length - 1)];
      let suggested = nodes[rndInt(0, nodes.length - 1)];
      if (intended.id === requester.id) intended = nodes[(nodes.indexOf(requester) + 3) % nodes.length];
      if (suggested.id === requester.id) suggested = nodes[(nodes.indexOf(requester) + 5) % nodes.length];
      return {
        id: `r${String(i + 1).padStart(2, "0")}`,
        at: new Date(now - i * 3_600_000 - rndInt(0, 40) * 60_000).toISOString(),
        requesterId: requester.id,
        intendedRecipientId: intended.id,
        suggestedRecipientId: suggested.id,
        status,
        hopsSaved: status === "accepted" ? rndInt(1, 3) : status === "suggested" ? rndInt(1, 2) : 0,
      };
    })
    .sort((a, b) => +new Date(b.at) - +new Date(a.at));
}

export function automations(): AutomationOpportunity[] {
  const list: AutomationOpportunity[] = [
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
      requesterPersonas: ["Finance", "GTM", "Ops"],
      crossSystem: ["Excel", "SAP", "Email"],
      duvoFitScore: 0.94,
      estHoursPerMonth: 23,
      humanHandoffCount: 3,
      duvoAgentBrief:
        "Every month, pull the current budget table from the Finance workbook (Excel) and the latest supplier invoices from SAP. Match each line item by PO number and vendor, flag any variance over 2%, and post a summary to the #budget-ops channel. Route exceptions to the Finance lead. Trigger: monthly on the 1st, and on-demand when a new invoice batch lands in the shared mailbox.",
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
      requesterPersonas: ["GTM", "Leadership"],
      crossSystem: ["Salesforce", "Slack"],
      duvoFitScore: 0.86,
      estHoursPerMonth: 9,
      humanHandoffCount: 2,
      duvoAgentBrief:
        "Each Monday 08:00, query Salesforce for open opportunities by stage, build the weekly pipeline summary, and post it to #revenue with deltas vs last week. Mention deals slipping more than 14 days.",
    },
    {
      id: "a-3",
      taskFingerprint: "chase.missing.timesheets",
      description: "Chase missing timesheets before payroll",
      verb: "chase",
      object: "timesheets",
      source: "HR system",
      frequency: 9,
      distinctRequesters: 2,
      distinctAssignees: 1,
      requesterPersonas: ["HR", "Finance"],
      crossSystem: ["Workday", "Email", "Slack"],
      duvoFitScore: 0.82,
      estHoursPerMonth: 7,
      humanHandoffCount: 2,
      duvoAgentBrief:
        "Two business days before payroll cutoff, compare submitted timesheets in Workday against the active roster, DM each person with a gap, and escalate unresolved cases to their manager 24h before cutoff.",
    },
    {
      id: "a-4",
      taskFingerprint: "compile.release_notes.from.prs",
      description: "Compile release notes from merged PRs",
      verb: "compile",
      object: "release notes",
      source: "GitHub",
      frequency: 8,
      distinctRequesters: 3,
      distinctAssignees: 2,
      requesterPersonas: ["Engineering", "Product"],
      crossSystem: ["GitHub", "Notion"],
      duvoFitScore: 0.79,
      estHoursPerMonth: 6,
      humanHandoffCount: 2,
      duvoAgentBrief:
        "On each release tag, gather merged PRs since the last tag, group by label (feature/fix/chore), draft human-readable release notes, and open a Notion page for review.",
    },
    {
      id: "a-5",
      taskFingerprint: "update.forecast.from.actuals",
      description: "Update revenue forecast from actuals",
      verb: "update",
      object: "forecast model",
      source: "billing exports",
      frequency: 7,
      distinctRequesters: 3,
      distinctAssignees: 1,
      requesterPersonas: ["Finance", "Leadership"],
      crossSystem: ["Stripe", "Excel"],
      duvoFitScore: 0.74,
      estHoursPerMonth: 8,
      humanHandoffCount: 3,
      duvoAgentBrief:
        "Weekly, ingest Stripe billing actuals, update the forecast model's current-month column, recompute run-rate, and highlight categories deviating more than 5% from plan.",
    },
    {
      id: "a-6",
      taskFingerprint: "triage.vendor.contracts",
      description: "Triage inbound vendor contracts for legal review",
      verb: "triage",
      object: "vendor contracts",
      source: "shared mailbox",
      frequency: 6,
      distinctRequesters: 4,
      distinctAssignees: 1,
      requesterPersonas: ["Legal", "Ops"],
      crossSystem: ["Email", "DocuSign"],
      duvoFitScore: 0.68,
      estHoursPerMonth: 5,
      humanHandoffCount: 2,
      duvoAgentBrief:
        "Monitor the legal intake mailbox, classify inbound contracts by type and risk, attach the right template checklist, and queue high-risk items for the Legal lead first.",
    },
    {
      id: "a-7",
      taskFingerprint: "onboard.access.provisioning",
      description: "Provision tool access for new hires",
      verb: "provision",
      object: "tool access",
      source: "onboarding tickets",
      frequency: 5,
      distinctRequesters: 2,
      distinctAssignees: 2,
      requesterPersonas: ["HR", "Ops", "Engineering"],
      crossSystem: ["Okta", "Jira"],
      duvoFitScore: 0.71,
      estHoursPerMonth: 4,
      humanHandoffCount: 3,
      duvoAgentBrief:
        "On a new-hire ticket, read the role profile, create Okta group memberships and Jira access per the role's standard kit, and confirm completion back on the ticket.",
    },
  ];
  return list;
}

export function activityTimeline(): ActivityPoint[] {
  // 30 daily buckets of org events. Routing events climb as the model learns;
  // group-chat creation drifts down as routing reduces ad-hoc channels.
  const days = 30;
  const out: ActivityPoint[] = [];
  let routing = 6;
  let chats = 14;
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    routing = Math.round(routing + rnd(-1, 4));
    chats = Math.round(chats + rnd(-3, 1.5));
    const d = new Date(now - i * 86_400_000);
    out.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      messages: Math.max(3, routing) * 4,
      threadReplies: Math.max(2, chats),
      mentions: rndInt(2, 11),
    });
  }
  return out;
}

export function topics(): Topic[] {
  return graph().clusters.map((c, i) => ({
    id: `topic-${c.id}`,
    label: c.label.toLowerCase().replace(/\s+/g, "-"),
    description: `${c.label} discussion`,
    kind: i === graph().clusters.length - 1 ? "private_channel" : "public_channel",
    messageCount: c.memberIds.length * rndInt(20, 60),
    participants: c.memberIds.length,
    departments: [...new Set(c.memberIds.map((id) => personById(id).persona))],
    crossFunctional: !c.matchesOrgChart,
  }));
}

export function kpis(): OrgKpis {
  return {
    redundantRelaysEliminated: 37,
    avgDegreesOfSeparation: 2.4,
    crossFnReachDirectPct: 0.68,
    shadowTeamsDetected: graph().clusters.filter((c) => !c.matchesOrgChart).length,
    busFactor: 4,
    hoursRecoverablePerMonth: automations().reduce((s, a) => s + a.estHoursPerMonth, 0),
    // sparkline: degrees of separation trending down over 8 weeks
    trendDegreesOfSeparation: [3.6, 3.4, 3.3, 3.0, 2.9, 2.7, 2.5, 2.4],
    trendCrossFnReach: [0.58, 0.6, 0.61, 0.63, 0.64, 0.66, 0.67, 0.68],
    trendActivity: [120, 138, 145, 150, 162, 171, 168, 180],
    keyPersonRiskCount: keyPersonRisks().filter((k) => k.riskScore >= 0.5).length,
    singlePointsOfFailure: topicOwnership().filter((t) => t.concentration === "single").length,
    openQuestions: openQuestions().length,
    orgSentiment: round2(
      sentiment().reduce((s, x) => s + x.current, 0) / Math.max(1, sentiment().length)
    ),
    medianTimeToAnswerHours: 5.5,
    tribalKnowledgePct: 0.21,
  };
}

// ── Resilience / Knowledge / Pulse (deterministic mock) ─────
export function keyPersonRisks(): KeyPersonRisk[] {
  const nodes = graph().nodes;
  const owners = topicOwnership();
  return [...nodes]
    .map((p) => {
      const sole = owners
        .filter((t) => t.ownerId === p.id && t.concentration !== "healthy")
        .map((t) => ({ id: t.topicId, label: t.topicLabel, count: t.contributors }));
      const answerShare = round2(0.2 + p.betweenness * 0.6);
      const riskScore = round2(
        Math.min(1, 0.5 * p.betweenness + 0.3 * Math.min(1, sole.length / 3) + 0.2 * answerShare)
      );
      const spof = p.betweenness >= 0.5;
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
        exposure:
          [
            sole.length ? `Sole owner of ${sole.length} topics` : null,
            spof ? "single point of failure" : null,
          ]
            .filter(Boolean)
            .join(" · ") || "broadly connected",
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 12);
}

export function topicOwnership(): TopicOwnership[] {
  const nodes = graph().nodes;
  const channels = [
    "incidents", "deploys", "data-requests", "budget-ops", "hiring",
    "design-review", "customer-escalations", "release-crew", "infra", "growth-experiments",
  ];
  return channels.map((label, i) => {
    const owner = nodes[(i * 3 + 2) % nodes.length];
    const share = round2(0.32 + rnd(0, 0.4));
    const contributors = rndInt(3, 12);
    const concentration: TopicOwnership["concentration"] =
      share >= 0.5 || contributors <= 4 ? "single" : share >= 0.34 ? "thin" : "healthy";
    return {
      topicId: `topic-own-${i}`,
      topicLabel: label,
      persona: owner.persona,
      ownerId: owner.id,
      ownerName: owner.name,
      ownerShare: share,
      contributors,
      concentration,
    };
  }).sort((a, b) => b.ownerShare - a.ownerShare);
}

export function deadEndRoutes(): DeadEndRoute[] {
  const nodes = graph().nodes;
  return [3, 11, 19].map((idx, i) => {
    const p = nodes[idx % nodes.length];
    return {
      userId: p.id,
      name: p.name,
      persona: p.persona,
      title: p.title,
      deactivated: true,
      staleMentions: rndInt(2, 18),
      groups: i === 0 ? ["on-call", "platform-team"] : i === 1 ? ["finance-approvers"] : [],
      lastSeenAt: new Date(Date.now() - rndInt(8, 40) * 86_400_000).toISOString(),
    };
  }).sort((a, b) => b.staleMentions - a.staleMentions);
}

export function openQuestions(): OpenQuestion[] {
  const nodes = graph().nodes;
  const samples = [
    "How do I get prod database access for the new service?",
    "Who owns the billing reconciliation job now?",
    "What's the process for requesting a new vendor contract?",
    "Can someone approve my expense report from last week?",
    "Where do we track the Q3 OKR progress?",
    "Why is the staging deploy pipeline failing on migrations?",
    "Is there a runbook for the on-call escalation flow?",
    "Who can review this customer-facing copy before launch?",
  ];
  const statuses: OpenQuestion["status"][] = [
    "unanswered", "slow", "tribal", "unanswered", "slow", "unanswered", "tribal", "slow",
  ];
  return samples.map((text, i) => {
    const asker = nodes[(i * 5 + 1) % nodes.length];
    const owner = nodes[(i * 7 + 4) % nodes.length];
    return {
      id: `q-${i + 1}`,
      text,
      channel: pick(["help", "engineering", "finance-ops", "general", "data"]),
      askedById: asker.id,
      askedByName: asker.name,
      persona: asker.persona,
      at: new Date(Date.now() - rndInt(2, 90) * 3_600_000).toISOString(),
      ageHours: rndInt(2, 90),
      status: statuses[i],
      likeliestOwnerId: owner.id,
      likeliestOwnerName: owner.name,
    };
  }).sort((a, b) => b.ageHours - a.ageHours);
}

export function expertise(): ExpertiseEntry[] {
  const nodes = graph().nodes;
  return [...nodes]
    .map((p) => ({
      personId: p.id,
      name: p.name,
      persona: p.persona,
      title: p.title,
      domains: p.topics ?? [],
      answers: Math.round(p.messageVolume * (0.3 + p.betweenness * 0.5)),
      uniqueAskers: rndInt(2, 24),
    }))
    .filter((e) => e.answers > 0)
    .sort((a, b) => b.answers - a.answers)
    .slice(0, 16);
}

export function recurringQuestions(): RecurringQuestion[] {
  const patterns = [
    "How do I get prod access?",
    "Who owns the billing pipeline?",
    "How do I request a vendor contract review?",
    "Where is the Q3 OKR tracker?",
    "How do I reset my SSO / Okta access?",
    "Who approves marketing spend over budget?",
  ];
  return patterns.map((pattern, i) => {
    const occurrences = rndInt(2, 16);
    return {
      id: `rq-${i + 1}`,
      pattern,
      occurrences,
      uniqueAskers: rndInt(2, occurrences),
      channel: pick(["help", "engineering", "finance-ops", "people"]),
      answeredByName: graph().nodes[(i * 4) % graph().nodes.length].name,
      automatable: occurrences >= 4,
    };
  }).sort((a, b) => b.occurrences - a.occurrences);
}

export function sentiment(): SentimentSeries[] {
  const teams = [...new Set(graph().nodes.map((n) => n.persona))].slice(0, 8);
  const days = activityTimeline().slice(-21);
  return teams.map((team) => {
    let v = 0.2 + rnd(0, 0.5);
    const points = days.map((d) => {
      v = Math.max(-0.5, Math.min(0.95, v + rnd(-0.09, 0.09)));
      return { date: d.date, label: d.label, score: round2(v) };
    });
    const current = points[points.length - 1]?.score ?? round2(v);
    const delta = round2(current - (points[0]?.score ?? current));
    return { team, persona: team, current, delta, points };
  });
}

export function overload(): OverloadEntry[] {
  const nodes = graph().nodes;
  return [...nodes]
    .map((p) => ({
      personId: p.id,
      name: p.name,
      persona: p.persona,
      mentionsReceived: Math.round(p.messageVolume * (0.2 + p.betweenness)),
      afterHoursPct: round2(0.1 + p.betweenness * 0.4 + rnd(0, 0.15)),
      threadsPulledInto: rndInt(4, 60),
      overloadScore: round2(Math.min(1, 0.4 + p.betweenness * 0.5 + rnd(0, 0.1))),
    }))
    .sort((a, b) => b.overloadScore - a.overloadScore)
    .slice(0, 10);
}

export function silos(): SiloCell[] {
  const teams = [...new Set(graph().nodes.map((n) => n.persona))].slice(0, 8);
  const out: SiloCell[] = [];
  for (const from of teams) {
    for (const to of teams) {
      if (from === to) continue;
      out.push({ from, to, strength: round2(rnd(0, 1)) });
    }
  }
  return out;
}

export function recognition(): RecognitionEntry[] {
  const nodes = graph().nodes;
  return [...nodes]
    .map((p) => {
      const received = Math.round(p.messageVolume * (0.3 + p.betweenness * 0.4));
      const given = rndInt(2, 40);
      return {
        personId: p.id,
        name: p.name,
        persona: p.persona,
        received,
        given,
        ratio: round2(received / Math.max(1, given)),
      };
    })
    .sort((a, b) => b.received - a.received)
    .slice(0, 10);
}

export function shadowRanks(): ShadowRankEntry[] {
  const nodes = graph().nodes;
  const seniorityRank: Record<Person["seniority"], number> = { Exec: 0, Manager: 1, Lead: 2, IC: 3 };
  const byInfluence = [...nodes].sort(
    (a, b) => b.betweenness - a.betweenness || b.degreeCentrality - a.degreeCentrality
  );
  const byFormal = [...nodes].sort(
    (a, b) => seniorityRank[a.seniority] - seniorityRank[b.seniority] || b.messageVolume - a.messageVolume
  );
  const inf = new Map(byInfluence.map((p, i) => [p.id, i + 1]));
  const frm = new Map(byFormal.map((p, i) => [p.id, i + 1]));
  return nodes
    .map((p) => {
      const influenceRank = inf.get(p.id) ?? nodes.length;
      const formalRank = frm.get(p.id) ?? nodes.length;
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
}

export { personById };
