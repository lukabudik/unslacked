/**
 * Seed dataset for a fictional ~30-person company, "Nimbus Logistics".
 *
 * The point of this data is to contain OBVIOUS routing patterns so the backend
 * has something real to detect and the demo lands. Two people are deliberate
 * "routers": Bob (eng lead who deflects everything to his team) and Frank (ops
 * who is the human switchboard). Everyone funnels questions through them and
 * they mostly reply "ask @X" / "that's @Y's area".
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
  avatarColor: string;
  isBot?: boolean;
}

export interface FixtureChannel {
  id: string;
  name: string;
  kind: "public_channel" | "private_channel" | "im" | "mpim";
  topic?: string;
  purpose?: string;
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

const c = {
  purple: "#4a154b",
  blue: "#1264a3",
  green: "#2bac76",
  red: "#e01e5a",
  orange: "#e8912d",
  teal: "#0b8a8f",
  pink: "#cd2553",
};

export const users: FixtureUser[] = [
  { id: "U_ALICE", name: "alice", realName: "Alice Novak", email: "alice@nimbus.test", title: "CEO", department: "Leadership", avatarColor: c.purple },
  { id: "U_BOB", name: "bob", realName: "Bob Svoboda", email: "bob@nimbus.test", title: "Engineering Lead", department: "Engineering", avatarColor: c.blue },
  { id: "U_CAROL", name: "carol", realName: "Carol Dvorak", email: "carol@nimbus.test", title: "Backend Engineer", department: "Engineering", avatarColor: c.green },
  { id: "U_DAVE", name: "dave", realName: "Dave Kucera", email: "dave@nimbus.test", title: "Frontend Engineer", department: "Engineering", avatarColor: c.orange },
  { id: "U_EVE", name: "eve", realName: "Eve Prochazka", email: "eve@nimbus.test", title: "Product Designer", department: "Design", avatarColor: c.pink },
  { id: "U_FRANK", name: "frank", realName: "Frank Marek", email: "frank@nimbus.test", title: "Head of Operations", department: "Operations", avatarColor: c.teal },
  { id: "U_GRACE", name: "grace", realName: "Grace Horak", email: "grace@nimbus.test", title: "Product Manager", department: "Product", avatarColor: c.red },
  { id: "U_HEIDI", name: "heidi", realName: "Heidi Pokorna", email: "heidi@nimbus.test", title: "Data Analyst", department: "Data", avatarColor: c.blue },
  { id: "U_IVAN", name: "ivan", realName: "Ivan Benes", email: "ivan@nimbus.test", title: "Junior Engineer", department: "Engineering", avatarColor: c.green },
  { id: "U_JUDY", name: "judy", realName: "Judy Sykora", email: "judy@nimbus.test", title: "Account Executive", department: "Sales", avatarColor: c.orange },
  { id: "U_MALLORY", name: "mallory", realName: "Mallory Ruzicka", email: "mallory@nimbus.test", title: "Customer Success", department: "Support", avatarColor: c.pink },
  { id: "U_BOT", name: "unslacked", realName: "Unslacked Bot", email: "", title: "Routing Assistant", department: "—", avatarColor: c.teal, isBot: true },
];

export const channels: FixtureChannel[] = [
  {
    id: "C_GENERAL",
    name: "general",
    kind: "public_channel",
    topic: "Company-wide announcements",
    purpose: "All-hands chatter",
    createdBy: "U_ALICE",
    members: ["U_ALICE", "U_BOB", "U_CAROL", "U_DAVE", "U_EVE", "U_FRANK", "U_GRACE", "U_HEIDI", "U_IVAN", "U_JUDY", "U_MALLORY"],
  },
  {
    id: "C_ENGINEERING",
    name: "engineering",
    kind: "public_channel",
    topic: "Eng discussion, deploys, incidents",
    createdBy: "U_BOB",
    members: ["U_BOB", "U_CAROL", "U_DAVE", "U_IVAN", "U_HEIDI", "U_GRACE"],
  },
  {
    id: "C_OPS",
    name: "ops",
    kind: "public_channel",
    topic: "Internal tooling, access, accounts, logistics",
    createdBy: "U_FRANK",
    members: ["U_FRANK", "U_ALICE", "U_BOB", "U_JUDY", "U_MALLORY", "U_GRACE", "U_IVAN"],
  },
  {
    id: "C_DESIGN",
    name: "design",
    kind: "public_channel",
    topic: "Design reviews & assets",
    createdBy: "U_EVE",
    members: ["U_EVE", "U_DAVE", "U_GRACE", "U_ALICE"],
  },
  {
    id: "D_IVAN_BOB",
    name: "ivan-bob",
    kind: "im",
    members: ["U_IVAN", "U_BOB"],
  },
];

// Base ordering is by `minute`. Threads reference a parent message id.
export const messages: FixtureMessage[] = [
  // --- #engineering: Ivan (junior) funnels everything through Bob, who routes ---
  { id: "M_001", channelId: "C_ENGINEERING", userId: "U_IVAN", text: "Hey, who owns the billing service? Need to add a coupon field.", minute: 0 },
  { id: "M_002", channelId: "C_ENGINEERING", userId: "U_BOB", text: "That's Carol's area, ask <@U_CAROL>.", threadTs: "M_001", minute: 2 },
  { id: "M_003", channelId: "C_ENGINEERING", userId: "U_IVAN", text: "How do I get staging access for it?", minute: 5 },
  { id: "M_004", channelId: "C_ENGINEERING", userId: "U_BOB", text: "Access stuff goes through <@U_FRANK> in #ops.", threadTs: "M_003", minute: 6 },
  { id: "M_005", channelId: "C_ENGINEERING", userId: "U_DAVE", text: "Bob, can you review the checkout PR?", minute: 20 },
  { id: "M_006", channelId: "C_ENGINEERING", userId: "U_BOB", text: "Frontend review? <@U_DAVE> just ask <@U_EVE> for the design sign-off and merge.", threadTs: "M_005", minute: 22 },
  { id: "M_007", channelId: "C_ENGINEERING", userId: "U_HEIDI", text: "Where do prod event logs land? Need them for the funnel report.", minute: 30 },
  { id: "M_008", channelId: "C_ENGINEERING", userId: "U_BOB", text: "<@U_CAROL> set that pipeline up, she'll know.", threadTs: "M_007", minute: 31 },
  { id: "M_009", channelId: "C_ENGINEERING", userId: "U_CAROL", text: "Coupons live in the `pricing` module — I'll pair with you <@U_IVAN>, ping me after standup.", minute: 35 },
  { id: "M_010", channelId: "C_ENGINEERING", userId: "U_GRACE", text: "What's the ETA on the search rework?", minute: 40 },
  { id: "M_011", channelId: "C_ENGINEERING", userId: "U_BOB", text: "<@U_DAVE> is driving that, he can give you a date.", threadTs: "M_010", minute: 41 },

  // --- #ops: Frank is the human switchboard ---
  { id: "M_020", channelId: "C_OPS", userId: "U_IVAN", text: "Need staging access to billing, Bob sent me here.", minute: 8 },
  { id: "M_021", channelId: "C_OPS", userId: "U_FRANK", text: "Access requests go to <@U_CAROL> since she owns the repo — she'll add you.", threadTs: "M_020", minute: 10 },
  { id: "M_022", channelId: "C_OPS", userId: "U_JUDY", text: "Customer is asking for an invoice in EUR, who can help?", minute: 50 },
  { id: "M_023", channelId: "C_OPS", userId: "U_FRANK", text: "Finance things → <@U_GRACE> handles billing ops now.", threadTs: "M_022", minute: 52 },
  { id: "M_024", channelId: "C_OPS", userId: "U_MALLORY", text: "VPN is down for me, can't reach the dashboards.", minute: 60 },
  { id: "M_025", channelId: "C_OPS", userId: "U_FRANK", text: "That's a <@U_CAROL> / infra thing, she can reset the gateway.", threadTs: "M_024", minute: 61 },
  { id: "M_026", channelId: "C_OPS", userId: "U_ALICE", text: "Who do I talk to about the new office laptops?", minute: 70 },
  { id: "M_027", channelId: "C_OPS", userId: "U_FRANK", text: "I'll loop in <@U_MALLORY>, she's been tracking the orders.", threadTs: "M_026", minute: 71 },

  // --- #general ---
  { id: "M_040", channelId: "C_GENERAL", userId: "U_ALICE", text: "Welcome <@U_IVAN> to the team! 🎉", minute: 1 },
  { id: "M_041", channelId: "C_GENERAL", userId: "U_GRACE", text: "Reminder: roadmap review Thursday 2pm.", minute: 90 },
  { id: "M_042", channelId: "C_GENERAL", userId: "U_BOB", text: "Deploy freeze this Friday for the migration.", minute: 95 },

  // --- #design ---
  { id: "M_050", channelId: "C_DESIGN", userId: "U_DAVE", text: "Need sign-off on the checkout button states.", minute: 25 },
  { id: "M_051", channelId: "C_DESIGN", userId: "U_EVE", text: "Looks good, ship it. One nit: bump the disabled contrast.", threadTs: "M_050", minute: 28 },

  // --- DM: Ivan -> Bob, classic 1:1 routing ---
  { id: "M_060", channelId: "D_IVAN_BOB", userId: "U_IVAN", text: "Sorry to DM — who approves time off?", minute: 100 },
  { id: "M_061", channelId: "D_IVAN_BOB", userId: "U_BOB", text: "That's <@U_FRANK>, he runs the HR side.", threadTs: "M_060", minute: 101 },
];
