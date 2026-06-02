/**
 * Seed dataset for a fictional mid-size company, "Nimbus Logistics" (a
 * logistics / last-mile delivery startup, ~30 people).
 *
 * The point of this data is to richly replicate Slack's people / channels / DMs
 * / threads / reactions model AND to contain OBVIOUS routing patterns so the
 * backend has something real to detect and the demo lands.
 *
 * Router personas (people who deflect instead of answering — "ask <@X>"):
 *   - U_BOB    (Eng Lead)        → bounces eng questions to his team & to ops
 *   - U_FRANK  (Head of Ops)     → the human switchboard; routes everywhere
 *   - U_GRACE  (Head of Product) → routes product/spec questions onward
 *   - U_PETRA  (Office/People)   → routes all HR/facilities/access questions
 * Multi-hop happens on purpose (Bob → Frank → Petra, Grace → Bob → Carol, etc).
 * Plenty of NON-routing answers are mixed in so the signal stays realistic.
 *
 * Used by both src/db/seed.ts (to populate Neon) and src/lib/store.ts (as the
 * in-memory fallback when DATABASE_URL is unset).
 */

export interface FixtureUser {
  id: string;
  name: string;
  realName: string;
  email: string;
  title: string;
  department: string;
  team?: string;
  avatarColor: string;
  statusEmoji?: string;
  statusText?: string;
  timezone?: string;
  isBot?: boolean;
  isActive?: boolean;
}

export interface FixtureChannel {
  id: string;
  name: string;
  kind: "public_channel" | "private_channel" | "im" | "mpim";
  topic?: string;
  purpose?: string;
  isArchived?: boolean;
  createdBy?: string;
  members: string[];
}

export interface FixtureMessage {
  id: string;
  channelId: string;
  userId: string;
  text: string;
  threadTs?: string; // parent message id
  /** minutes offset from the dataset's base time; keeps ordering deterministic */
  minute: number;
}

export interface FixtureReaction {
  messageId: string;
  userId: string;
  emoji: string; // unicode emoji, e.g. "👍"
}

const c = {
  purple: "#4a154b",
  blue: "#1264a3",
  green: "#2bac76",
  red: "#e01e5a",
  orange: "#e8912d",
  teal: "#0b8a8f",
  pink: "#cd2553",
  indigo: "#5b4bdb",
  amber: "#d9a300",
  cyan: "#1aa3b3",
  rose: "#d6336c",
  lime: "#74b816",
  slate: "#556074",
  brown: "#8a5a2b",
  magenta: "#a61e9e",
  forest: "#1f7a4d",
  sky: "#2b8ce8",
  coral: "#e8543d",
  plum: "#7a3b8f",
};

export const users: FixtureUser[] = [
  // --- Leadership ---
  { id: "U_ALICE", name: "alice", realName: "Alice Novak", email: "alice@nimbus.test", title: "CEO", department: "Leadership", avatarColor: c.purple, statusEmoji: "📊", statusText: "Board prep", timezone: "Europe/Prague" },
  { id: "U_TOMAS", name: "tomas", realName: "Tomáš Horáček", email: "tomas@nimbus.test", title: "COO", department: "Leadership", avatarColor: c.plum, statusEmoji: "✈️", statusText: "Travelling", timezone: "Europe/Prague" },
  { id: "U_LENKA", name: "lenka", realName: "Lenka Bartošová", email: "lenka@nimbus.test", title: "CFO", department: "Leadership", avatarColor: c.slate, statusEmoji: "💰", statusText: "Closing the month", timezone: "Europe/Prague" },

  // --- Engineering ---
  { id: "U_BOB", name: "bob", realName: "Bob Svoboda", email: "bob@nimbus.test", title: "Engineering Lead", department: "Engineering", avatarColor: c.blue, statusEmoji: "🎧", statusText: "In meetings", timezone: "Europe/Prague" },
  { id: "U_CAROL", name: "carol", realName: "Carol Dvořák", email: "carol@nimbus.test", title: "Senior Backend Engineer", department: "Engineering", avatarColor: c.green, statusEmoji: "🔧", statusText: "Deep in the pricing service", timezone: "Europe/Prague" },
  { id: "U_DAVE", name: "dave", realName: "Dave Kučera", email: "dave@nimbus.test", title: "Frontend Engineer", department: "Engineering", avatarColor: c.orange, statusEmoji: "🏠", statusText: "Working from home", timezone: "Europe/Prague" },
  { id: "U_IVAN", name: "ivan", realName: "Ivan Beneš", email: "ivan@nimbus.test", title: "Junior Engineer", department: "Engineering", avatarColor: c.lime, statusEmoji: "🌱", statusText: "Onboarding", timezone: "Europe/Prague" },
  { id: "U_RADEK", name: "radek", realName: "Radek Marný", email: "radek@nimbus.test", title: "Platform Engineer", department: "Engineering", avatarColor: c.indigo, statusEmoji: "☁️", statusText: "On call", timezone: "Europe/Prague" },
  { id: "U_NORA", name: "nora", realName: "Nora Vlková", email: "nora@nimbus.test", title: "Backend Engineer", department: "Engineering", avatarColor: c.forest, statusEmoji: "🐛", statusText: "Squashing bugs", timezone: "Europe/London" },
  { id: "U_OSCAR", name: "oscar", realName: "Oscar Lindqvist", email: "oscar@nimbus.test", title: "Mobile Engineer", department: "Engineering", avatarColor: c.cyan, statusEmoji: "📱", statusText: "Shipping the app", timezone: "Europe/London" },

  // --- Product ---
  { id: "U_GRACE", name: "grace", realName: "Grace Horáková", email: "grace@nimbus.test", title: "Head of Product", department: "Product", avatarColor: c.red, statusEmoji: "🗺️", statusText: "Roadmapping", timezone: "Europe/Prague" },
  { id: "U_PAVEL", name: "pavel", realName: "Pavel Doležal", email: "pavel@nimbus.test", title: "Product Manager, Delivery", department: "Product", avatarColor: c.coral, statusEmoji: "🎯", statusText: "Sprint planning", timezone: "Europe/Prague" },
  { id: "U_KLARA", name: "klara", realName: "Klára Šťastná", email: "klara@nimbus.test", title: "Product Manager, Growth", department: "Product", avatarColor: c.rose, statusEmoji: "📈", statusText: "Heads down", timezone: "Europe/Prague" },

  // --- Design ---
  { id: "U_EVE", name: "eve", realName: "Eve Procházková", email: "eve@nimbus.test", title: "Lead Product Designer", department: "Design", avatarColor: c.pink, statusEmoji: "🎨", statusText: "In Figma", timezone: "Europe/Prague" },
  { id: "U_MILA", name: "mila", realName: "Mila Černá", email: "mila@nimbus.test", title: "Product Designer", department: "Design", avatarColor: c.magenta, statusEmoji: "🖌️", statusText: "Prototyping", timezone: "Europe/Prague" },

  // --- Data ---
  { id: "U_HEIDI", name: "heidi", realName: "Heidi Poková", email: "heidi@nimbus.test", title: "Data Lead", department: "Data", avatarColor: c.sky, statusEmoji: "📊", statusText: "Crunching numbers", timezone: "Europe/Prague" },
  { id: "U_JONAS", name: "jonas", realName: "Jonáš Kraus", email: "jonas@nimbus.test", title: "Data Analyst", department: "Data", avatarColor: c.amber, statusEmoji: "🧮", statusText: "Building the funnel report", timezone: "Europe/Prague" },

  // --- Operations ---
  { id: "U_FRANK", name: "frank", realName: "Frank Marek", email: "frank@nimbus.test", title: "Head of Operations", department: "Operations", avatarColor: c.teal, statusEmoji: "🚚", statusText: "Wrangling logistics", timezone: "Europe/Prague" },
  { id: "U_SARA", name: "sara", realName: "Sára Veselá", email: "sara@nimbus.test", title: "Operations Manager", department: "Operations", avatarColor: c.brown, statusEmoji: "📦", statusText: "Warehouse run", timezone: "Europe/Prague" },
  { id: "U_DENIS", name: "denis", realName: "Denis Urban", email: "denis@nimbus.test", title: "Fleet Coordinator", department: "Operations", avatarColor: c.forest, statusEmoji: "🛻", statusText: "Out at the depot", timezone: "Europe/Prague" },

  // --- Sales ---
  { id: "U_JUDY", name: "judy", realName: "Judy Sýkorová", email: "judy@nimbus.test", title: "Account Executive", department: "Sales", avatarColor: c.orange, statusEmoji: "🤝", statusText: "On a call with a prospect", timezone: "Europe/Prague" },
  { id: "U_VIKTOR", name: "viktor", realName: "Viktor Hájek", email: "viktor@nimbus.test", title: "Head of Sales", department: "Sales", avatarColor: c.coral, statusEmoji: "💼", statusText: "Q3 pipeline review", timezone: "Europe/Prague" },
  { id: "U_NINA", name: "nina", realName: "Nina Kovářová", email: "nina@nimbus.test", title: "SDR", department: "Sales", avatarColor: c.rose, statusEmoji: "📞", statusText: "Prospecting", timezone: "America/New_York" },

  // --- Support ---
  { id: "U_MALLORY", name: "mallory", realName: "Mallory Růžičková", email: "mallory@nimbus.test", title: "Customer Success Lead", department: "Support", avatarColor: c.pink, statusEmoji: "💬", statusText: "Clearing the queue", timezone: "Europe/Prague" },
  { id: "U_TEREZA", name: "tereza", realName: "Tereza Malá", email: "tereza@nimbus.test", title: "Support Specialist", department: "Support", avatarColor: c.magenta, statusEmoji: "🎫", statusText: "On tickets", timezone: "Europe/Prague" },

  // --- Marketing ---
  { id: "U_OTTO", name: "otto", realName: "Otto Richter", email: "otto@nimbus.test", title: "Head of Marketing", department: "Marketing", avatarColor: c.amber, statusEmoji: "📣", statusText: "Campaign launch week", timezone: "Europe/Prague" },
  { id: "U_BARA", name: "bara", realName: "Bára Holubová", email: "bara@nimbus.test", title: "Content Marketer", department: "Marketing", avatarColor: c.lime, statusEmoji: "✍️", statusText: "Writing", timezone: "Europe/Prague" },

  // --- People / HR ---
  { id: "U_PETRA", name: "petra", realName: "Petra Konečná", email: "petra@nimbus.test", title: "Head of People & Office", department: "People", avatarColor: c.plum, statusEmoji: "🌴", statusText: "On vacation (back Monday)", timezone: "Europe/Prague" },
  { id: "U_LUKAS", name: "lukas", realName: "Lukáš Pospíšil", email: "lukas@nimbus.test", title: "People Operations", department: "People", avatarColor: c.slate, statusEmoji: "🤒", statusText: "Out sick", timezone: "Europe/Prague" },

  // --- Finance ---
  { id: "U_ZUZANA", name: "zuzana", realName: "Zuzana Kratochvílová", email: "zuzana@nimbus.test", title: "Finance Manager", department: "Finance", avatarColor: c.slate, statusEmoji: "🧾", statusText: "Invoicing", timezone: "Europe/Prague" },

  // --- Bot ---
  { id: "U_BOT", name: "unslacked", realName: "Unslacked Bot", email: "", title: "Routing Assistant", department: "—", avatarColor: c.teal, isBot: true },
];

