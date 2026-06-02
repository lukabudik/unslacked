// ── Core graph ──────────────────────────────────────────────
// Persona == the org department (e.g. "Engineering", "Sales"). Sourced from the
// real `users.department` column; kept as a string so new departments are valid.
export type Persona = string;

// A reference to a topic (Slack channel) with how much it applies here.
export interface TopicRef {
  id: string;     // channel id, e.g. "C_ENGINEERING"
  label: string;  // channel name, e.g. "engineering"
  count: number;  // messages contributing
}

// An actual message — the "why" behind a connection.
export interface MessageSnippet {
  text: string;          // message content (truncated)
  channel: string;       // channel name it was posted in
  at: string;            // ISO timestamp
  from?: string;         // author display name
}

export interface Person {
  id: string;
  name: string;
  persona: Persona;
  team: string;
  seniority: "IC" | "Lead" | "Manager" | "Exec";
  avatarUrl?: string;
  title?: string;                // real job title from the directory
  topics?: TopicRef[];           // top channels this person talks in
  recentMessages?: MessageSnippet[]; // a few of their recent messages (the why)
  // derived network metrics (computed by backend, displayed by us)
  degreeCentrality: number;      // 0..1 normalized
  betweenness: number;           // 0..1 normalized — the MIDDLEMAN score
  messageVolume: number;         // total msgs in window
  isolationScore: number;        // 0..1, higher = more isolated
}

export interface CommsEdge {
  source: string;                // Person.id
  target: string;                // Person.id
  weight: number;                // 0..1, freq×recency — line thickness
  messageCount: number;
  directionRatio: number;        // 0..1, share initiated by `source`
  lastContactAt: string;         // ISO
  topics?: TopicRef[];           // channels this pair communicates in
  samples?: MessageSnippet[];    // actual messages between the pair (the why)
}

// ── Topics (Slack channels) ─────────────────────────────────
export interface Topic {
  id: string;
  label: string;                 // channel name
  description: string;           // channel topic/purpose
  kind: string;                  // public_channel | private_channel | mpim | im
  messageCount: number;
  participants: number;          // distinct people posting
  departments: Persona[];        // departments represented
  crossFunctional: boolean;      // spans 3+ departments
}

export interface CommunityCluster {
  id: string;
  label: string;                 // detected community name
  memberIds: string[];
  matchesOrgChart: boolean;      // false = shadow team (board insight)
}

export interface CommsGraph {
  nodes: Person[];
  edges: CommsEdge[];
  clusters: CommunityCluster[];
}

// ── Middleman / routing ─────────────────────────────────────
export interface MiddlemanInsight {
  personId: string;
  betweenness: number;
  bridgesPairs: number;          // # of pairs they sit between
  redundantRelays: number;       // times they were a removable hop
  topBridgedPersonas: Persona[]; // e.g. ["GTM","Engineering"]
}

export interface PersonaPairRoute {
  fromPersona: Persona;
  toPersonId: string;            // the real owner B
  toPersonName: string;
  viaMiddlemanId: string;
  occurrences: number;           // how many times this A→(via)→B happened
  confidence: number;            // 0..1, semantic-pair confidence
}

export interface RoutingEvent {
  id: string;
  at: string;                    // ISO
  requesterId: string;
  intendedRecipientId: string;
  suggestedRecipientId: string;
  status: "suggested" | "accepted" | "dismissed";
  hopsSaved: number;
}

// ── Automation discovery (Duvo) ─────────────────────────────
export interface AutomationOpportunity {
  id: string;
  taskFingerprint: string;       // normalized template id
  description: string;           // human-readable: "Reconcile budget table vs invoices"
  verb: string;                  // reconcile | pull | update | chase | compile…
  object: string;                // "budget table"
  source: string;                // "supplier invoices"
  frequency: number;             // times seen in window
  distinctRequesters: number;
  distinctAssignees: number;
  requesterPersonas: Persona[];
  crossSystem: string[];         // ["Excel","SAP","Email"]
  duvoFitScore: number;          // 0..1 — how native to Duvo this is
  estHoursPerMonth: number;      // frequency × manual minutes / 60
  humanHandoffCount: number;     // avg hops before someone does it
  duvoAgentBrief: string;        // pre-generated NL brief for Duvo
}

// ── Activity timeline (org events per day) ──────────────────
export interface ActivityPoint {
  date: string;          // ISO date (yyyy-mm-dd) for the bucket
  label: string;         // display label, e.g. "Jun 2"
  messages: number;      // messages posted that day
  threadReplies: number; // thread replies that day
  mentions: number;      // @-mentions that day
}

