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

// ── Activity timeline (org events per bucket) ───────────────
export interface ActivityPoint {
  label: string;          // bucket label, e.g. "W1"
  routingEvents: number;  // pre-emptive routing suggestions fired
  groupChats: number;     // new group chats / channels created
  automationRuns: number; // automation opportunities surfaced / run
}

// ── Org health KPI rollup ───────────────────────────────────
export interface OrgKpis {
  redundantRelaysEliminated: number;
  avgDegreesOfSeparation: number;
  crossFnReachDirectPct: number;       // % cross-fn requests hitting right person
  shadowTeamsDetected: number;
  redundantChannelsDetected: number;
  busFactor: number;                   // # of people whose removal fragments org
  hoursRecoverablePerMonth: number;    // sum of automation opps
  trendDegreesOfSeparation: number[];  // sparkline series
}