export const channels: FixtureChannel[] = [
  // ===================== PUBLIC CHANNELS =====================
  {
    id: "C_GENERAL",
    name: "general",
    kind: "public_channel",
    topic: "Company-wide chatter",
    purpose: "Everyone at Nimbus. Keep it useful.",
    createdBy: "U_ALICE",
    members: [
      "U_ALICE", "U_TOMAS", "U_LENKA", "U_BOB", "U_CAROL", "U_DAVE", "U_IVAN", "U_RADEK", "U_NORA", "U_OSCAR",
      "U_GRACE", "U_PAVEL", "U_KLARA", "U_EVE", "U_MILA", "U_HEIDI", "U_JONAS", "U_FRANK", "U_SARA", "U_DENIS",
      "U_JUDY", "U_VIKTOR", "U_NINA", "U_MALLORY", "U_TEREZA", "U_OTTO", "U_BARA", "U_PETRA", "U_LUKAS", "U_ZUZANA",
    ],
  },
  {
    id: "C_ANNOUNCEMENTS",
    name: "announcements",
    kind: "public_channel",
    topic: "Official company announcements only",
    purpose: "Low-noise, leadership posts. Reactions ok, replies in threads.",
    createdBy: "U_ALICE",
    members: [
      "U_ALICE", "U_TOMAS", "U_LENKA", "U_BOB", "U_CAROL", "U_DAVE", "U_IVAN", "U_RADEK", "U_NORA", "U_OSCAR",
      "U_GRACE", "U_PAVEL", "U_KLARA", "U_EVE", "U_MILA", "U_HEIDI", "U_JONAS", "U_FRANK", "U_SARA", "U_DENIS",
      "U_JUDY", "U_VIKTOR", "U_NINA", "U_MALLORY", "U_TEREZA", "U_OTTO", "U_BARA", "U_PETRA", "U_LUKAS", "U_ZUZANA",
    ],
  },
  {
    id: "C_ENGINEERING",
    name: "engineering",
    kind: "public_channel",
    topic: "Eng discussion, deploys, architecture",
    purpose: "All engineers + close collaborators.",
    createdBy: "U_BOB",
    members: ["U_BOB", "U_CAROL", "U_DAVE", "U_IVAN", "U_RADEK", "U_NORA", "U_OSCAR", "U_HEIDI", "U_JONAS", "U_GRACE", "U_PAVEL"],
  },
  {
    id: "C_FRONTEND",
    name: "frontend",
    kind: "public_channel",
    topic: "Web & mobile UI, design system",
    createdBy: "U_DAVE",
    members: ["U_DAVE", "U_OSCAR", "U_IVAN", "U_EVE", "U_MILA", "U_BOB"],
  },
  {
    id: "C_BACKEND",
    name: "backend",
    kind: "public_channel",
    topic: "Services, APIs, databases",
    createdBy: "U_CAROL",
    members: ["U_CAROL", "U_NORA", "U_RADEK", "U_IVAN", "U_BOB", "U_HEIDI"],
  },
  {
    id: "C_DESIGN",
    name: "design",
    kind: "public_channel",
    topic: "Design reviews & assets",
    createdBy: "U_EVE",
    members: ["U_EVE", "U_MILA", "U_DAVE", "U_OSCAR", "U_GRACE", "U_PAVEL", "U_KLARA", "U_ALICE"],
  },
  {
    id: "C_PRODUCT",
    name: "product",
    kind: "public_channel",
    topic: "Specs, discovery, prioritization",
    createdBy: "U_GRACE",
    members: ["U_GRACE", "U_PAVEL", "U_KLARA", "U_EVE", "U_BOB", "U_NORA", "U_HEIDI", "U_ALICE", "U_MALLORY"],
  },
  {
    id: "C_DATA",
    name: "data",
    kind: "public_channel",
    topic: "Analytics, dashboards, metrics",
    createdBy: "U_HEIDI",
    members: ["U_HEIDI", "U_JONAS", "U_GRACE", "U_KLARA", "U_FRANK", "U_LENKA", "U_BOB"],
  },
  {
    id: "C_OPS",
    name: "ops",
    kind: "public_channel",
    topic: "Internal tooling, access, accounts, logistics ops",
    purpose: "Where requests go to get unblocked.",
    createdBy: "U_FRANK",
    members: ["U_FRANK", "U_SARA", "U_DENIS", "U_ALICE", "U_TOMAS", "U_BOB", "U_JUDY", "U_MALLORY", "U_TEREZA", "U_GRACE", "U_IVAN", "U_PETRA", "U_RADEK", "U_HEIDI", "U_ZUZANA"],
  },
  {
    id: "C_INCIDENTS",
    name: "incidents",
    kind: "public_channel",
    topic: "Production incidents & postmortems",
    purpose: "Declare incidents here. On-call leads.",
    createdBy: "U_RADEK",
    members: ["U_RADEK", "U_BOB", "U_CAROL", "U_NORA", "U_DAVE", "U_OSCAR", "U_FRANK", "U_GRACE", "U_MALLORY", "U_ALICE"],
  },
  {
    id: "C_SALES",
    name: "sales",
    kind: "public_channel",
    topic: "Pipeline, deals, prospects",
    createdBy: "U_VIKTOR",
    members: ["U_VIKTOR", "U_JUDY", "U_NINA", "U_OTTO", "U_GRACE", "U_PAVEL", "U_LENKA", "U_MALLORY"],
  },
  {
    id: "C_SUPPORT",
    name: "customer-support",
    kind: "public_channel",
    topic: "Customer issues & escalations",
    createdBy: "U_MALLORY",
    members: ["U_MALLORY", "U_TEREZA", "U_FRANK", "U_SARA", "U_GRACE", "U_PAVEL", "U_VIKTOR"],
  },
  {
    id: "C_MARKETING",
    name: "marketing",
    kind: "public_channel",
    topic: "Campaigns, content, brand",
    createdBy: "U_OTTO",
    members: ["U_OTTO", "U_BARA", "U_KLARA", "U_GRACE", "U_ALICE", "U_VIKTOR"],
  },
  {
    id: "C_WATERCOOLER",
    name: "watercooler",
    kind: "public_channel",
    topic: "Off-topic, memes, lunch plans 🍕",
    createdBy: "U_PETRA",
    members: [
      "U_ALICE", "U_BOB", "U_CAROL", "U_DAVE", "U_IVAN", "U_NORA", "U_OSCAR", "U_RADEK", "U_EVE", "U_MILA",
      "U_HEIDI", "U_JONAS", "U_FRANK", "U_SARA", "U_DENIS", "U_JUDY", "U_NINA", "U_MALLORY", "U_TEREZA", "U_OTTO", "U_BARA", "U_PETRA", "U_KLARA",
    ],
  },

  // ===================== PRIVATE CHANNELS =====================
  {
    id: "C_LEADERSHIP",
    name: "leadership",
    kind: "private_channel",
    topic: "Exec team",
    purpose: "C-level + heads. Confidential.",
    createdBy: "U_ALICE",
    members: ["U_ALICE", "U_TOMAS", "U_LENKA", "U_BOB", "U_GRACE", "U_FRANK", "U_VIKTOR", "U_OTTO", "U_PETRA"],
  },
  {
    id: "C_HIRING",
    name: "hiring",
    kind: "private_channel",
    topic: "Open roles, candidates, debriefs",
    purpose: "Hiring managers + People. Keep candidate info here.",
    createdBy: "U_PETRA",
    members: ["U_PETRA", "U_LUKAS", "U_ALICE", "U_BOB", "U_GRACE", "U_EVE", "U_FRANK"],
  },
  {
    id: "C_FINANCE_PRIVATE",
    name: "finance-private",
    kind: "private_channel",
    topic: "Budgets, payroll, fundraising",
    purpose: "Finance + leadership only.",
    createdBy: "U_LENKA",
    members: ["U_LENKA", "U_ZUZANA", "U_ALICE", "U_TOMAS"],
  },
  {
    id: "C_PROJECT_FALCON",
    name: "proj-falcon",
    kind: "private_channel",
    topic: "[ARCHIVED] Falcon route-optimization rewrite",
    purpose: "Old project channel, kept for history.",
    isArchived: true,
    createdBy: "U_BOB",
    members: ["U_BOB", "U_CAROL", "U_RADEK", "U_GRACE", "U_HEIDI"],
  },

  // ===================== DMs (im — exactly 2 members) =====================
  { id: "D_ALICE_BOB", name: "alice-bob", kind: "im", members: ["U_ALICE", "U_BOB"] },
  { id: "D_ALICE_FRANK", name: "alice-frank", kind: "im", members: ["U_ALICE", "U_FRANK"] },
  { id: "D_ALICE_GRACE", name: "alice-grace", kind: "im", members: ["U_ALICE", "U_GRACE"] },
  { id: "D_IVAN_BOB", name: "ivan-bob", kind: "im", members: ["U_IVAN", "U_BOB"] },
  { id: "D_IVAN_CAROL", name: "ivan-carol", kind: "im", members: ["U_IVAN", "U_CAROL"] },
  { id: "D_JUDY_FRANK", name: "judy-frank", kind: "im", members: ["U_JUDY", "U_FRANK"] },
  { id: "D_DAVE_EVE", name: "dave-eve", kind: "im", members: ["U_DAVE", "U_EVE"] },
  { id: "D_MALLORY_GRACE", name: "mallory-grace", kind: "im", members: ["U_MALLORY", "U_GRACE"] },
  { id: "D_HEIDI_CAROL", name: "heidi-carol", kind: "im", members: ["U_HEIDI", "U_CAROL"] },
  { id: "D_NINA_VIKTOR", name: "nina-viktor", kind: "im", members: ["U_NINA", "U_VIKTOR"] },
  { id: "D_PETRA_ALICE", name: "petra-alice", kind: "im", members: ["U_PETRA", "U_ALICE"] },

  // ===================== Group DMs (mpim — 3-5 members) =====================
  { id: "G_OPS_HUDDLE", name: "ops-huddle", kind: "mpim", members: ["U_FRANK", "U_SARA", "U_DENIS"] },
  { id: "G_RELEASE", name: "release-crew", kind: "mpim", members: ["U_BOB", "U_CAROL", "U_DAVE", "U_RADEK"] },
  { id: "G_DESIGN_PROD", name: "design-prod-sync", kind: "mpim", members: ["U_EVE", "U_GRACE", "U_PAVEL", "U_MILA"] },
  { id: "G_ALICE_HEADS", name: "alice-heads", kind: "mpim", members: ["U_ALICE", "U_BOB", "U_GRACE", "U_FRANK", "U_VIKTOR"] },
  { id: "G_SUPPORT_ESC", name: "support-escalation", kind: "mpim", members: ["U_MALLORY", "U_TEREZA", "U_FRANK", "U_GRACE"] },
];