// ── Org health KPI rollup ───────────────────────────────────
export interface OrgKpis {
  redundantRelaysEliminated: number;
  avgDegreesOfSeparation: number;
  crossFnReachDirectPct: number;       // share of comms edges that cross departments
  shadowTeamsDetected: number;
  busFactor: number;                   // # of people whose removal fragments org
  hoursRecoverablePerMonth: number;    // sum of automation opps
  trendDegreesOfSeparation: number[];  // real per-week avg shortest path
  trendCrossFnReach: number[];         // real per-week cross-dept share
  trendActivity: number[];             // real per-week interaction volume
  // resilience / health headline numbers (surfaced on overview too)
  keyPersonRiskCount: number;          // people flagged high single-person risk
  singlePointsOfFailure: number;       // topics with exactly one real owner
  openQuestions: number;               // questions still unanswered/slow
  orgSentiment: number;                // -1..1 reaction-positivity index
  medianTimeToAnswerHours: number;     // median first-reply latency on questions
  tribalKnowledgePct: number;          // 0..1 share of Q&A happening in DMs
}

// ── Risk & Resilience ───────────────────────────────────────
// A person whose departure would hurt: high betweenness AND/OR the sole owner
// of one or more knowledge domains. The headline "who can't we afford to lose".
export interface KeyPersonRisk {
  personId: string;
  name: string;
  persona: Persona;
  team: string;
  title?: string;
  riskScore: number;             // 0..1 composite
  betweenness: number;           // 0..1
  answerShare: number;           // 0..1 share of answers in their domains
  soleOwnedTopics: TopicRef[];   // domains where they're the dominant owner
  busFactorContribution: boolean;// removal fragments the org
  exposure: string;              // "Sole owner of 4 topics; bridges 3 teams"
}

// Knowledge concentration per topic (channel): how dominant the top owner is.
export interface TopicOwnership {
  topicId: string;
  topicLabel: string;
  persona: Persona;              // department the topic skews to
  ownerId: string;
  ownerName: string;
  ownerShare: number;            // 0..1 — dominance of the top contributor
  contributors: number;          // distinct people active in the topic
  concentration: "single" | "thin" | "healthy";
}

// Offboarding decay: a deactivated (or about-to-leave) user still being routed
// to — a dead end in the routing graph.
export interface DeadEndRoute {
  userId: string;
  name: string;
  persona: Persona;
  title?: string;
  deactivated: boolean;
  staleMentions: number;         // times still @-mentioned
  groups: string[];              // usergroups they still belong to
  lastSeenAt: string;            // ISO of their last message
}

// ── Knowledge & Q&A ─────────────────────────────────────────
export interface OpenQuestion {
  id: string;
  text: string;
  channel: string;
  askedById: string;
  askedByName: string;
  persona: Persona;
  at: string;                    // ISO
  ageHours: number;
  status: "unanswered" | "slow" | "tribal"; // tribal = answered only in a DM
  likeliestOwnerId?: string;
  likeliestOwnerName?: string;
}

// Who is the de-facto answerer for which domains.
export interface ExpertiseEntry {
  personId: string;
  name: string;
  persona: Persona;
  title?: string;
  domains: TopicRef[];           // topics they answer in most
  answers: number;               // replies authored
  uniqueAskers: number;          // distinct people they helped
}

// A repeated question pattern — prime FAQ/automation candidate.
export interface RecurringQuestion {
  id: string;
  pattern: string;               // "How do I get prod access?"
  occurrences: number;
  uniqueAskers: number;
  channel: string;
  answeredByName?: string;
  automatable: boolean;          // good Duvo/FAQ-bot candidate
}

// ── Org Pulse (culture / load) ──────────────────────────────
export interface SentimentSeries {
  team: string;
  persona: Persona;
  current: number;               // -1..1
  delta: number;                 // change vs window start
  points: { date: string; label: string; score: number }[];
}

export interface OverloadEntry {
  personId: string;
  name: string;
  persona: Persona;
  mentionsReceived: number;
  afterHoursPct: number;         // 0..1 of their activity outside 8–18
  threadsPulledInto: number;
  overloadScore: number;         // 0..1
}

// Dept→dept communication strength (silo matrix cell).
export interface SiloCell {
  from: Persona;
  to: Persona;
  strength: number;              // 0..1 normalized
}

export interface RecognitionEntry {
  personId: string;
  name: string;
  persona: Persona;
  received: number;              // reactions received on their messages
  given: number;                 // reactions they gave
  ratio: number;                 // received / max(1, given)
}

// ── Shadow org chart (influence vs title) ───────────────────
export interface ShadowRankEntry {
  personId: string;
  name: string;
  persona: Persona;
  title?: string;
  seniority: "IC" | "Lead" | "Manager" | "Exec";
  influenceRank: number;         // 1 = most influential
  formalRank: number;            // 1 = most senior by title
  gap: number;                   // formalRank - influenceRank (+ = punches above title)
}