// Base ordering is by `minute`. Threads reference a parent message id.
export const messages: FixtureMessage[] = [
  // =========================================================================
  // #engineering — Ivan (junior) funnels everything through Bob (router #1),
  // who deflects to his team & to ops. Carol & Nora actually answer.
  // =========================================================================
  { id: "M_E01", channelId: "C_ENGINEERING", userId: "U_IVAN", text: "Morning! Who owns the billing/pricing service? I need to add a coupon field.", minute: 0 },
  { id: "M_E02", channelId: "C_ENGINEERING", userId: "U_BOB", text: "That's <@U_CAROL>'s area, ask her.", threadTs: "M_E01", minute: 3 },
  { id: "M_E03", channelId: "C_ENGINEERING", userId: "U_CAROL", text: "Coupons live in the `pricing` module — I'll pair with you <@U_IVAN>, grab me after standup. The validation hook is the tricky part.", threadTs: "M_E01", minute: 8 },
  { id: "M_E04", channelId: "C_ENGINEERING", userId: "U_IVAN", text: "And how do I get staging access for it?", minute: 10 },
  { id: "M_E05", channelId: "C_ENGINEERING", userId: "U_BOB", text: "Access goes through <@U_FRANK> in #ops, he'll sort you out.", threadTs: "M_E04", minute: 12 },
  { id: "M_E06", channelId: "C_ENGINEERING", userId: "U_DAVE", text: "Bob, can you review the checkout PR? It's blocking the release.", minute: 22 },
  { id: "M_E07", channelId: "C_ENGINEERING", userId: "U_BOB", text: "Frontend review isn't really my thing — get design sign-off from <@U_EVE> then have <@U_OSCAR> stamp it, he knows that area best.", threadTs: "M_E06", minute: 25 },
  { id: "M_E08", channelId: "C_ENGINEERING", userId: "U_OSCAR", text: "Happy to. <@U_DAVE> push the latest and I'll review this afternoon.", threadTs: "M_E06", minute: 30 },
  { id: "M_E09", channelId: "C_ENGINEERING", userId: "U_JONAS", text: "Where do prod event logs land? Need them for the funnel report.", minute: 33 },
  { id: "M_E10", channelId: "C_ENGINEERING", userId: "U_BOB", text: "<@U_CAROL> built that pipeline, she'll know. Or <@U_RADEK> for the infra side.", threadTs: "M_E09", minute: 35 },
  { id: "M_E11", channelId: "C_ENGINEERING", userId: "U_RADEK", text: "They stream to the `events` bucket in S3, partitioned by day. I'll DM you the Athena view <@U_JONAS>.", threadTs: "M_E09", minute: 38 },
  { id: "M_E12", channelId: "C_ENGINEERING", userId: "U_GRACE", text: "What's the ETA on the search rework?", minute: 42 },
  { id: "M_E13", channelId: "C_ENGINEERING", userId: "U_BOB", text: "<@U_NORA> is driving search, she can give you a real date.", threadTs: "M_E12", minute: 44 },
  { id: "M_E14", channelId: "C_ENGINEERING", userId: "U_NORA", text: "Realistically end of next sprint, <@U_GRACE>. The reindex job is the long pole. I'll add it to the sprint board.", threadTs: "M_E12", minute: 47 },
  { id: "M_E15", channelId: "C_ENGINEERING", userId: "U_IVAN", text: "Dumb question — how do I run the test suite locally? It hangs on the DB step.", minute: 55 },
  { id: "M_E16", channelId: "C_ENGINEERING", userId: "U_NORA", text: "Not dumb! You need the test container up first: `make db-test` then `pnpm test`. The hang is usually a stale volume — `docker compose down -v` fixes it.", threadTs: "M_E15", minute: 58 },
  { id: "M_E17", channelId: "C_ENGINEERING", userId: "U_IVAN", text: "That did it, thank you 🙏", threadTs: "M_E15", minute: 61 },
  { id: "M_E18", channelId: "C_ENGINEERING", userId: "U_CAROL", text: "Heads up: I'm bumping the Node version on backend services Friday. Rebuild your containers after.", minute: 70 },
  { id: "M_E19", channelId: "C_ENGINEERING", userId: "U_DAVE", text: "Does that affect the frontend build image?", threadTs: "M_E18", minute: 73 },
  { id: "M_E20", channelId: "C_ENGINEERING", userId: "U_CAROL", text: "No, only the service images. Frontend's on its own base.", threadTs: "M_E18", minute: 75 },

  // =========================================================================
  // #ops — Frank is the human switchboard (router #2). Multi-hop: he sends
  // people to Carol, Grace, Petra, Zuzana. Sara & Denis actually answer some.
  // =========================================================================
  { id: "M_O01", channelId: "C_OPS", userId: "U_IVAN", text: "Need staging access to the billing repo — <@U_BOB> sent me here.", minute: 14 },
  { id: "M_O02", channelId: "C_OPS", userId: "U_FRANK", text: "Repo access is owned by the service owner now, so that's <@U_CAROL> — she can add you in GitHub.", threadTs: "M_O01", minute: 17 },
  { id: "M_O03", channelId: "C_OPS", userId: "U_JUDY", text: "Customer wants an invoice reissued in EUR, who can help?", minute: 50 },
  { id: "M_O04", channelId: "C_OPS", userId: "U_FRANK", text: "Invoicing is <@U_ZUZANA> in finance — she handles reissues.", threadTs: "M_O03", minute: 53 },
  { id: "M_O05", channelId: "C_OPS", userId: "U_ZUZANA", text: "Send me the order number <@U_JUDY> and I'll reissue today.", threadTs: "M_O03", minute: 58 },
  { id: "M_O06", channelId: "C_OPS", userId: "U_MALLORY", text: "VPN is down for me, can't reach the dashboards.", minute: 62 },
  { id: "M_O07", channelId: "C_OPS", userId: "U_FRANK", text: "VPN/gateway is a <@U_RADEK> thing — he can reset it. Looping him in.", threadTs: "M_O06", minute: 64 },
  { id: "M_O08", channelId: "C_OPS", userId: "U_RADEK", text: "Restarting the gateway now, give it 2 min <@U_MALLORY>.", threadTs: "M_O06", minute: 66 },
  { id: "M_O09", channelId: "C_OPS", userId: "U_ALICE", text: "Who do I talk to about ordering new office laptops?", minute: 72 },
  { id: "M_O10", channelId: "C_OPS", userId: "U_FRANK", text: "Office & equipment is <@U_PETRA> (People/Office). She's on PTO so <@U_LUKAS> is covering.", threadTs: "M_O09", minute: 74 },
  { id: "M_O11", channelId: "C_OPS", userId: "U_SARA", text: "The depot pickup window moved to 6am tomorrow, drivers notified.", minute: 80 },
  { id: "M_O12", channelId: "C_OPS", userId: "U_DENIS", text: "Confirmed, two vans are pre-loaded tonight. Route sheets printed.", threadTs: "M_O11", minute: 83 },
  { id: "M_O13", channelId: "C_OPS", userId: "U_GRACE", text: "Can someone pull yesterday's delivery SLA numbers?", minute: 90 },
  { id: "M_O14", channelId: "C_OPS", userId: "U_FRANK", text: "That's a data question — <@U_HEIDI> or <@U_JONAS> own the SLA dashboard.", threadTs: "M_O13", minute: 92 },
  { id: "M_O15", channelId: "C_OPS", userId: "U_HEIDI", text: "97.4% on-time yesterday, link to the dashboard incoming. <@U_GRACE>", threadTs: "M_O13", minute: 96 },
  { id: "M_O16", channelId: "C_OPS", userId: "U_TEREZA", text: "How do I get a refund approved over €100?", minute: 100 },
  { id: "M_O17", channelId: "C_OPS", userId: "U_FRANK", text: "Refund approvals above €100 go through <@U_MALLORY>, she owns that policy.", threadTs: "M_O16", minute: 102 },
  { id: "M_O18", channelId: "C_OPS", userId: "U_MALLORY", text: "Approved this time <@U_TEREZA>, but anything over €250 you still escalate to me first.", threadTs: "M_O16", minute: 105 },

  // =========================================================================
  // #product — Grace is router #3. She bounces specs to PMs and eng.
  // =========================================================================
  { id: "M_P01", channelId: "C_PRODUCT", userId: "U_MALLORY", text: "Customers keep asking for delivery time-windows. Is that on the roadmap?", minute: 26 },
  { id: "M_P02", channelId: "C_PRODUCT", userId: "U_GRACE", text: "Delivery scheduling is owned by <@U_PAVEL> — he's scoping it now, ask him for the doc.", threadTs: "M_P01", minute: 29 },
  { id: "M_P03", channelId: "C_PRODUCT", userId: "U_PAVEL", text: "Draft spec here (link). <@U_MALLORY> can you add the top 5 customer quotes? That'll strengthen the case.", threadTs: "M_P01", minute: 34 },
  { id: "M_P04", channelId: "C_PRODUCT", userId: "U_KLARA", text: "What's the latest on the referral program experiment?", minute: 45 },
  { id: "M_P05", channelId: "C_PRODUCT", userId: "U_GRACE", text: "That's your area <@U_KLARA> 😄 but for the implementation status ask <@U_BOB>.", threadTs: "M_P04", minute: 48 },
  { id: "M_P06", channelId: "C_PRODUCT", userId: "U_BOB", text: "Referral backend is half-built — <@U_NORA> paused it for the search work. We can resume next sprint.", threadTs: "M_P04", minute: 52 },
  { id: "M_P07", channelId: "C_PRODUCT", userId: "U_PAVEL", text: "Quick decision needed: do we gate time-windows behind premium or ship to everyone?", minute: 60 },
  { id: "M_P08", channelId: "C_PRODUCT", userId: "U_GRACE", text: "That's a pricing call — loop in <@U_ALICE> and <@U_LENKA>. I don't want to decide revenue model solo.", threadTs: "M_P07", minute: 63 },
  { id: "M_P09", channelId: "C_PRODUCT", userId: "U_ALICE", text: "Ship to everyone for now, we'll measure adoption first. Revisit pricing in Q4.", threadTs: "M_P07", minute: 70 },
  { id: "M_P10", channelId: "C_PRODUCT", userId: "U_EVE", text: "I'll have time-window mockups ready Thursday. <@U_PAVEL> let's review together.", minute: 78 },
  { id: "M_P11", channelId: "C_PRODUCT", userId: "U_HEIDI", text: "I can instrument adoption metrics — just tell me the events you need fired.", threadTs: "M_P07", minute: 82 },

  // =========================================================================
  // #incidents — a real incident thread, mostly people ANSWERING (low routing)
  // =========================================================================
  { id: "M_I01", channelId: "C_INCIDENTS", userId: "U_RADEK", text: "🚨 Declaring SEV2: checkout latency p95 spiked to 4.2s, error rate climbing. Investigating.", minute: 110 },
  { id: "M_I02", channelId: "C_INCIDENTS", userId: "U_CAROL", text: "On it. Seeing connection pool exhaustion on pricing-db. Pool maxed at 20.", threadTs: "M_I01", minute: 113 },
  { id: "M_I03", channelId: "C_INCIDENTS", userId: "U_RADEK", text: "Recent deploy? Last change was the coupon field migration ~40 min ago.", threadTs: "M_I01", minute: 115 },
  { id: "M_I04", channelId: "C_INCIDENTS", userId: "U_CAROL", text: "Yeah — the coupon lookup isn't using the index, full table scan on every checkout. That's the leak.", threadTs: "M_I01", minute: 118 },
  { id: "M_I05", channelId: "C_INCIDENTS", userId: "U_BOB", text: "Roll back the migration while Carol patches the query? <@U_RADEK> your call as IC.", threadTs: "M_I01", minute: 120 },
  { id: "M_I06", channelId: "C_INCIDENTS", userId: "U_RADEK", text: "Rolling back now. Carol, prep the indexed query as a follow-up PR.", threadTs: "M_I01", minute: 122 },
  { id: "M_I07", channelId: "C_INCIDENTS", userId: "U_CAROL", text: "Rollback applied, p95 back to 380ms, errors clearing. 🎉", threadTs: "M_I01", minute: 127 },
  { id: "M_I08", channelId: "C_INCIDENTS", userId: "U_MALLORY", text: "Support saw ~12 failed-checkout tickets in that window, I'll reach out to those customers.", threadTs: "M_I01", minute: 130 },
  { id: "M_I09", channelId: "C_INCIDENTS", userId: "U_RADEK", text: "Resolved. Postmortem doc started, blameless review Thursday. Thanks all.", threadTs: "M_I01", minute: 133 },
  { id: "M_I10", channelId: "C_INCIDENTS", userId: "U_ALICE", text: "Great response time team. <@U_RADEK> add the customer-impact number to the postmortem.", threadTs: "M_I01", minute: 138 },

  // =========================================================================
  // #general & #announcements
  // =========================================================================
  { id: "M_G01", channelId: "C_GENERAL", userId: "U_ALICE", text: "Please welcome <@U_IVAN> to Engineering and <@U_NINA> to Sales! 🎉 Say hi 👋", minute: 1 },
  { id: "M_G02", channelId: "C_GENERAL", userId: "U_GRACE", text: "Welcome both! <@U_IVAN> ping me anytime about product context.", threadTs: "M_G01", minute: 4 },
  { id: "M_G03", channelId: "C_GENERAL", userId: "U_FRANK", text: "Welcome 👋 hit me in #ops for any access/equipment stuff.", threadTs: "M_G01", minute: 6 },
  { id: "M_G04", channelId: "C_GENERAL", userId: "U_IVAN", text: "Thanks everyone, excited to be here! 😄", threadTs: "M_G01", minute: 9 },
  { id: "M_G05", channelId: "C_GENERAL", userId: "U_PETRA", text: "Reminder: I'm out next week 🌴 — for anything People/Office related, <@U_LUKAS> is covering.", minute: 85 },
  { id: "M_G06", channelId: "C_GENERAL", userId: "U_TOMAS", text: "Q2 numbers looking strong, more in Friday's all-hands.", minute: 150 },

  { id: "M_A01", channelId: "C_ANNOUNCEMENTS", userId: "U_ALICE", text: "📣 We closed the Series A! Huge thanks to everyone. All-hands Friday 3pm to celebrate and share what's next.", minute: 145 },
  { id: "M_A02", channelId: "C_ANNOUNCEMENTS", userId: "U_LENKA", text: "Finance follow-up: new expense policy goes live July 1, details in #finance-private for budget owners.", minute: 160 },
  { id: "M_A03", channelId: "C_ANNOUNCEMENTS", userId: "U_BOB", text: "🛠️ Deploy freeze this Friday 12:00–18:00 for the DB migration. Plan merges accordingly.", minute: 165 },
  { id: "M_A04", channelId: "C_ANNOUNCEMENTS", userId: "U_PETRA", text: "New joiners next Monday: 2 in Eng, 1 in Ops. Buddies assigned — check your DMs.", minute: 170 },

  // =========================================================================
  // #design & #frontend
  // =========================================================================
  { id: "M_D01", channelId: "C_DESIGN", userId: "U_DAVE", text: "Need sign-off on the checkout button states before I merge.", minute: 24 },
  { id: "M_D02", channelId: "C_DESIGN", userId: "U_EVE", text: "Looks good, ship it. One nit: bump the disabled-state contrast, it fails AA right now.", threadTs: "M_D01", minute: 27 },
  { id: "M_D03", channelId: "C_DESIGN", userId: "U_MILA", text: "I updated the design tokens for that — pull the latest from the library file.", threadTs: "M_D01", minute: 31 },
  { id: "M_D04", channelId: "C_DESIGN", userId: "U_GRACE", text: "Can we get a first pass on the delivery time-window picker this week?", minute: 76 },
  { id: "M_D05", channelId: "C_DESIGN", userId: "U_EVE", text: "Yes — <@U_MILA> is taking first pass, I'll review. Thursday OK?", threadTs: "M_D04", minute: 79 },
  { id: "M_D06", channelId: "C_DESIGN", userId: "U_MILA", text: "On it. Will reuse the calendar component from the booking flow.", threadTs: "M_D04", minute: 81 },

  { id: "M_F01", channelId: "C_FRONTEND", userId: "U_DAVE", text: "Anyone know why the bundle jumped 200kb after the last merge?", minute: 100 },
  { id: "M_F02", channelId: "C_FRONTEND", userId: "U_OSCAR", text: "Probably the moment.js import — we should be on date-fns. I flagged it in the PR comments.", threadTs: "M_F01", minute: 103 },
  { id: "M_F03", channelId: "C_FRONTEND", userId: "U_DAVE", text: "Ah yep, that's it. Swapping it out now, thanks 🙏", threadTs: "M_F01", minute: 106 },
  { id: "M_F04", channelId: "C_FRONTEND", userId: "U_IVAN", text: "What's our convention for component folder structure? Couldn't find docs.", minute: 112 },
  { id: "M_F05", channelId: "C_FRONTEND", userId: "U_DAVE", text: "Co-locate: `Component/index.tsx`, `Component.test.tsx`, styles next to it. <@U_OSCAR> wrote it up in the wiki, link?", threadTs: "M_F04", minute: 115 },
  { id: "M_F06", channelId: "C_FRONTEND", userId: "U_OSCAR", text: "Here you go <@U_IVAN>: wiki/frontend/conventions. Skim the testing section too.", threadTs: "M_F04", minute: 118 },

  // =========================================================================
  // #backend & #data
  // =========================================================================
  { id: "M_B01", channelId: "C_BACKEND", userId: "U_NORA", text: "Proposing we move the search index to OpenSearch. Current Postgres FTS is hitting limits.", minute: 120 },
  { id: "M_B02", channelId: "C_BACKEND", userId: "U_CAROL", text: "Agree on the limits. What's the migration cost and who operates it after? <@U_RADEK>?", threadTs: "M_B01", minute: 124 },
  { id: "M_B03", channelId: "C_BACKEND", userId: "U_RADEK", text: "Managed OpenSearch keeps ops low. I can spin up a cluster for a spike. Budget sign-off is <@U_LENKA> though.", threadTs: "M_B01", minute: 127 },
  { id: "M_B04", channelId: "C_BACKEND", userId: "U_IVAN", text: "Should I write coupon validation as a DB constraint or in the service layer?", minute: 130 },
  { id: "M_B05", channelId: "C_BACKEND", userId: "U_CAROL", text: "Service layer — keep business rules out of the DB so they're testable. Constraints only for hard invariants.", threadTs: "M_B04", minute: 133 },

  { id: "M_DT01", channelId: "C_DATA", userId: "U_JONAS", text: "Funnel report v1 is up. Drop-off is brutal at the address-entry step (-38%).", minute: 135 },
  { id: "M_DT02", channelId: "C_DATA", userId: "U_HEIDI", text: "Nice. <@U_GRACE> this is the strongest argument for the address autocomplete idea.", threadTs: "M_DT01", minute: 138 },
  { id: "M_DT03", channelId: "C_DATA", userId: "U_GRACE", text: "Agreed. Address UX is owned by <@U_PAVEL> — Pavel can you fold this into the delivery scope?", threadTs: "M_DT01", minute: 141 },
  { id: "M_DT04", channelId: "C_DATA", userId: "U_KLARA", text: "Can we segment that drop-off by new vs returning users?", threadTs: "M_DT01", minute: 144 },
  { id: "M_DT05", channelId: "C_DATA", userId: "U_JONAS", text: "Yes — returning users drop 12%, new users 51%. It's almost entirely a first-time problem.", threadTs: "M_DT01", minute: 147 },

  // =========================================================================
  // #sales, #customer-support, #marketing
  // =========================================================================
  { id: "M_S01", channelId: "C_SALES", userId: "U_NINA", text: "Big prospect (Krayton Foods) asking if we support multi-warehouse routing. Do we?", minute: 90 },
  { id: "M_S02", channelId: "C_SALES", userId: "U_VIKTOR", text: "Product question — <@U_GRACE> can you confirm where multi-warehouse stands?", threadTs: "M_S01", minute: 93 },
  { id: "M_S03", channelId: "C_SALES", userId: "U_GRACE", text: "It's on the roadmap, not GA. <@U_PAVEL> owns the spec — Pavel, can a design partner get early access?", threadTs: "M_S01", minute: 97 },
  { id: "M_S04", channelId: "C_SALES", userId: "U_PAVEL", text: "We can do a beta for one design partner. <@U_NINA> if Krayton commits, I'll prioritize their region.", threadTs: "M_S01", minute: 101 },
  { id: "M_S05", channelId: "C_SALES", userId: "U_JUDY", text: "Closed Vltava Retail 🎉 €48k ARR, starts next month.", minute: 155 },
  { id: "M_S06", channelId: "C_SALES", userId: "U_VIKTOR", text: "🔥 huge, congrats <@U_JUDY>. Loop <@U_MALLORY> in for onboarding.", threadTs: "M_S05", minute: 157 },

  { id: "M_SU01", channelId: "C_SUPPORT", userId: "U_TEREZA", text: "Spike in 'where is my driver' tickets in the Brno region this morning.", minute: 108 },
  { id: "M_SU02", channelId: "C_SUPPORT", userId: "U_MALLORY", text: "Is this the depot window change? <@U_FRANK> any ops issue in Brno?", threadTs: "M_SU01", minute: 111 },
  { id: "M_SU03", channelId: "C_SUPPORT", userId: "U_FRANK", text: "Yes — one van broke down, <@U_DENIS> rerouted. Delays should clear by noon.", threadTs: "M_SU01", minute: 114 },
  { id: "M_SU04", channelId: "C_SUPPORT", userId: "U_TEREZA", text: "Thanks, I'll send proactive ETAs to affected customers.", threadTs: "M_SU01", minute: 117 },
  { id: "M_SU05", channelId: "C_SUPPORT", userId: "U_PAVEL", text: "This is exactly why live driver tracking matters. Adding to the case.", threadTs: "M_SU01", minute: 121 },

  { id: "M_MK01", channelId: "C_MARKETING", userId: "U_OTTO", text: "Series A press goes out Monday. Need a customer quote — anyone have a happy one?", minute: 175 },
  { id: "M_MK02", channelId: "C_MARKETING", userId: "U_BARA", text: "I'll draft the blog post. <@U_JUDY> can Vltava give us a quote?", threadTs: "M_MK01", minute: 178 },
  { id: "M_MK03", channelId: "C_MARKETING", userId: "U_KLARA", text: "I can pull the on-time % from the data team for the press numbers. <@U_HEIDI> good to cite 97%?", threadTs: "M_MK01", minute: 181 },

  // =========================================================================
  // #watercooler — banter, low signal
  // =========================================================================
  { id: "M_W01", channelId: "C_WATERCOOLER", userId: "U_DENIS", text: "Whoever left their lunch in the depot fridge since Tuesday... it has achieved sentience 🧫", minute: 200 },
  { id: "M_W02", channelId: "C_WATERCOOLER", userId: "U_SARA", text: "😂😂 that's Frank's, he keeps 'forgetting'", threadTs: "M_W01", minute: 202 },
  { id: "M_W03", channelId: "C_WATERCOOLER", userId: "U_FRANK", text: "Slander. (it was me)", threadTs: "M_W01", minute: 205 },
  { id: "M_W04", channelId: "C_WATERCOOLER", userId: "U_BARA", text: "Coffee machine is fixed btw ☕ crisis averted", minute: 210 },
  { id: "M_W05", channelId: "C_WATERCOOLER", userId: "U_IVAN", text: "First PR merged today 🎉🎉", minute: 215 },
  { id: "M_W06", channelId: "C_WATERCOOLER", userId: "U_NORA", text: "🚀 welcome to the club <@U_IVAN>", threadTs: "M_W05", minute: 217 },
  { id: "M_W07", channelId: "C_WATERCOOLER", userId: "U_OTTO", text: "Friday lunch — Thai or the burrito place? 🌯", minute: 220 },
  { id: "M_W08", channelId: "C_WATERCOOLER", userId: "U_MILA", text: "Burrito, no contest", threadTs: "M_W07", minute: 222 },
  { id: "M_W09", channelId: "C_WATERCOOLER", userId: "U_JONAS", text: "Thai. I'll die on this hill.", threadTs: "M_W07", minute: 224 },

  // =========================================================================
  // PRIVATE: #leadership, #hiring, #finance-private
  // =========================================================================
  { id: "M_L01", channelId: "C_LEADERSHIP", userId: "U_ALICE", text: "With the raise closed, top priorities: hire 6 eng, ship time-windows, expand to 2 cities. Pushback welcome.", minute: 180 },
  { id: "M_L02", channelId: "C_LEADERSHIP", userId: "U_BOB", text: "6 eng in a quarter is aggressive. <@U_PETRA> what's realistic on hiring pace?", threadTs: "M_L01", minute: 184 },
  { id: "M_L03", channelId: "C_LEADERSHIP", userId: "U_PETRA", text: "Realistically 3-4 quality hires/quarter without lowering the bar. I'd phase it.", threadTs: "M_L01", minute: 188 },
  { id: "M_L04", channelId: "C_LEADERSHIP", userId: "U_LENKA", text: "Budget supports 4 this quarter, 6 if we slow the city expansion. Can't do both at full speed.", threadTs: "M_L01", minute: 191 },
  { id: "M_L05", channelId: "C_LEADERSHIP", userId: "U_FRANK", text: "Ops can absorb one new city cleanly. Two simultaneously stretches the fleet.", threadTs: "M_L01", minute: 194 },
  { id: "M_L06", channelId: "C_LEADERSHIP", userId: "U_ALICE", text: "OK: 4 eng hires + 1 city this quarter, reassess in Q4. <@U_GRACE> own the time-windows ship date.", threadTs: "M_L01", minute: 198 },

  { id: "M_H01", channelId: "C_HIRING", userId: "U_PETRA", text: "Senior Backend role: 3 candidates in final round. Debriefs needed by Friday.", minute: 185 },
  { id: "M_H02", channelId: "C_HIRING", userId: "U_BOB", text: "Candidate B was the strongest technically. <@U_CAROL> did the system design round — Carol, your read?", threadTs: "M_H01", minute: 189 },
  { id: "M_H03", channelId: "C_HIRING", userId: "U_GRACE", text: "Liked Candidate B's product sense in my round too. Slight concern on communication.", threadTs: "M_H01", minute: 193 },
  { id: "M_H04", channelId: "C_HIRING", userId: "U_LUKAS", text: "I'll schedule a final values interview for B. <@U_PETRA> back Monday — hold the offer call till then?", threadTs: "M_H01", minute: 197 },

  { id: "M_FP01", channelId: "C_FINANCE_PRIVATE", userId: "U_LENKA", text: "Runway is now 26 months post-raise. Burn target €310k/mo, we're at €290k.", minute: 200 },
  { id: "M_FP02", channelId: "C_FINANCE_PRIVATE", userId: "U_ZUZANA", text: "Largest variable is fleet leasing. <@U_TOMAS> can we renegotiate the van contract?", threadTs: "M_FP01", minute: 204 },
  { id: "M_FP03", channelId: "C_FINANCE_PRIVATE", userId: "U_TOMAS", text: "Already in talks — expecting 8-10% off if we commit to 12 months. Will confirm next week.", threadTs: "M_FP01", minute: 208 },
  { id: "M_FP04", channelId: "C_FINANCE_PRIVATE", userId: "U_ALICE", text: "Good. Keep the new-hire comp bands aligned to the deck we showed investors.", threadTs: "M_FP01", minute: 212 },

  // =========================================================================
  // DMs (im) — lots of 1:1 routing, several include Alice (the viewer)
  // =========================================================================
  { id: "M_DM_AB1", channelId: "D_ALICE_BOB", userId: "U_ALICE", text: "Are we on track for the time-windows ship date?", minute: 230 },
  { id: "M_DM_AB2", channelId: "D_ALICE_BOB", userId: "U_BOB", text: "Backend's close. The blocker is design — <@U_EVE> still owns the final mockups. I'd check with her on timing.", threadTs: "M_DM_AB1", minute: 233 },
  { id: "M_DM_AB3", channelId: "D_ALICE_BOB", userId: "U_ALICE", text: "And the on-call rotation for the new city?", minute: 236 },
  { id: "M_DM_AB4", channelId: "D_ALICE_BOB", userId: "U_BOB", text: "That's more of an ops staffing question — <@U_FRANK> is building the rota.", threadTs: "M_DM_AB1", minute: 238 },

  { id: "M_DM_AF1", channelId: "D_ALICE_FRANK", userId: "U_ALICE", text: "Bob says you're building the on-call rota for the new city?", minute: 240 },
  { id: "M_DM_AF2", channelId: "D_ALICE_FRANK", userId: "U_FRANK", text: "Drafting it. For the headcount side though you'll want <@U_PETRA> — she's mapping who we hire there.", threadTs: "M_DM_AF1", minute: 243 },

  { id: "M_DM_AG1", channelId: "D_ALICE_GRACE", userId: "U_ALICE", text: "Give me the one-line status on time-windows for the board.", minute: 245 },
  { id: "M_DM_AG2", channelId: "D_ALICE_GRACE", userId: "U_GRACE", text: "On track for end of quarter, gated only by design review this week. Confident.", threadTs: "M_DM_AG1", minute: 248 },

  { id: "M_DM_IB1", channelId: "D_IVAN_BOB", userId: "U_IVAN", text: "Sorry to DM — who approves time off?", minute: 250 },
  { id: "M_DM_IB2", channelId: "D_IVAN_BOB", userId: "U_BOB", text: "Time off goes through <@U_PETRA> in People, or <@U_LUKAS> while she's out.", threadTs: "M_DM_IB1", minute: 252 },
  { id: "M_DM_IB3", channelId: "D_IVAN_BOB", userId: "U_IVAN", text: "Got it, thanks! And for my laptop's busted charger?", minute: 254 },
  { id: "M_DM_IB4", channelId: "D_IVAN_BOB", userId: "U_BOB", text: "Also <@U_PETRA>/office. Honestly anything not-code, start with #ops and <@U_FRANK> will point you.", threadTs: "M_DM_IB1", minute: 256 },

  { id: "M_DM_IC1", channelId: "D_IVAN_CAROL", userId: "U_IVAN", text: "Free to pair on the coupon validation now?", minute: 260 },
  { id: "M_DM_IC2", channelId: "D_IVAN_CAROL", userId: "U_CAROL", text: "Yep, jump on the huddle. Bring your branch up to date with main first.", threadTs: "M_DM_IC1", minute: 262 },
  { id: "M_DM_IC3", channelId: "D_IVAN_CAROL", userId: "U_IVAN", text: "👍 joining", threadTs: "M_DM_IC1", minute: 264 },

  { id: "M_DM_JF1", channelId: "D_JUDY_FRANK", userId: "U_JUDY", text: "Can you expedite the Vltava onboarding shipment?", minute: 266 },
  { id: "M_DM_JF2", channelId: "D_JUDY_FRANK", userId: "U_FRANK", text: "Shipments are <@U_SARA>'s domain — she can expedite. I'll let her know you'll ping.", threadTs: "M_DM_JF1", minute: 268 },

  { id: "M_DM_DE1", channelId: "D_DAVE_EVE", userId: "U_DAVE", text: "Disabled contrast fixed — can you re-check before I merge?", minute: 270 },
  { id: "M_DM_DE2", channelId: "D_DAVE_EVE", userId: "U_EVE", text: "Looks good now, passes AA. Ship it ✅", threadTs: "M_DM_DE1", minute: 272 },

  { id: "M_DM_MG1", channelId: "D_MALLORY_GRACE", userId: "U_MALLORY", text: "Three enterprise customers asked for an SLA guarantee doc. Do we have one?", minute: 274 },
  { id: "M_DM_MG2", channelId: "D_MALLORY_GRACE", userId: "U_GRACE", text: "Not a formal one. Legal/contract wording is really <@U_TOMAS> + <@U_LENKA> — ask them for the template.", threadTs: "M_DM_MG1", minute: 277 },

  { id: "M_DM_HC1", channelId: "D_HEIDI_CAROL", userId: "U_HEIDI", text: "The events table is missing checkout_started for ~5% of sessions. Bug?", minute: 280 },
  { id: "M_DM_HC2", channelId: "D_HEIDI_CAROL", userId: "U_CAROL", text: "Likely the ad-blocker drop-off, but let me check the server-side fallback. Could be a real gap.", threadTs: "M_DM_HC1", minute: 283 },

  { id: "M_DM_NV1", channelId: "D_NINA_VIKTOR", userId: "U_NINA", text: "Krayton wants a call with someone technical before signing. Who?", minute: 285 },
  { id: "M_DM_NV2", channelId: "D_NINA_VIKTOR", userId: "U_VIKTOR", text: "For pre-sales technical, pull in <@U_PAVEL> (product) — he can speak to the roadmap credibly.", threadTs: "M_DM_NV1", minute: 287 },

  { id: "M_DM_PA1", channelId: "D_PETRA_ALICE", userId: "U_PETRA", text: "Approved the 4-hire plan in my system. Sending offers Monday. One candidate needs visa support — flag for finance?", minute: 290 },
  { id: "M_DM_PA2", channelId: "D_PETRA_ALICE", userId: "U_ALICE", text: "Yes, loop <@U_LENKA> on visa costs. Thanks Petra, enjoy the rest of your PTO 🌴", threadTs: "M_DM_PA1", minute: 293 },

  // =========================================================================
  // Group DMs (mpim)
  // =========================================================================
  { id: "M_GO1", channelId: "G_OPS_HUDDLE", userId: "U_FRANK", text: "Daily ops huddle: any blockers for tomorrow's routes?", minute: 300 },
  { id: "M_GO2", channelId: "G_OPS_HUDDLE", userId: "U_SARA", text: "Warehouse 2 is short one picker — borrowing from W1 for the morning.", threadTs: "M_GO1", minute: 302 },
  { id: "M_GO3", channelId: "G_OPS_HUDDLE", userId: "U_DENIS", text: "Van 4 is in for service till Wed. Down to 9 vehicles, routes rebalanced.", threadTs: "M_GO1", minute: 304 },
  { id: "M_GO4", channelId: "G_OPS_HUDDLE", userId: "U_FRANK", text: "Noted. <@U_SARA> if W2 is still short by Thursday, escalate to me and I'll get temp staff.", threadTs: "M_GO1", minute: 306 },

  { id: "M_GR1", channelId: "G_RELEASE", userId: "U_BOB", text: "Release checklist for Friday — who's on deck?", minute: 310 },
  { id: "M_GR2", channelId: "G_RELEASE", userId: "U_RADEK", text: "I'll run the deploy and watch dashboards. Freeze window 12-18.", threadTs: "M_GR1", minute: 312 },
  { id: "M_GR3", channelId: "G_RELEASE", userId: "U_CAROL", text: "Backend migrations are idempotent and tested on staging. I'll be around.", threadTs: "M_GR1", minute: 314 },
  { id: "M_GR4", channelId: "G_RELEASE", userId: "U_DAVE", text: "Frontend's behind a feature flag, so we can ship dark and flip later. Safer.", threadTs: "M_GR1", minute: 316 },
  { id: "M_GR5", channelId: "G_RELEASE", userId: "U_BOB", text: "Perfect. <@U_RADEK> you're IC for the window. Ping me only if it's a rollback decision.", threadTs: "M_GR1", minute: 318 },

  { id: "M_GD1", channelId: "G_DESIGN_PROD", userId: "U_GRACE", text: "Time-window picker review — Eve, Mila, where are we?", minute: 320 },
  { id: "M_GD2", channelId: "G_DESIGN_PROD", userId: "U_MILA", text: "First pass done, link in the Figma. Reused the booking calendar component.", threadTs: "M_GD1", minute: 322 },
  { id: "M_GD3", channelId: "G_DESIGN_PROD", userId: "U_EVE", text: "Reviewed — two tweaks on the empty state then it's ready for <@U_DAVE> to build.", threadTs: "M_GD1", minute: 324 },
  { id: "M_GD4", channelId: "G_DESIGN_PROD", userId: "U_PAVEL", text: "Great. I'll write the acceptance criteria today so eng can pick it up Monday.", threadTs: "M_GD1", minute: 326 },

  { id: "M_GA1", channelId: "G_ALICE_HEADS", userId: "U_ALICE", text: "Board deck due Wednesday. I need: eng progress, product status, ops health, sales pipeline. One slide each.", minute: 330 },
  { id: "M_GA2", channelId: "G_ALICE_HEADS", userId: "U_BOB", text: "Eng slide: I'll get it to you Tuesday. <@U_GRACE> coordinate so we don't double-cover the roadmap.", threadTs: "M_GA1", minute: 333 },
  { id: "M_GA3", channelId: "G_ALICE_HEADS", userId: "U_GRACE", text: "Will do. Product + roadmap on mine, Bob keeps yours to delivery/velocity.", threadTs: "M_GA1", minute: 335 },
  { id: "M_GA4", channelId: "G_ALICE_HEADS", userId: "U_FRANK", text: "Ops health slide done — on-time %, fleet utilization, incident count. Sending tonight.", threadTs: "M_GA1", minute: 337 },
  { id: "M_GA5", channelId: "G_ALICE_HEADS", userId: "U_VIKTOR", text: "Pipeline slide ready. €1.2M weighted, two deals likely to close before the board call.", threadTs: "M_GA1", minute: 339 },

  { id: "M_GS1", channelId: "G_SUPPORT_ESC", userId: "U_TEREZA", text: "Escalation: enterprise customer threatening to churn over repeated late deliveries in Brno.", minute: 340 },
  { id: "M_GS2", channelId: "G_SUPPORT_ESC", userId: "U_MALLORY", text: "I'll own the relationship. <@U_FRANK> can you confirm the Brno issue is resolved so I can reassure them?", threadTs: "M_GS1", minute: 342 },
  { id: "M_GS3", channelId: "G_SUPPORT_ESC", userId: "U_FRANK", text: "Resolved — the broken van is back, plus we added a backup driver for that region.", threadTs: "M_GS1", minute: 344 },
  { id: "M_GS4", channelId: "G_SUPPORT_ESC", userId: "U_GRACE", text: "If they want it in writing, I'll get an SLA addendum drafted. Let me know.", threadTs: "M_GS1", minute: 346 },

  // =========================================================================
  // WAVE 2 — more volume, deeper threads, more routing (incl. multi-hop).
  // =========================================================================

  // #engineering — more eng traffic, Bob keeps routing, others answer
  { id: "M_E21", channelId: "C_ENGINEERING", userId: "U_OSCAR", text: "The mobile build is failing on CI — Android only. Anyone seen this?", minute: 350 },
  { id: "M_E22", channelId: "C_ENGINEERING", userId: "U_BOB", text: "CI/build infra is <@U_RADEK>'s domain, he set up the runners.", threadTs: "M_E21", minute: 352 },
  { id: "M_E23", channelId: "C_ENGINEERING", userId: "U_RADEK", text: "Android runner ran out of disk. Cleared the cache, retry now <@U_OSCAR>.", threadTs: "M_E21", minute: 355 },
  { id: "M_E24", channelId: "C_ENGINEERING", userId: "U_OSCAR", text: "Green ✅ thanks", threadTs: "M_E21", minute: 358 },
  { id: "M_E25", channelId: "C_ENGINEERING", userId: "U_IVAN", text: "What's the policy on force-pushing to feature branches?", minute: 360 },
  { id: "M_E26", channelId: "C_ENGINEERING", userId: "U_NORA", text: "Fine on your own branch, never on shared ones. Use `--force-with-lease` to be safe.", threadTs: "M_E25", minute: 362 },
  { id: "M_E27", channelId: "C_ENGINEERING", userId: "U_GRACE", text: "Can we add a 'gift message' field to orders for the holiday campaign? <@U_OTTO> wants it.", minute: 365 },
  { id: "M_E28", channelId: "C_ENGINEERING", userId: "U_BOB", text: "Orders schema is <@U_CAROL>. Carol, how big a lift?", threadTs: "M_E27", minute: 367 },
  { id: "M_E29", channelId: "C_ENGINEERING", userId: "U_CAROL", text: "Small — one nullable column + API field. Half a day. But put it behind the campaign flag <@U_DAVE>.", threadTs: "M_E27", minute: 370 },
  { id: "M_E30", channelId: "C_ENGINEERING", userId: "U_DAVE", text: "Will do, I'll wire the flag.", threadTs: "M_E27", minute: 372 },
  { id: "M_E31", channelId: "C_ENGINEERING", userId: "U_HEIDI", text: "Reminder: please don't query the prod replica directly for analytics, it's affecting latency.", minute: 375 },
  { id: "M_E32", channelId: "C_ENGINEERING", userId: "U_IVAN", text: "Oops, that might've been me. Where should I query instead?", threadTs: "M_E31", minute: 377 },
  { id: "M_E33", channelId: "C_ENGINEERING", userId: "U_HEIDI", text: "Use the warehouse (Snowflake), not the replica. <@U_JONAS> can give you access + the saved queries.", threadTs: "M_E31", minute: 379 },
  { id: "M_E34", channelId: "C_ENGINEERING", userId: "U_JONAS", text: "DMing you the warehouse creds and a starter notebook <@U_IVAN>.", threadTs: "M_E31", minute: 382 },

  // #backend — design discussion + a routing chain
  { id: "M_B06", channelId: "C_BACKEND", userId: "U_NORA", text: "Who decided we'd use UUIDv7 for new tables? Want to make sure I'm consistent.", minute: 385 },
  { id: "M_B07", channelId: "C_BACKEND", userId: "U_CAROL", text: "That was an ADR I wrote — yes, UUIDv7 for anything new, it's in `docs/adr/0012`.", threadTs: "M_B06", minute: 388 },
  { id: "M_B08", channelId: "C_BACKEND", userId: "U_IVAN", text: "How do I add a feature flag? Couldn't find where they're defined.", minute: 390 },
  { id: "M_B09", channelId: "C_BACKEND", userId: "U_RADEK", text: "Flags live in the config service. <@U_CAROL> owns the client lib though, she can show you the pattern.", threadTs: "M_B08", minute: 392 },
  { id: "M_B10", channelId: "C_BACKEND", userId: "U_CAROL", text: "It's `flags.ts` — register the flag, default it off, gate with `isEnabled('name')`. Examples in there <@U_IVAN>.", threadTs: "M_B08", minute: 395 },
  { id: "M_B11", channelId: "C_BACKEND", userId: "U_NORA", text: "OpenSearch spike done — index build is 6 min for full catalog, queries ~40ms p95. Writeup attached.", minute: 398 },
  { id: "M_B12", channelId: "C_BACKEND", userId: "U_CAROL", text: "🔥 that's a big improvement over FTS. Let's bring it to the release crew.", threadTs: "M_B11", minute: 401 },

  // #frontend — more
  { id: "M_F07", channelId: "C_FRONTEND", userId: "U_MILA", text: "New design tokens are published — spacing scale changed slightly, please rebuild.", minute: 404 },
  { id: "M_F08", channelId: "C_FRONTEND", userId: "U_DAVE", text: "Got it. <@U_OSCAR> the mobile theme pulls from the same tokens right?", threadTs: "M_F07", minute: 406 },
  { id: "M_F09", channelId: "C_FRONTEND", userId: "U_OSCAR", text: "Yep, shared package. I'll bump the version on mobile too.", threadTs: "M_F07", minute: 408 },
  { id: "M_F10", channelId: "C_FRONTEND", userId: "U_IVAN", text: "Is there a Storybook for our components?", minute: 410 },
  { id: "M_F11", channelId: "C_FRONTEND", userId: "U_EVE", text: "Yes! storybook.nimbus.internal — that's the source of truth for component states.", threadTs: "M_F10", minute: 412 },

  // #design — more, plus routing
  { id: "M_D07", channelId: "C_DESIGN", userId: "U_GRACE", text: "Do we have a brand color for the 'premium' tier badge?", minute: 414 },
  { id: "M_D08", channelId: "C_DESIGN", userId: "U_EVE", text: "Not yet — that's a brand decision, <@U_OTTO> owns brand. Otto, gold or deep purple?", threadTs: "M_D07", minute: 417 },
  { id: "M_D09", channelId: "C_DESIGN", userId: "U_MILA", text: "I mocked both, putting them in the Figma for a vote.", threadTs: "M_D07", minute: 420 },
  { id: "M_D10", channelId: "C_DESIGN", userId: "U_ALICE", text: "Purple. It's our brand. 💜", threadTs: "M_D07", minute: 423 },

  // #data — more
  { id: "M_DT06", channelId: "C_DATA", userId: "U_LENKA", text: "Can I get monthly revenue split by region for the board deck?", minute: 426 },
  { id: "M_DT07", channelId: "C_DATA", userId: "U_HEIDI", text: "<@U_JONAS> can build that — Jonas, use the finance-approved revenue definition, not gross.", threadTs: "M_DT06", minute: 429 },
  { id: "M_DT08", channelId: "C_DATA", userId: "U_JONAS", text: "On it. <@U_ZUZANA> can you confirm the recognized-revenue rules so I match finance exactly?", threadTs: "M_DT06", minute: 432 },
  { id: "M_DT09", channelId: "C_DATA", userId: "U_KLARA", text: "While you're in there — can we also get CAC by channel? Marketing keeps asking.", threadTs: "M_DT06", minute: 435 },
  { id: "M_DT10", channelId: "C_DATA", userId: "U_HEIDI", text: "CAC needs spend data from <@U_OTTO>'s side. Otto, can you export ad spend by channel for Q2?", threadTs: "M_DT06", minute: 438 },

  // #ops — more switchboarding
  { id: "M_O19", channelId: "C_OPS", userId: "U_IVAN", text: "My GitHub 2FA reset isn't going through, who handles that?", minute: 440 },
  { id: "M_O20", channelId: "C_OPS", userId: "U_FRANK", text: "Account/SSO is <@U_RADEK> (he's our admin). Radek can force a reset.", threadTs: "M_O19", minute: 442 },
  { id: "M_O21", channelId: "C_OPS", userId: "U_RADEK", text: "Reset link sent <@U_IVAN>, valid 15 min.", threadTs: "M_O19", minute: 445 },
  { id: "M_O22", channelId: "C_OPS", userId: "U_JUDY", text: "Need a signed NDA template for a prospect — where do I find it?", minute: 448 },
  { id: "M_O23", channelId: "C_OPS", userId: "U_FRANK", text: "Legal docs/templates are with <@U_TOMAS>. He keeps the approved versions.", threadTs: "M_O22", minute: 450 },
  { id: "M_O24", channelId: "C_OPS", userId: "U_TEREZA", text: "Printer on 2nd floor is jammed again 🖨️😤", minute: 452 },
  { id: "M_O25", channelId: "C_OPS", userId: "U_FRANK", text: "Ha — office stuff is <@U_PETRA>/<@U_LUKAS>. Lukas is covering, but honestly try turning it off and on first 😄", threadTs: "M_O24", minute: 454 },
  { id: "M_O26", channelId: "C_OPS", userId: "U_SARA", text: "FYI peak-season temp drivers start next Monday, 4 of them. Onboarding docs ready.", minute: 456 },
  { id: "M_O27", channelId: "C_OPS", userId: "U_DENIS", text: "I'll do their vehicle + route briefing. <@U_SARA> send me the names.", threadTs: "M_O26", minute: 458 },

  // #product — more routing, multi-hop Grace -> Pavel -> Bob -> Nora
  { id: "M_P12", channelId: "C_PRODUCT", userId: "U_KLARA", text: "Marketing wants to A/B test the new onboarding flow. Can the platform support that?", minute: 460 },
  { id: "M_P13", channelId: "C_PRODUCT", userId: "U_GRACE", text: "Experimentation infra is owned by <@U_PAVEL> on the product side — Pavel, what can we run today?", threadTs: "M_P12", minute: 462 },
  { id: "M_P14", channelId: "C_PRODUCT", userId: "U_PAVEL", text: "We have the framework but the assignment service is flaky. <@U_BOB> is that on the eng roadmap?", threadTs: "M_P12", minute: 465 },
  { id: "M_P15", channelId: "C_PRODUCT", userId: "U_BOB", text: "<@U_NORA> rebuilt the assignment service last month — Nora, is it production-ready for A/B now?", threadTs: "M_P12", minute: 468 },
  { id: "M_P16", channelId: "C_PRODUCT", userId: "U_NORA", text: "Yes, it's solid now — deterministic bucketing, sticky by user id. Go for it <@U_KLARA>.", threadTs: "M_P12", minute: 471 },
  { id: "M_P17", channelId: "C_PRODUCT", userId: "U_MALLORY", text: "Customers asking about a self-serve plan change. Roadmap?", minute: 474 },
  { id: "M_P18", channelId: "C_PRODUCT", userId: "U_GRACE", text: "Billing self-serve is unowned right now honestly. <@U_PAVEL> can you take it or should we hire for it? Let's discuss in planning.", threadTs: "M_P17", minute: 477 },

  // #sales — more
  { id: "M_S07", channelId: "C_SALES", userId: "U_NINA", text: "Prospect wants references. Can we share a case study?", minute: 480 },
  { id: "M_S08", channelId: "C_SALES", userId: "U_VIKTOR", text: "Case studies are <@U_OTTO>'s — Otto, do we have the Vltava one ready to share externally?", threadTs: "M_S07", minute: 482 },
  { id: "M_S09", channelId: "C_SALES", userId: "U_OTTO", text: "Vltava one is in review with legal. I can share the anonymized retail one today.", threadTs: "M_S07", minute: 485 },
  { id: "M_S10", channelId: "C_SALES", userId: "U_JUDY", text: "What's our standard discount authority? Prospect pushing for 15%.", minute: 488 },
  { id: "M_S11", channelId: "C_SALES", userId: "U_VIKTOR", text: "Up to 10% is yours to give. Anything beyond needs <@U_LENKA> sign-off on margin.", threadTs: "M_S10", minute: 491 },
  { id: "M_S12", channelId: "C_SALES", userId: "U_LENKA", text: "15% is fine if it's 24-month commit, not month-to-month. Otherwise cap at 10%.", threadTs: "M_S10", minute: 494 },

  // #customer-support — more
  { id: "M_SU06", channelId: "C_SUPPORT", userId: "U_TEREZA", text: "Customer reporting the app shows wrong delivery ETA. Bug or expected?", minute: 497 },
  { id: "M_SU07", channelId: "C_SUPPORT", userId: "U_MALLORY", text: "Could be the tracking calc. <@U_PAVEL> does ETA logic sit with product or eng?", threadTs: "M_SU06", minute: 500 },
  { id: "M_SU08", channelId: "C_SUPPORT", userId: "U_PAVEL", text: "Logic's in the routing service — that's eng. <@U_FRANK> who owns routing calc on the eng side these days?", threadTs: "M_SU06", minute: 503 },
  { id: "M_SU09", channelId: "C_SUPPORT", userId: "U_FRANK", text: "Routing/ETA service is <@U_RADEK> + <@U_CAROL>. Tagging them — looks like a real bug, screenshots in the ticket.", threadTs: "M_SU06", minute: 506 },
  { id: "M_SU10", channelId: "C_SUPPORT", userId: "U_TEREZA", text: "Thanks — meanwhile I'll tell the customer we're investigating.", threadTs: "M_SU06", minute: 509 },

  // #marketing — more
  { id: "M_MK04", channelId: "C_MARKETING", userId: "U_BARA", text: "Blog draft for the Series A is ready for review.", minute: 512 },
  { id: "M_MK05", channelId: "C_MARKETING", userId: "U_OTTO", text: "Nice. <@U_ALICE> can you do a final read since you're quoted?", threadTs: "M_MK04", minute: 514 },
  { id: "M_MK06", channelId: "C_MARKETING", userId: "U_ALICE", text: "Read it — one edit on the headcount number, otherwise 👍 ship Monday.", threadTs: "M_MK04", minute: 517 },
  { id: "M_MK07", channelId: "C_MARKETING", userId: "U_KLARA", text: "Can we get the social assets sized for LinkedIn + X?", minute: 520 },
  { id: "M_MK08", channelId: "C_MARKETING", userId: "U_OTTO", text: "Design request — <@U_MILA> can you do the social cuts? Specs in the brief.", threadTs: "M_MK07", minute: 522 },

  // #general — more company chatter
  { id: "M_G07", channelId: "C_GENERAL", userId: "U_ALICE", text: "All-hands moved to 3:30pm Friday to fit everyone. Calendar updated.", minute: 525 },
  { id: "M_G08", channelId: "C_GENERAL", userId: "U_FRANK", text: "Parking garage closed Saturday for maintenance — use the street lot. <@U_LUKAS> has the permit codes.", minute: 528 },
  { id: "M_G09", channelId: "C_GENERAL", userId: "U_BARA", text: "Anyone going to the logistics meetup Thursday? Carpooling 🚗", minute: 531 },
  { id: "M_G10", channelId: "C_GENERAL", userId: "U_JONAS", text: "I'm in!", threadTs: "M_G09", minute: 533 },
  { id: "M_G11", channelId: "C_GENERAL", userId: "U_NINA", text: "Me too, can I get a ride?", threadTs: "M_G09", minute: 535 },

  // #watercooler — more banter
  { id: "M_W10", channelId: "C_WATERCOOLER", userId: "U_CAROL", text: "We survived the SEV2 today. Beers on me Friday 🍺", minute: 540 },
  { id: "M_W11", channelId: "C_WATERCOOLER", userId: "U_RADEK", text: "Earned. My adrenaline is still recovering.", threadTs: "M_W10", minute: 542 },
  { id: "M_W12", channelId: "C_WATERCOOLER", userId: "U_DAVE", text: "New office plant has been named 'Deploy'. RIP if we ever kill it 🪴", minute: 545 },
  { id: "M_W13", channelId: "C_WATERCOOLER", userId: "U_MILA", text: "😂 fitting", threadTs: "M_W12", minute: 547 },
  { id: "M_W14", channelId: "C_WATERCOOLER", userId: "U_OTTO", text: "Burrito place won the vote. Friday 12:30, meet in the lobby 🌯", minute: 550 },

  // DM: Grace -> Bob multi-hop continued (board prep)
  { id: "M_DM_AB5", channelId: "D_ALICE_BOB", userId: "U_ALICE", text: "One more — can we commit to the OpenSearch migration this quarter?", minute: 555 },
  { id: "M_DM_AB6", channelId: "D_ALICE_BOB", userId: "U_BOB", text: "Spike looks great but it's a budget call — <@U_LENKA> needs to ok the cluster cost first.", threadTs: "M_DM_AB1", minute: 558 },

  // DM: Mallory -> Grace follow-up
  { id: "M_DM_MG3", channelId: "D_MALLORY_GRACE", userId: "U_MALLORY", text: "Tomas sent the SLA template, thanks. One customer wants 99.9% — can we commit?", minute: 560 },
  { id: "M_DM_MG4", channelId: "D_MALLORY_GRACE", userId: "U_GRACE", text: "Don't commit to a number without <@U_RADEK> — he knows our actual uptime. Ask him before you sign anything.", threadTs: "M_DM_MG1", minute: 563 },

  // DM: Heidi -> Carol resolution
  { id: "M_DM_HC3", channelId: "D_HEIDI_CAROL", userId: "U_CAROL", text: "Confirmed — server-side fallback wasn't firing for guest checkout. Real bug, PR up. Good catch.", minute: 566 },
  { id: "M_DM_HC4", channelId: "D_HEIDI_CAROL", userId: "U_HEIDI", text: "🙌 I'll backfill the missing events once it's deployed.", threadTs: "M_DM_HC1", minute: 568 },

  // New DM-ish thread in existing im D_JUDY_FRANK
  { id: "M_DM_JF3", channelId: "D_JUDY_FRANK", userId: "U_JUDY", text: "Sara expedited it, thank you! You're a machine.", minute: 570 },
  { id: "M_DM_JF4", channelId: "D_JUDY_FRANK", userId: "U_FRANK", text: "Just routing 😄 Sara did the work.", threadTs: "M_DM_JF1", minute: 572 },

  // Group DM follow-ups
  { id: "M_GR6", channelId: "G_RELEASE", userId: "U_CAROL", text: "Adding OpenSearch migration to next release scope once Lenka approves budget.", minute: 575 },
  { id: "M_GR7", channelId: "G_RELEASE", userId: "U_RADEK", text: "I'll write the runbook for the index cutover so it's zero-downtime.", threadTs: "M_GR1", minute: 578 },
  { id: "M_GO5", channelId: "G_OPS_HUDDLE", userId: "U_SARA", text: "W2 picker situation resolved — got a temp through the agency.", threadTs: "M_GO1", minute: 580 },
  { id: "M_GO6", channelId: "G_OPS_HUDDLE", userId: "U_DENIS", text: "Van 4 back from service early, full fleet tomorrow 🛻", threadTs: "M_GO1", minute: 582 },
  { id: "M_GA6", channelId: "G_ALICE_HEADS", userId: "U_ALICE", text: "Got all four slides, thank you. Deck assembled — review draft tonight, edits by morning.", threadTs: "M_GA1", minute: 585 },

  // =========================================================================
  // WAVE 3 — extra volume to round out the dataset; more threads + routing.
  // =========================================================================

  // #engineering — onboarding doc thread + Petra/People routing through eng
  { id: "M_E35", channelId: "C_ENGINEERING", userId: "U_IVAN", text: "Is there an architecture overview doc anywhere? Trying to build a mental model.", minute: 590 },
  { id: "M_E36", channelId: "C_ENGINEERING", userId: "U_BOB", text: "There's an outdated one. <@U_CAROL> keeps the system diagram, and <@U_RADEK> has the infra map.", threadTs: "M_E35", minute: 592 },
  { id: "M_E37", channelId: "C_ENGINEERING", userId: "U_CAROL", text: "I'll spend 30 min today refreshing the diagram and walk you through it <@U_IVAN>.", threadTs: "M_E35", minute: 595 },
  { id: "M_E38", channelId: "C_ENGINEERING", userId: "U_DAVE", text: "Can we standardize on one date library across web + mobile? Tired of the moment/date-fns split.", minute: 598 },
  { id: "M_E39", channelId: "C_ENGINEERING", userId: "U_OSCAR", text: "+1 for date-fns everywhere. I'll do the mobile migration if web does the same.", threadTs: "M_E38", minute: 601 },
  { id: "M_E40", channelId: "C_ENGINEERING", userId: "U_BOB", text: "Make it an ADR so it sticks. <@U_NORA> can you own writing it up?", threadTs: "M_E38", minute: 604 },
  { id: "M_E41", channelId: "C_ENGINEERING", userId: "U_NORA", text: "Sure, I'll draft ADR-0013 today.", threadTs: "M_E38", minute: 607 },

  // #incidents — small second incident, fully answered
  { id: "M_I11", channelId: "C_INCIDENTS", userId: "U_NORA", text: "⚠️ SEV3: search returning stale results for ~3% of queries. Not customer-blocking but tracking it.", minute: 610 },
  { id: "M_I12", channelId: "C_INCIDENTS", userId: "U_RADEK", text: "Cache invalidation lag on the FTS index. Reindex job is behind. Kicking a manual reindex.", threadTs: "M_I11", minute: 613 },
  { id: "M_I13", channelId: "C_INCIDENTS", userId: "U_NORA", text: "This is exactly the case OpenSearch fixes. Manual reindex done, results fresh again. Closing SEV3.", threadTs: "M_I11", minute: 617 },
  { id: "M_I14", channelId: "C_INCIDENTS", userId: "U_BOB", text: "Good. Adds weight to prioritizing the migration. Thanks <@U_NORA> <@U_RADEK>.", threadTs: "M_I11", minute: 620 },

  // #ops — a couple more switchboard hits incl. People routing
  { id: "M_O28", channelId: "C_OPS", userId: "U_IVAN", text: "Where do I submit an expense for the meetup tickets?", minute: 623 },
  { id: "M_O29", channelId: "C_OPS", userId: "U_FRANK", text: "Expenses go through <@U_ZUZANA> in finance — she'll have the form. New policy starts July 1 so check the date.", threadTs: "M_O28", minute: 625 },
  { id: "M_O30", channelId: "C_OPS", userId: "U_ZUZANA", text: "Submit via the portal, tag it 'team-event'. Reimbursed in the next run <@U_IVAN>.", threadTs: "M_O28", minute: 628 },
  { id: "M_O31", channelId: "C_OPS", userId: "U_BARA", text: "Need the company logo in vector for a partner deck. Where's the brand kit?", minute: 631 },
  { id: "M_O32", channelId: "C_OPS", userId: "U_FRANK", text: "Brand kit is <@U_OTTO> / marketing — he keeps the master assets in the shared drive.", threadTs: "M_O31", minute: 633 },

  // #hiring — extra debrief thread
  { id: "M_H05", channelId: "C_HIRING", userId: "U_EVE", text: "For the Product Designer role: candidate's portfolio is strong but light on systems work.", minute: 636 },
  { id: "M_H06", channelId: "C_HIRING", userId: "U_GRACE", text: "Agree. <@U_PETRA> can we add a design-systems exercise to the loop for this role generally?", threadTs: "M_H05", minute: 639 },
  { id: "M_H07", channelId: "C_HIRING", userId: "U_LUKAS", text: "I'll update the interview kit. <@U_EVE> can you write the exercise prompt?", threadTs: "M_H05", minute: 642 },

  // #design — handoff thread
  { id: "M_D11", channelId: "C_DESIGN", userId: "U_DAVE", text: "Time-window picker is built behind the flag. <@U_EVE> ready for a design QA pass?", minute: 645 },
  { id: "M_D12", channelId: "C_DESIGN", userId: "U_EVE", text: "Yes — staging link? I'll go through it against the Figma today.", threadTs: "M_D11", minute: 647 },
  { id: "M_D13", channelId: "C_DESIGN", userId: "U_MILA", text: "I'll check the empty + error states specifically, those changed late.", threadTs: "M_D11", minute: 650 },

  // DM Alice-Frank wrap
  { id: "M_DM_AF3", channelId: "D_ALICE_FRANK", userId: "U_ALICE", text: "Thanks — Petra already confirmed the 4-hire plan with me directly. We're aligned.", minute: 653 },
  { id: "M_DM_AF4", channelId: "D_ALICE_FRANK", userId: "U_FRANK", text: "Perfect, I'll build the new-city rota around those 4. Will share the draft in #leadership.", threadTs: "M_DM_AF1", minute: 656 },

  // DM Ivan-Carol wrap
  { id: "M_DM_IC4", channelId: "D_IVAN_CAROL", userId: "U_CAROL", text: "Nice work today — coupon validation's merged. You're picking this up fast.", minute: 659 },
  { id: "M_DM_IC5", channelId: "D_IVAN_CAROL", userId: "U_IVAN", text: "Thanks for the patience 🙏 the flag pattern finally clicked.", threadTs: "M_DM_IC1", minute: 662 },

  // =========================================================================
  // WAVE 4 — deepen routing (more multi-hop), grow threads to 4-8 replies,
  // make DMs/group-DMs feel like real back-and-forth. New ids only.
  // =========================================================================

  // ---- #ops: a 4-hop switchboard relay (Ivan → Frank → Bob → Carol → Radek) ----
  { id: "M_O33", channelId: "C_OPS", userId: "U_IVAN", text: "Trying to get a service account for the nightly export job — no idea where to even start. Help?", minute: 670 },
  { id: "M_O34", channelId: "C_OPS", userId: "U_FRANK", text: "Service accounts are an eng-platform thing, not ops. <@U_BOB> who owns service-account provisioning now?", threadTs: "M_O33", minute: 672 },
  { id: "M_O35", channelId: "C_OPS", userId: "U_BOB", text: "We moved that under the data platform — <@U_CAROL> set up the IAM roles, she'll know the right scope to grant.", threadTs: "M_O33", minute: 675 },
  { id: "M_O36", channelId: "C_OPS", userId: "U_CAROL", text: "I own the roles but the actual key issuance is gated behind <@U_RADEK>'s vault — Radek has to mint it. I'll tell him the scope.", threadTs: "M_O33", minute: 678 },
  { id: "M_O37", channelId: "C_OPS", userId: "U_RADEK", text: "Minted a read-only export account, scoped to the warehouse only. Creds in your vault inbox <@U_IVAN>. Rotate it in 90 days.", threadTs: "M_O33", minute: 682 },
  { id: "M_O38", channelId: "C_OPS", userId: "U_IVAN", text: "Four people later, but I have it 😅 thank you all 🙏", threadTs: "M_O33", minute: 685 },
  // Frank routing again, fast
  { id: "M_O39", channelId: "C_OPS", userId: "U_NINA", text: "A prospect is asking for our SOC 2 report. Do we have one and who can send it?", minute: 688 },
  { id: "M_O40", channelId: "C_OPS", userId: "U_FRANK", text: "Security/compliance docs sit with <@U_RADEK> (he ran the audit) — and anything that leaves the building needs <@U_TOMAS> to sign off first.", threadTs: "M_O39", minute: 690 },
  { id: "M_O41", channelId: "C_OPS", userId: "U_RADEK", text: "We have Type I, Type II is in progress. <@U_TOMAS> ok to share Type I under NDA?", threadTs: "M_O39", minute: 693 },
  { id: "M_O42", channelId: "C_OPS", userId: "U_TOMAS", text: "Yes, Type I under signed NDA only. <@U_NINA> get the NDA from me first, then Radek sends the report.", threadTs: "M_O39", minute: 696 },
  // Sara answers directly (non-routing)
  { id: "M_O43", channelId: "C_OPS", userId: "U_TEREZA", text: "Which warehouse handles the Ostrava returns now?", minute: 699 },
  { id: "M_O44", channelId: "C_OPS", userId: "U_SARA", text: "All Ostrava + Brno returns route to W2 since the consolidation. Send them there.", threadTs: "M_O43", minute: 701 },

  // ---- #engineering: a deep incident-style debug thread (7 replies) ----
  { id: "M_E42", channelId: "C_ENGINEERING", userId: "U_OSCAR", text: "Mobile push notifications stopped sending ~30 min ago. No code change on our side. Anyone?", minute: 705 },
  { id: "M_E43", channelId: "C_ENGINEERING", userId: "U_BOB", text: "Push goes through the notification service — <@U_NORA> owns that, and <@U_RADEK> for the FCM/APNs creds.", threadTs: "M_E42", minute: 707 },
  { id: "M_E44", channelId: "C_ENGINEERING", userId: "U_NORA", text: "Service is up, queue is draining fine. So messages are being accepted but not delivered — smells like a credential problem.", threadTs: "M_E42", minute: 710 },
  { id: "M_E45", channelId: "C_ENGINEERING", userId: "U_RADEK", text: "Checking… the APNs cert expired this morning. Classic. Renewing now.", threadTs: "M_E42", minute: 713 },
  { id: "M_E46", channelId: "C_ENGINEERING", userId: "U_OSCAR", text: "Android (FCM) is also dead though, not just iOS. So it's not only the APNs cert?", threadTs: "M_E42", minute: 716 },
  { id: "M_E47", channelId: "C_ENGINEERING", userId: "U_NORA", text: "Good catch. Both dead = upstream. The provider's status page just went red. It's their outage, not ours.", threadTs: "M_E42", minute: 719 },
  { id: "M_E48", channelId: "C_ENGINEERING", userId: "U_RADEK", text: "Confirmed, provider incident. Cert was a real (separate) problem so I renewed it anyway. We're queued and will flush when they recover.", threadTs: "M_E42", minute: 722 },
  { id: "M_E49", channelId: "C_ENGINEERING", userId: "U_OSCAR", text: "Provider's back, queue flushed, pushes flowing. Two bugs for the price of one 😮‍💨 thanks both.", threadTs: "M_E42", minute: 726 },
  // Carol answers directly, plus a design-review nitpick thread spinning off
  { id: "M_E50", channelId: "C_ENGINEERING", userId: "U_DAVE", text: "RFC: should the new orders API be REST or do we finally do GraphQL? Genuinely undecided.", minute: 730 },
  { id: "M_E51", channelId: "C_ENGINEERING", userId: "U_CAROL", text: "REST. We have one consumer and a tight schema — GraphQL is solving a problem we don't have yet. Revisit when mobile + web + partners all diverge.", threadTs: "M_E50", minute: 733 },
  { id: "M_E52", channelId: "C_ENGINEERING", userId: "U_NORA", text: "Agree with Carol. The flexibility cost isn't worth it for two endpoints. Keep it boring.", threadTs: "M_E50", minute: 736 },
  { id: "M_E53", channelId: "C_ENGINEERING", userId: "U_OSCAR", text: "Mobile would love field-selection eventually, but not enough to take on the server complexity now. REST +1.", threadTs: "M_E50", minute: 739 },
  { id: "M_E54", channelId: "C_ENGINEERING", userId: "U_DAVE", text: "Sold. REST it is, I'll write it up as ADR-0014 so we stop relitigating this every quarter 😄", threadTs: "M_E50", minute: 742 },

  // ---- #incidents: deeper SEV2 debugging back-and-forth (8 replies) ----
  { id: "M_I15", channelId: "C_INCIDENTS", userId: "U_MALLORY", text: "🚨 Bumping to SEV2: a wave of customers reporting they were double-charged on checkout. ~20 tickets in 15 min and climbing.", minute: 745 },
  { id: "M_I16", channelId: "C_INCIDENTS", userId: "U_RADEK", text: "I'll IC. <@U_CAROL> pricing/payments is you — can you look at the charge path?", threadTs: "M_I15", minute: 747 },
  { id: "M_I17", channelId: "C_INCIDENTS", userId: "U_CAROL", text: "Looking. Payment intents are being created twice for some sessions. Smells like a client retry hitting a non-idempotent endpoint.", threadTs: "M_I15", minute: 750 },
  { id: "M_I18", channelId: "C_INCIDENTS", userId: "U_OSCAR", text: "Mobile added an auto-retry on network timeout last release. If the charge endpoint isn't idempotent, that'd do it. 😬", threadTs: "M_I15", minute: 753 },
  { id: "M_I19", channelId: "C_INCIDENTS", userId: "U_CAROL", text: "That's it. The charge endpoint takes no idempotency key. Mobile retry → second intent → second charge.", threadTs: "M_I15", minute: 756 },
  { id: "M_I20", channelId: "C_INCIDENTS", userId: "U_RADEK", text: "Stop the bleeding first: <@U_OSCAR> can you feature-flag off the auto-retry remotely without an app release?", threadTs: "M_I15", minute: 759 },
  { id: "M_I21", channelId: "C_INCIDENTS", userId: "U_OSCAR", text: "Yes — it's behind a remote config. Killing it now. Done, retries disabled for all clients.", threadTs: "M_I15", minute: 762 },
  { id: "M_I22", channelId: "C_INCIDENTS", userId: "U_CAROL", text: "Bleeding stopped. Real fix is an idempotency key on the charge endpoint — PR in progress. <@U_MALLORY> can you pull the list of affected customers for refunds?", threadTs: "M_I15", minute: 765 },
  { id: "M_I23", channelId: "C_INCIDENTS", userId: "U_MALLORY", text: "Already querying. ~34 customers double-charged, total €2,180. I'll auto-refund the duplicates and send an apology + credit.", threadTs: "M_I15", minute: 768 },
  { id: "M_I24", channelId: "C_INCIDENTS", userId: "U_LENKA", text: "Approve the goodwill credits up to €25/customer without asking. Anything bigger, ping me.", threadTs: "M_I15", minute: 771 },
  { id: "M_I25", channelId: "C_INCIDENTS", userId: "U_RADEK", text: "Resolved. Idempotency-key PR merged + backfill refunds running. Postmortem Thursday — action item: idempotency audit on all money-moving endpoints. Thanks all. 🙏", threadTs: "M_I15", minute: 775 },

  // ---- #product: Grace multi-hop again (Klara → Grace → Heidi → Jonas → Carol) ----
  { id: "M_P19", channelId: "C_PRODUCT", userId: "U_KLARA", text: "I want to ship a 'recommended delivery slot' nudge. Do we have the data to power it?", minute: 780 },
  { id: "M_P20", channelId: "C_PRODUCT", userId: "U_GRACE", text: "Data feasibility is <@U_HEIDI>'s call — Heidi, do we have the slot-demand signal at the granularity Klara needs?", threadTs: "M_P19", minute: 783 },
  { id: "M_P21", channelId: "C_PRODUCT", userId: "U_HEIDI", text: "We have aggregate demand, not per-user. <@U_JONAS> built the slot model — Jonas, can it personalize or is it global only?", threadTs: "M_P19", minute: 786 },
  { id: "M_P22", channelId: "C_PRODUCT", userId: "U_JONAS", text: "Model's global today. To personalize I'd need per-user history exposed in the serving layer, and that's an eng change — <@U_CAROL>?", threadTs: "M_P19", minute: 789 },
  { id: "M_P23", channelId: "C_PRODUCT", userId: "U_CAROL", text: "Doable — I can expose a per-user features endpoint, maybe 3 days. But let's ship the global nudge first <@U_KLARA> and personalize in v2. Faster signal.", threadTs: "M_P19", minute: 792 },
  { id: "M_P24", channelId: "C_PRODUCT", userId: "U_KLARA", text: "Global v1, personalized v2 — perfect, that's shippable this sprint. Thanks for walking it down the chain everyone 🙏", threadTs: "M_P19", minute: 795 },
  // Pavel answers directly (non-routing)
  { id: "M_P25", channelId: "C_PRODUCT", userId: "U_MILA", text: "Quick one — should the slot nudge be a banner or an inline highlight on the slot itself?", minute: 798 },
  { id: "M_P26", channelId: "C_PRODUCT", userId: "U_PAVEL", text: "Inline highlight. Banners get banner-blindness and we already have one for promos. Highlight the recommended slot with a subtle badge.", threadTs: "M_P25", minute: 801 },

  // ---- #hiring: a real hiring debrief thread (6 replies) ----
  { id: "M_H08", channelId: "C_HIRING", userId: "U_PETRA", text: "Debrief time — Senior Backend, Candidate B onsite is done. Going around: thumbs up/down + one line. I'll start: strong yes on values + ownership.", minute: 805 },
  { id: "M_H09", channelId: "C_HIRING", userId: "U_CAROL", text: "System design: strong yes. Reasoned about idempotency and backpressure unprompted — exactly what we just got burned on. Senior-level.", threadTs: "M_H08", minute: 808 },
  { id: "M_H10", channelId: "C_HIRING", userId: "U_BOB", text: "Coding round: yes, with a note. Clean code, but went quiet when stuck instead of thinking out loud. Coachable, not a blocker.", threadTs: "M_H08", minute: 811 },
  { id: "M_H11", channelId: "C_HIRING", userId: "U_GRACE", text: "Product collaboration round: yes. Asked about users before jumping to solutions. Rare for a backend hire.", threadTs: "M_H08", minute: 814 },
  { id: "M_H12", channelId: "C_HIRING", userId: "U_LUKAS", text: "References came back clean, both former leads would rehire. No red flags.", threadTs: "M_H08", minute: 817 },
  { id: "M_H13", channelId: "C_HIRING", userId: "U_ALICE", text: "Unanimous yes then. <@U_PETRA> make the offer at the top of band — we lose good seniors to slow offers. Move fast.", threadTs: "M_H08", minute: 820 },
  { id: "M_H14", channelId: "C_HIRING", userId: "U_PETRA", text: "On it — offer goes out today, will report back. 🤞", threadTs: "M_H08", minute: 823 },

  // ---- #leadership: a meatier strategy thread ----
  { id: "M_L07", channelId: "C_LEADERSHIP", userId: "U_VIKTOR", text: "Sales context for planning: two enterprise deals are gating on multi-warehouse + an SLA guarantee. ~€600k combined ARR if we can commit.", minute: 826 },
  { id: "M_L08", channelId: "C_LEADERSHIP", userId: "U_GRACE", text: "Multi-warehouse is buildable this quarter if we deprioritize the referral program. <@U_BOB> agree on the trade?", threadTs: "M_L07", minute: 829 },
  { id: "M_L09", channelId: "C_LEADERSHIP", userId: "U_BOB", text: "Agree. Referral is nice-to-have; €600k is not. I'll repoint Nora + the new hire at multi-warehouse once the offer's signed.", threadTs: "M_L07", minute: 832 },
  { id: "M_L10", channelId: "C_LEADERSHIP", userId: "U_FRANK", text: "Ops caveat: multi-warehouse routing needs the new depot live first, or we can't actually fulfill it. That's a 6-week lead time.", threadTs: "M_L07", minute: 835 },
  { id: "M_L11", channelId: "C_LEADERSHIP", userId: "U_LENKA", text: "So the real critical path is the depot, not the code. <@U_FRANK> can you compress the 6 weeks if we throw budget at it?", threadTs: "M_L07", minute: 838 },
  { id: "M_L12", channelId: "C_LEADERSHIP", userId: "U_FRANK", text: "Maybe 4 weeks with a rush fit-out, +€40k. Worth it against €600k ARR.", threadTs: "M_L07", minute: 841 },
  { id: "M_L13", channelId: "C_LEADERSHIP", userId: "U_ALICE", text: "Do it. Depot rush + multi-warehouse build in parallel, referral parked. <@U_VIKTOR> tell the customers Q3, conservatively.", threadTs: "M_L07", minute: 844 },

  // ---- DM D_ALICE_GRACE: real back-and-forth with routing ----
  { id: "M_DM_AG3", channelId: "D_ALICE_GRACE", userId: "U_ALICE", text: "Separately — the board asked who'd own multi-warehouse if it's our Q3 bet. Is that you or Pavel?", minute: 847 },
  { id: "M_DM_AG4", channelId: "D_ALICE_GRACE", userId: "U_GRACE", text: "Pavel owns the spec, but for the cross-functional ops+eng coordination you actually want <@U_FRANK> as the driver. He's the bottleneck and the unblocker.", threadTs: "M_DM_AG1", minute: 850 },
  { id: "M_DM_AG5", channelId: "D_ALICE_GRACE", userId: "U_ALICE", text: "Makes sense. I'll name Frank as DRI and Pavel as product lead in the deck.", minute: 853 },
  { id: "M_DM_AG6", channelId: "D_ALICE_GRACE", userId: "U_GRACE", text: "👍 and loop me only on the product decisions, don't make me the routing hub for ops 😄", threadTs: "M_DM_AG1", minute: 856 },

  // ---- DM D_IVAN_BOB: junior asking the router "who do I ask about X" ----
  { id: "M_DM_IB5", channelId: "D_IVAN_BOB", userId: "U_IVAN", text: "Last DM I promise — who actually decides our tech-stack choices? Feels like it's all tribal knowledge.", minute: 859 },
  { id: "M_DM_IB6", channelId: "D_IVAN_BOB", userId: "U_BOB", text: "Fair. Architecture decisions = ADRs, and <@U_CAROL> is the de-facto owner of those. Infra/platform calls are <@U_RADEK>. I just ratify.", threadTs: "M_DM_IB1", minute: 862 },
  { id: "M_DM_IB7", channelId: "D_IVAN_BOB", userId: "U_IVAN", text: "So basically you route me to Carol or Radek for almost everything 😅", threadTs: "M_DM_IB1", minute: 865 },
  { id: "M_DM_IB8", channelId: "D_IVAN_BOB", userId: "U_BOB", text: "Ha. That's literally my job description. Knowing who, not knowing everything. You'll do the same in a year.", threadTs: "M_DM_IB1", minute: 868 },

  // ---- DM D_JUDY_FRANK: ongoing, with a routing handoff ----
  { id: "M_DM_JF5", channelId: "D_JUDY_FRANK", userId: "U_JUDY", text: "New one — Krayton wants a custom SLA in the contract. Who signs off on committing to specific uptime numbers?", minute: 871 },
  { id: "M_DM_JF6", channelId: "D_JUDY_FRANK", userId: "U_FRANK", text: "Two people: <@U_RADEK> confirms what uptime we can actually hit, then <@U_TOMAS> signs the contractual commitment. Don't promise a number before Radek blesses it.", threadTs: "M_DM_JF1", minute: 874 },
  { id: "M_DM_JF7", channelId: "D_JUDY_FRANK", userId: "U_JUDY", text: "Got it. You're basically the org's search engine for 'who do I ask' 😂", threadTs: "M_DM_JF1", minute: 877 },
  { id: "M_DM_JF8", channelId: "D_JUDY_FRANK", userId: "U_FRANK", text: "If I had a koruna for every time someone said that 💸", threadTs: "M_DM_JF1", minute: 880 },

  // ---- New DM D_ALICE_BOB continuation: viewer-facing real convo ----
  { id: "M_DM_AB7", channelId: "D_ALICE_BOB", userId: "U_ALICE", text: "If we park referral and add the new senior hire, are you genuinely confident on multi-warehouse for Q3?", minute: 883 },
  { id: "M_DM_AB8", channelId: "D_ALICE_BOB", userId: "U_BOB", text: "On the code, yes. My only real worry is the depot timeline — that's <@U_FRANK>'s critical path, not mine. If he hits 4 weeks, we ship.", threadTs: "M_DM_AB1", minute: 886 },
  { id: "M_DM_AB9", channelId: "D_ALICE_BOB", userId: "U_ALICE", text: "He's committed to 4 with the rush budget. So eng is the safe part?", threadTs: "M_DM_AB1", minute: 889 },
  { id: "M_DM_AB10", channelId: "D_ALICE_BOB", userId: "U_BOB", text: "Eng is the safe part. Write it down so you can hold me to it 😄", threadTs: "M_DM_AB1", minute: 892 },

  // ---- Group DM G_ALICE_HEADS: board-prep follow-up with routing ----
  { id: "M_GA7", channelId: "G_ALICE_HEADS", userId: "U_ALICE", text: "Board follow-up: they want a single owner named for the multi-warehouse bet. I'm putting <@U_FRANK> as DRI. Objections?", minute: 895 },
  { id: "M_GA8", channelId: "G_ALICE_HEADS", userId: "U_BOB", text: "None. Frank's the right call since the depot's the bottleneck. I'll own the eng deliverable under him.", threadTs: "M_GA1", minute: 898 },
  { id: "M_GA9", channelId: "G_ALICE_HEADS", userId: "U_GRACE", text: "Agreed, with Pavel as product lead. I'll stay out of the day-to-day routing.", threadTs: "M_GA1", minute: 901 },
  { id: "M_GA10", channelId: "G_ALICE_HEADS", userId: "U_FRANK", text: "Accepted. I'll run a weekly multi-warehouse sync — eng, ops, product, sales each send one person. <@U_VIKTOR> who's your rep?", threadTs: "M_GA1", minute: 904 },
  { id: "M_GA11", channelId: "G_ALICE_HEADS", userId: "U_VIKTOR", text: "Me, until it's live. I want eyes on it given the €600k riding on it.", threadTs: "M_GA1", minute: 907 },

  // ---- Group DM G_SUPPORT_ESC: deeper escalation with multi-hop ----
  { id: "M_GS5", channelId: "G_SUPPORT_ESC", userId: "U_TEREZA", text: "New escalation: enterprise customer says our API rate limits are too aggressive and breaking their integration.", minute: 910 },
  { id: "M_GS6", channelId: "G_SUPPORT_ESC", userId: "U_MALLORY", text: "That's a platform decision, out of support's hands. <@U_FRANK> who owns API rate-limit policy?", threadTs: "M_GS1", minute: 913 },
  { id: "M_GS7", channelId: "G_SUPPORT_ESC", userId: "U_FRANK", text: "Rate limits are set in the gateway — that's <@U_RADEK>. But raising a customer's limit is also a commercial call, so <@U_GRACE> should weigh in on whether we tier it.", threadTs: "M_GS1", minute: 916 },
  { id: "M_GS8", channelId: "G_SUPPORT_ESC", userId: "U_GRACE", text: "Let's make rate limits a plan tier rather than a per-customer hack. <@U_RADEK> what's safe to offer on an 'enterprise' tier without risking the platform?", threadTs: "M_GS1", minute: 919 },
  { id: "M_GS9", channelId: "G_SUPPORT_ESC", userId: "U_RADEK", text: "Enterprise tier at 10x the default is safe — we have headroom. I'll add the tier config today. <@U_TEREZA> tell the customer it's coming this week.", threadTs: "M_GS1", minute: 922 },
  { id: "M_GS10", channelId: "G_SUPPORT_ESC", userId: "U_TEREZA", text: "Relayed, customer's happy to wait. Crisis averted 🙏", threadTs: "M_GS1", minute: 925 },

  // ---- Group DM G_RELEASE: deeper release back-and-forth ----
  { id: "M_GR8", channelId: "G_RELEASE", userId: "U_RADEK", text: "Pre-release check for the idempotency fix + tier config — any concerns before I cut it?", minute: 928 },
  { id: "M_GR9", channelId: "G_RELEASE", userId: "U_CAROL", text: "Idempotency migration is backward-compatible, tested the double-submit case on staging. Green from me.", threadTs: "M_GR1", minute: 931 },
  { id: "M_GR10", channelId: "G_RELEASE", userId: "U_DAVE", text: "Frontend has no changes in this one. No-op for web.", threadTs: "M_GR1", minute: 934 },
  { id: "M_GR11", channelId: "G_RELEASE", userId: "U_BOB", text: "Ship it. <@U_RADEK> you're IC again. Same drill — only ping me for a rollback call.", threadTs: "M_GR1", minute: 937 },
  { id: "M_GR12", channelId: "G_RELEASE", userId: "U_RADEK", text: "Deployed, monitored 30 min, zero double-charges, rate-limit tier live. Clean release 🎉", threadTs: "M_GR1", minute: 941 },

  // ---- #general & #watercooler: more life ----
  { id: "M_G12", channelId: "C_GENERAL", userId: "U_ALICE", text: "We hit 97.4% on-time last month and just closed two more deals. Proud of this team. 🙌 Details at the all-hands.", minute: 944 },
  { id: "M_G13", channelId: "C_GENERAL", userId: "U_PETRA", text: "Back from PTO 🌴 thanks <@U_LUKAS> for holding it down. People/Office requests can come straight to me again.", minute: 947 },
  { id: "M_G14", channelId: "C_GENERAL", userId: "U_LUKAS", text: "Welcome back! The printer survived. Mostly.", threadTs: "M_G13", minute: 949 },

  { id: "M_W15", channelId: "C_WATERCOOLER", userId: "U_OSCAR", text: "Two production incidents this week and it's only Wednesday. The plant 'Deploy' is thriving though 🪴", minute: 952 },
  { id: "M_W16", channelId: "C_WATERCOOLER", userId: "U_CAROL", text: "Deploy outlives us all 😌", threadTs: "M_W15", minute: 954 },
  { id: "M_W17", channelId: "C_WATERCOOLER", userId: "U_RADEK", text: "I have started talking to Deploy. It does not route my questions elsewhere, unlike <@U_FRANK>.", threadTs: "M_W15", minute: 957 },
  { id: "M_W18", channelId: "C_WATERCOOLER", userId: "U_FRANK", text: "Deploy doesn't know who owns the pricing service either. We're the same.", threadTs: "M_W15", minute: 960 },
  { id: "M_W19", channelId: "C_WATERCOOLER", userId: "U_IVAN", text: "😂😂 I've asked Frank 'who do I ask' more times than I've asked Google this month", threadTs: "M_W15", minute: 963 },];

export const reactions: FixtureReaction[] = [
  // M_G01 welcome (general — everyone)
  { messageId: "M_G01", userId: "U_BOB", emoji: "🎉" },
  { messageId: "M_G01", userId: "U_GRACE", emoji: "🎉" },
  { messageId: "M_G01", userId: "U_FRANK", emoji: "👋" },
  { messageId: "M_G01", userId: "U_CAROL", emoji: "👋" },
  { messageId: "M_G01", userId: "U_EVE", emoji: "🎉" },
  { messageId: "M_G01", userId: "U_NORA", emoji: "👋" },
  { messageId: "M_G01", userId: "U_HEIDI", emoji: "🎉" },
  { messageId: "M_G01", userId: "U_MALLORY", emoji: "👋" },
  { messageId: "M_G04", userId: "U_GRACE", emoji: "🙌" },
  { messageId: "M_G04", userId: "U_NORA", emoji: "🙌" },

  // M_E17 Ivan unblocked / thanks
  { messageId: "M_E16", userId: "U_IVAN", emoji: "🙏" },
  { messageId: "M_E16", userId: "U_DAVE", emoji: "👍" },
  { messageId: "M_E11", userId: "U_JONAS", emoji: "🙏" },
  { messageId: "M_E11", userId: "U_HEIDI", emoji: "👍" },
  { messageId: "M_E14", userId: "U_GRACE", emoji: "👍" },
  { messageId: "M_E14", userId: "U_BOB", emoji: "👍" },
  { messageId: "M_E18", userId: "U_DAVE", emoji: "👀" },
  { messageId: "M_E18", userId: "U_NORA", emoji: "👍" },
  { messageId: "M_E18", userId: "U_RADEK", emoji: "👍" },

  // Incident thread — big reactions
  { messageId: "M_I01", userId: "U_BOB", emoji: "👀" },
  { messageId: "M_I01", userId: "U_CAROL", emoji: "👀" },
  { messageId: "M_I01", userId: "U_FRANK", emoji: "👀" },
  { messageId: "M_I04", userId: "U_RADEK", emoji: "🔥" },
  { messageId: "M_I04", userId: "U_BOB", emoji: "😬" },
  { messageId: "M_I07", userId: "U_RADEK", emoji: "🎉" },
  { messageId: "M_I07", userId: "U_BOB", emoji: "🎉" },
  { messageId: "M_I07", userId: "U_MALLORY", emoji: "🙏" },
  { messageId: "M_I07", userId: "U_ALICE", emoji: "🙌" },
  { messageId: "M_I07", userId: "U_GRACE", emoji: "🔥" },
  { messageId: "M_I09", userId: "U_CAROL", emoji: "🙏" },
  { messageId: "M_I09", userId: "U_BOB", emoji: "👍" },
  { messageId: "M_I09", userId: "U_DAVE", emoji: "👍" },
  { messageId: "M_I10", userId: "U_RADEK", emoji: "🙏" },

  // Announcements — Series A
  { messageId: "M_A01", userId: "U_BOB", emoji: "🎉" },
  { messageId: "M_A01", userId: "U_CAROL", emoji: "🎉" },
  { messageId: "M_A01", userId: "U_DAVE", emoji: "🎉" },
  { messageId: "M_A01", userId: "U_EVE", emoji: "🎉" },
  { messageId: "M_A01", userId: "U_FRANK", emoji: "🚀" },
  { messageId: "M_A01", userId: "U_GRACE", emoji: "🚀" },
  { messageId: "M_A01", userId: "U_HEIDI", emoji: "🎉" },
  { messageId: "M_A01", userId: "U_JUDY", emoji: "🔥" },
  { messageId: "M_A01", userId: "U_VIKTOR", emoji: "🔥" },
  { messageId: "M_A01", userId: "U_MALLORY", emoji: "🎉" },
  { messageId: "M_A01", userId: "U_OTTO", emoji: "🚀" },
  { messageId: "M_A01", userId: "U_NORA", emoji: "🎉" },
  { messageId: "M_A01", userId: "U_IVAN", emoji: "🎉" },
  { messageId: "M_A01", userId: "U_PETRA", emoji: "🙌" },
  { messageId: "M_A03", userId: "U_CAROL", emoji: "👍" },
  { messageId: "M_A03", userId: "U_DAVE", emoji: "👍" },
  { messageId: "M_A03", userId: "U_RADEK", emoji: "👀" },
  { messageId: "M_A03", userId: "U_NORA", emoji: "👍" },

  // Design
  { messageId: "M_D02", userId: "U_DAVE", emoji: "🙏" },
  { messageId: "M_D02", userId: "U_MILA", emoji: "✅" },
  { messageId: "M_D03", userId: "U_DAVE", emoji: "👍" },
  { messageId: "M_DM_DE2", userId: "U_DAVE", emoji: "✅" },
  { messageId: "M_D05", userId: "U_GRACE", emoji: "👍" },

  // Frontend
  { messageId: "M_F02", userId: "U_DAVE", emoji: "🙏" },
  { messageId: "M_F03", userId: "U_OSCAR", emoji: "🎉" },
  { messageId: "M_F06", userId: "U_IVAN", emoji: "🙏" },

  // Data
  { messageId: "M_DT01", userId: "U_HEIDI", emoji: "👀" },
  { messageId: "M_DT01", userId: "U_GRACE", emoji: "👀" },
  { messageId: "M_DT01", userId: "U_KLARA", emoji: "🔥" },
  { messageId: "M_DT05", userId: "U_GRACE", emoji: "😮" },
  { messageId: "M_DT05", userId: "U_HEIDI", emoji: "👍" },
  { messageId: "M_DT05", userId: "U_KLARA", emoji: "🔥" },

  // Sales wins
  { messageId: "M_S05", userId: "U_VIKTOR", emoji: "🎉" },
  { messageId: "M_S05", userId: "U_NINA", emoji: "🔥" },
  { messageId: "M_S05", userId: "U_MALLORY", emoji: "🎉" },
  { messageId: "M_S05", userId: "U_GRACE", emoji: "🙌" },
  { messageId: "M_S05", userId: "U_LENKA", emoji: "💰" },
  { messageId: "M_S04", userId: "U_NINA", emoji: "🙏" },
  { messageId: "M_S04", userId: "U_VIKTOR", emoji: "👍" },

  // Support
  { messageId: "M_SU03", userId: "U_TEREZA", emoji: "🙏" },
  { messageId: "M_SU03", userId: "U_MALLORY", emoji: "👍" },
  { messageId: "M_SU04", userId: "U_MALLORY", emoji: "👍" },

  // Watercooler — laughs
  { messageId: "M_W01", userId: "U_SARA", emoji: "😂" },
  { messageId: "M_W01", userId: "U_FRANK", emoji: "😂" },
  { messageId: "M_W01", userId: "U_IVAN", emoji: "😂" },
  { messageId: "M_W01", userId: "U_BARA", emoji: "🤢" },
  { messageId: "M_W03", userId: "U_SARA", emoji: "😂" },
  { messageId: "M_W03", userId: "U_DENIS", emoji: "😂" },
  { messageId: "M_W04", userId: "U_IVAN", emoji: "☕" },
  { messageId: "M_W04", userId: "U_JONAS", emoji: "🎉" },
  { messageId: "M_W04", userId: "U_NORA", emoji: "🙏" },
  { messageId: "M_W05", userId: "U_NORA", emoji: "🎉" },
  { messageId: "M_W05", userId: "U_CAROL", emoji: "🚀" },
  { messageId: "M_W05", userId: "U_DAVE", emoji: "🎉" },
  { messageId: "M_W05", userId: "U_OSCAR", emoji: "🙌" },
  { messageId: "M_W07", userId: "U_MILA", emoji: "🌯" },
  { messageId: "M_W07", userId: "U_JONAS", emoji: "🍜" },

  // Leadership / private
  { messageId: "M_L06", userId: "U_BOB", emoji: "👍" },
  { messageId: "M_L06", userId: "U_GRACE", emoji: "👍" },
  { messageId: "M_L06", userId: "U_FRANK", emoji: "👍" },
  { messageId: "M_L06", userId: "U_LENKA", emoji: "👍" },
  { messageId: "M_L06", userId: "U_PETRA", emoji: "🙌" },

  // Product
  { messageId: "M_P09", userId: "U_GRACE", emoji: "👍" },
  { messageId: "M_P09", userId: "U_PAVEL", emoji: "👍" },
  { messageId: "M_P10", userId: "U_PAVEL", emoji: "🎨" },
  { messageId: "M_P10", userId: "U_GRACE", emoji: "👀" },

  // Group DMs
  { messageId: "M_GR5", userId: "U_RADEK", emoji: "👍" },
  { messageId: "M_GR4", userId: "U_BOB", emoji: "👍" },
  { messageId: "M_GA5", userId: "U_ALICE", emoji: "🔥" },
  { messageId: "M_GA4", userId: "U_ALICE", emoji: "🙏" },
  { messageId: "M_GD3", userId: "U_PAVEL", emoji: "✅" },
  { messageId: "M_GD3", userId: "U_GRACE", emoji: "🎉" },
  { messageId: "M_GS3", userId: "U_MALLORY", emoji: "🙏" },
  { messageId: "M_GS3", userId: "U_TEREZA", emoji: "🙏" },

  // DMs with Alice (viewer)
  { messageId: "M_DM_AG2", userId: "U_ALICE", emoji: "🙏" },
  { messageId: "M_DM_PA2", userId: "U_PETRA", emoji: "🌴" },

  // ---- WAVE 2 reactions ----
  { messageId: "M_E24", userId: "U_RADEK", emoji: "✅" },
  { messageId: "M_E24", userId: "U_BOB", emoji: "👍" },
  { messageId: "M_E29", userId: "U_DAVE", emoji: "👍" },
  { messageId: "M_E29", userId: "U_GRACE", emoji: "🙏" },
  { messageId: "M_E31", userId: "U_CAROL", emoji: "👍" },
  { messageId: "M_E31", userId: "U_RADEK", emoji: "👍" },
  { messageId: "M_E34", userId: "U_IVAN", emoji: "🙏" },

  { messageId: "M_B07", userId: "U_NORA", emoji: "🙏" },
  { messageId: "M_B11", userId: "U_CAROL", emoji: "🔥" },
  { messageId: "M_B11", userId: "U_RADEK", emoji: "🔥" },
  { messageId: "M_B11", userId: "U_BOB", emoji: "👀" },
  { messageId: "M_B12", userId: "U_NORA", emoji: "🎉" },

  { messageId: "M_F09", userId: "U_DAVE", emoji: "👍" },
  { messageId: "M_F11", userId: "U_IVAN", emoji: "🙏" },

  { messageId: "M_D09", userId: "U_GRACE", emoji: "👀" },
  { messageId: "M_D10", userId: "U_EVE", emoji: "💜" },
  { messageId: "M_D10", userId: "U_MILA", emoji: "💜" },
  { messageId: "M_D10", userId: "U_GRACE", emoji: "👍" },

  { messageId: "M_DT08", userId: "U_HEIDI", emoji: "👍" },
  { messageId: "M_DT10", userId: "U_KLARA", emoji: "🙏" },

  { messageId: "M_O21", userId: "U_IVAN", emoji: "🙏" },
  { messageId: "M_O25", userId: "U_TEREZA", emoji: "😂" },
  { messageId: "M_O25", userId: "U_SARA", emoji: "😂" },
  { messageId: "M_O26", userId: "U_FRANK", emoji: "👍" },
  { messageId: "M_O26", userId: "U_DENIS", emoji: "👍" },

  { messageId: "M_P16", userId: "U_KLARA", emoji: "🙌" },
  { messageId: "M_P16", userId: "U_GRACE", emoji: "🎉" },
  { messageId: "M_P16", userId: "U_PAVEL", emoji: "👍" },

  { messageId: "M_S12", userId: "U_JUDY", emoji: "🙏" },
  { messageId: "M_S12", userId: "U_VIKTOR", emoji: "👍" },

  { messageId: "M_SU09", userId: "U_TEREZA", emoji: "🙏" },
  { messageId: "M_SU09", userId: "U_MALLORY", emoji: "👍" },

  { messageId: "M_MK06", userId: "U_OTTO", emoji: "🎉" },
  { messageId: "M_MK06", userId: "U_BARA", emoji: "🙌" },
  { messageId: "M_MK04", userId: "U_OTTO", emoji: "👀" },

  { messageId: "M_G07", userId: "U_FRANK", emoji: "👍" },
  { messageId: "M_G07", userId: "U_GRACE", emoji: "👍" },
  { messageId: "M_G09", userId: "U_JONAS", emoji: "🚗" },
  { messageId: "M_G09", userId: "U_NINA", emoji: "🙋" },

  { messageId: "M_W10", userId: "U_RADEK", emoji: "🍺" },
  { messageId: "M_W10", userId: "U_BOB", emoji: "🍺" },
  { messageId: "M_W10", userId: "U_NORA", emoji: "🍺" },
  { messageId: "M_W10", userId: "U_DAVE", emoji: "🙌" },
  { messageId: "M_W12", userId: "U_MILA", emoji: "🪴" },
  { messageId: "M_W12", userId: "U_IVAN", emoji: "😂" },
  { messageId: "M_W14", userId: "U_MILA", emoji: "🌯" },
  { messageId: "M_W14", userId: "U_JONAS", emoji: "👍" },
  { messageId: "M_W14", userId: "U_BARA", emoji: "🎉" },

  { messageId: "M_GR6", userId: "U_RADEK", emoji: "👍" },
  { messageId: "M_GR7", userId: "U_BOB", emoji: "🙏" },
  { messageId: "M_GO6", userId: "U_FRANK", emoji: "🎉" },
  { messageId: "M_GA6", userId: "U_BOB", emoji: "🙏" },
  { messageId: "M_GA6", userId: "U_GRACE", emoji: "👍" },
  { messageId: "M_GA6", userId: "U_VIKTOR", emoji: "👍" },
  { messageId: "M_GA6", userId: "U_FRANK", emoji: "👍" },

  // ---- WAVE 3 reactions ----
  { messageId: "M_E37", userId: "U_IVAN", emoji: "🙏" },
  { messageId: "M_E39", userId: "U_DAVE", emoji: "🙌" },
  { messageId: "M_E41", userId: "U_BOB", emoji: "👍" },
  { messageId: "M_E41", userId: "U_OSCAR", emoji: "👍" },
  { messageId: "M_I13", userId: "U_BOB", emoji: "🙏" },
  { messageId: "M_I13", userId: "U_RADEK", emoji: "👍" },
  { messageId: "M_O30", userId: "U_IVAN", emoji: "🙏" },
  { messageId: "M_H07", userId: "U_EVE", emoji: "👍" },
  { messageId: "M_D12", userId: "U_DAVE", emoji: "🙏" },
  { messageId: "M_DM_IC4", userId: "U_IVAN", emoji: "🎉" },

  // ---- WAVE 4 reactions ----
  // #ops 4-hop relay — people appreciating the chain finally resolving
  { messageId: "M_O37", userId: "U_IVAN", emoji: "🙏" },
  { messageId: "M_O37", userId: "U_CAROL", emoji: "👍" },
  { messageId: "M_O37", userId: "U_FRANK", emoji: "✅" },
  { messageId: "M_O38", userId: "U_FRANK", emoji: "😂" },
  { messageId: "M_O38", userId: "U_CAROL", emoji: "😂" },
  { messageId: "M_O38", userId: "U_RADEK", emoji: "🙌" },
  { messageId: "M_O42", userId: "U_NINA", emoji: "🙏" },
  { messageId: "M_O42", userId: "U_RADEK", emoji: "👍" },
  { messageId: "M_O44", userId: "U_TEREZA", emoji: "🙏" },

  // #engineering push-notif debug + REST/GraphQL RFC
  { messageId: "M_E47", userId: "U_RADEK", emoji: "🔥" },
  { messageId: "M_E47", userId: "U_OSCAR", emoji: "😮" },
  { messageId: "M_E47", userId: "U_BOB", emoji: "👀" },
  { messageId: "M_E49", userId: "U_NORA", emoji: "😮‍💨" },
  { messageId: "M_E49", userId: "U_RADEK", emoji: "😮‍💨" },
  { messageId: "M_E49", userId: "U_BOB", emoji: "🙏" },
  { messageId: "M_E51", userId: "U_NORA", emoji: "💯" },
  { messageId: "M_E51", userId: "U_DAVE", emoji: "👍" },
  { messageId: "M_E51", userId: "U_OSCAR", emoji: "👍" },
  { messageId: "M_E54", userId: "U_CAROL", emoji: "😂" },
  { messageId: "M_E54", userId: "U_NORA", emoji: "🎉" },
  { messageId: "M_E54", userId: "U_BOB", emoji: "👍" },

  // #incidents double-charge SEV2 — heavy reactions
  { messageId: "M_I15", userId: "U_RADEK", emoji: "👀" },
  { messageId: "M_I15", userId: "U_CAROL", emoji: "👀" },
  { messageId: "M_I15", userId: "U_BOB", emoji: "😬" },
  { messageId: "M_I18", userId: "U_CAROL", emoji: "😬" },
  { messageId: "M_I18", userId: "U_RADEK", emoji: "👀" },
  { messageId: "M_I19", userId: "U_RADEK", emoji: "🎯" },
  { messageId: "M_I19", userId: "U_OSCAR", emoji: "😬" },
  { messageId: "M_I21", userId: "U_CAROL", emoji: "🙏" },
  { messageId: "M_I21", userId: "U_RADEK", emoji: "🙌" },
  { messageId: "M_I23", userId: "U_RADEK", emoji: "🙏" },
  { messageId: "M_I23", userId: "U_LENKA", emoji: "👍" },
  { messageId: "M_I23", userId: "U_ALICE", emoji: "🙏" },
  { messageId: "M_I25", userId: "U_CAROL", emoji: "🙏" },
  { messageId: "M_I25", userId: "U_BOB", emoji: "🙏" },
  { messageId: "M_I25", userId: "U_MALLORY", emoji: "🙌" },
  { messageId: "M_I25", userId: "U_OSCAR", emoji: "🙏" },
  { messageId: "M_I25", userId: "U_ALICE", emoji: "🙌" },

  // #product chain-walk
  { messageId: "M_P23", userId: "U_KLARA", emoji: "🙏" },
  { messageId: "M_P23", userId: "U_HEIDI", emoji: "👍" },
  { messageId: "M_P23", userId: "U_GRACE", emoji: "👍" },
  { messageId: "M_P24", userId: "U_GRACE", emoji: "🙌" },
  { messageId: "M_P24", userId: "U_CAROL", emoji: "🎉" },
  { messageId: "M_P24", userId: "U_JONAS", emoji: "🙏" },
  { messageId: "M_P26", userId: "U_MILA", emoji: "👍" },

  // #hiring debrief — strong unanimous
  { messageId: "M_H09", userId: "U_BOB", emoji: "💯" },
  { messageId: "M_H09", userId: "U_PETRA", emoji: "🙌" },
  { messageId: "M_H13", userId: "U_PETRA", emoji: "👍" },
  { messageId: "M_H13", userId: "U_BOB", emoji: "💯" },
  { messageId: "M_H13", userId: "U_CAROL", emoji: "🙌" },
  { messageId: "M_H13", userId: "U_GRACE", emoji: "🎉" },
  { messageId: "M_H14", userId: "U_ALICE", emoji: "🤞" },
  { messageId: "M_H14", userId: "U_BOB", emoji: "🤞" },

  // #leadership strategy
  { messageId: "M_L12", userId: "U_ALICE", emoji: "👀" },
  { messageId: "M_L12", userId: "U_LENKA", emoji: "👍" },
  { messageId: "M_L13", userId: "U_VIKTOR", emoji: "🔥" },
  { messageId: "M_L13", userId: "U_GRACE", emoji: "👍" },
  { messageId: "M_L13", userId: "U_BOB", emoji: "👍" },
  { messageId: "M_L13", userId: "U_FRANK", emoji: "💪" },

  // DMs (incl. Alice the viewer)
  { messageId: "M_DM_AB10", userId: "U_ALICE", emoji: "😄" },
  { messageId: "M_DM_AG6", userId: "U_ALICE", emoji: "😂" },
  { messageId: "M_DM_IB8", userId: "U_IVAN", emoji: "🙏" },
  { messageId: "M_DM_JF7", userId: "U_FRANK", emoji: "😂" },
  { messageId: "M_DM_JF8", userId: "U_JUDY", emoji: "💸" },

  // Group DMs
  { messageId: "M_GA10", userId: "U_VIKTOR", emoji: "👍" },
  { messageId: "M_GA10", userId: "U_BOB", emoji: "👍" },
  { messageId: "M_GS9", userId: "U_TEREZA", emoji: "🙏" },
  { messageId: "M_GS9", userId: "U_GRACE", emoji: "👍" },
  { messageId: "M_GS9", userId: "U_MALLORY", emoji: "🙌" },
  { messageId: "M_GR12", userId: "U_BOB", emoji: "🎉" },
  { messageId: "M_GR12", userId: "U_CAROL", emoji: "🙌" },
  { messageId: "M_GR12", userId: "U_DAVE", emoji: "🎉" },

  // #general & #watercooler
  { messageId: "M_G12", userId: "U_BOB", emoji: "🙌" },
  { messageId: "M_G12", userId: "U_FRANK", emoji: "🙌" },
  { messageId: "M_G12", userId: "U_GRACE", emoji: "🎉" },
  { messageId: "M_G12", userId: "U_VIKTOR", emoji: "🔥" },
  { messageId: "M_G12", userId: "U_HEIDI", emoji: "🎉" },
  { messageId: "M_G12", userId: "U_MALLORY", emoji: "🙌" },
  { messageId: "M_G13", userId: "U_FRANK", emoji: "🎉" },
  { messageId: "M_G13", userId: "U_LUKAS", emoji: "🙌" },
  { messageId: "M_G13", userId: "U_IVAN", emoji: "👋" },
  { messageId: "M_W15", userId: "U_CAROL", emoji: "😂" },
  { messageId: "M_W15", userId: "U_DAVE", emoji: "🪴" },
  { messageId: "M_W17", userId: "U_FRANK", emoji: "😂" },
  { messageId: "M_W17", userId: "U_IVAN", emoji: "😂" },
  { messageId: "M_W17", userId: "U_CAROL", emoji: "🤣" },
  { messageId: "M_W18", userId: "U_RADEK", emoji: "😂" },
  { messageId: "M_W18", userId: "U_SARA", emoji: "😂" },
  { messageId: "M_W19", userId: "U_FRANK", emoji: "😂" },
  { messageId: "M_W19", userId: "U_BOB", emoji: "😂" },
];
