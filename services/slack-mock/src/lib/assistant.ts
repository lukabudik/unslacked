/**
 * Assistant backend seam.
 *
 * Both assistant features go through here. When `BACKEND_URL` is set we call the
 * real analysis backend (the backend repo in this project); otherwise we fall
 * back to a local mock that resolves owners from the org's team/title data, so
 * the UI works end-to-end today and swaps to the real API by setting one env var.
 *
 * ── Backend HTTP contract (implement these in the backend repo) ──────────────
 *  POST {BACKEND_URL}/assistant/who-to-contact
 *    body: { question: string, askerId: string }
 *    200:  { answer: string, suggestions: { userId: string, reason: string }[] }
 *
 *  POST {BACKEND_URL}/assistant/check-routing
 *    body: { text: string, authorId: string, recipientIds: string[], channelId: string }
 *    200:  { misrouted: boolean, ownerId?: string, reason?: string }
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { listUsers, type StoreUser } from "@unslacked/db";

const BACKEND_URL = process.env.BACKEND_URL;

export interface ContactSuggestion {
  userId: string;
  reason: string;
}
export interface AssistantAnswer {
  answer: string;
  suggestions: ContactSuggestion[];
}
export interface RoutingVerdict {
  misrouted: boolean;
  ownerId?: string;
  reason?: string;
}

// topic → which team owns it (matched as a case-insensitive substring of the
// user's `team`). First matching rule wins. This is the mock's brain; the real
// backend will do this far better from the actual message graph.
const TOPIC_RULES: { re: RegExp; team: string; topic: string }[] = [
  { re: /\b(bill|billing|payment|payout|invoice|refund|charge|subscription|pricing|stripe)\b/i, team: "Payments", topic: "billing & payments" },
  { re: /\b(deploy|release|rollback|ci\/?cd|pipeline build)\b/i, team: "Platform", topic: "deploys" },
  { re: /\b(infra|kubernetes|k8s|cluster|latency|incident|on-?call|outage|monitoring|alert|redis|scaling)\b/i, team: "Infrastructure", topic: "infrastructure & reliability" },
  { re: /\b(api|backend|service|endpoint|microservice)\b/i, team: "Platform", topic: "backend / APIs" },
  { re: /\b(frontend|web app|css|react|ui bug|design system)\b/i, team: "Frontend", topic: "the web frontend" },
  { re: /\b(mobile|ios|android|app store|push notification)\b/i, team: "Mobile", topic: "the mobile apps" },
  { re: /\b(data|analytics|dashboard|metric|warehouse|etl|ml|model|experiment|funnel)\b/i, team: "Data", topic: "data & analytics" },
  { re: /\b(design|ux|figma|mockup|prototype|research)\b/i, team: "Design", topic: "design" },
  { re: /\b(roadmap|spec|prioritization|feature scope|product)\b/i, team: "Product", topic: "product / roadmap" },
  { re: /\b(hiring|recruit|onboard|offer|pto|time off|payroll|benefits|hr|performance review)\b/i, team: "People", topic: "people & HR" },
  { re: /\b(access|laptop|vpn|account|login|password|saas|tool|workspace setup|2fa)\b/i, team: "IT", topic: "IT / access" },
  { re: /\b(budget|expense|vendor|procurement|reimburse|finance|cost)\b/i, team: "Finance", topic: "finance" },
  { re: /\b(legal|contract|gdpr|compliance|privacy|dpa|nda)\b/i, team: "Legal", topic: "legal & compliance" },
  { re: /\b(sales|deal|pipeline|quota|prospect|account exec)\b/i, team: "Sales", topic: "sales" },
  { re: /\b(support|ticket|escalation|customer success|complaint)\b/i, team: "Support", topic: "customer support" },
  { re: /\b(marketing|campaign|brand|content|seo|social|pr)\b/i, team: "Marketing", topic: "marketing" },
  { re: /\b(logistics|courier|warehouse|dispatch|delivery ops)\b/i, team: "Operations", topic: "operations" },
];

const LEADER = /lead|head|chief|director|\bvp\b|ceo|cto|cfo|coo|manager|principal|staff/i;

function teamMatches(user: StoreUser, team: string): boolean {
  return Boolean(user.team && user.team.toLowerCase().includes(team.toLowerCase()));
}

function resolveOwner(
  text: string,
  users: StoreUser[],
): { rule: (typeof TOPIC_RULES)[number]; owner: StoreUser } | null {
  for (const rule of TOPIC_RULES) {
    if (!rule.re.test(text)) continue;
    const onTeam = users.filter((u) => u.isActive && !u.isBot && teamMatches(u, rule.team));
    if (!onTeam.length) continue;
    const owner = onTeam.find((u) => u.title && LEADER.test(u.title)) ?? onTeam[0];
    return { rule, owner };
  }
  return null;
}

// ── Feature 1: ask "who do I talk to about X?" ───────────────────────────────
export async function whoToContact(question: string, askerId: string): Promise<AssistantAnswer> {
  if (BACKEND_URL) {
    try {
      return await callBackend<AssistantAnswer>("/assistant/who-to-contact", { question, askerId });
    } catch {
      /* fall back to mock */
    }
  }
  const users = await listUsers();
  const hit = resolveOwner(question, users);
  if (!hit) {
    return {
      answer:
        "I'm not sure who owns that yet — try naming the system or area (e.g. \"billing\", \"deploys\", \"hiring\").",
      suggestions: [],
    };
  }
  const { owner, rule } = hit;
  return {
    answer: `For ${rule.topic}, talk to <@${owner.id}> — ${owner.title ?? "the owner"}.`,
    suggestions: [{ userId: owner.id, reason: `Owns ${rule.topic} on the ${owner.team ?? rule.team} team` }],
  };
}

// ── Feature 2: is this message going to the wrong person? ────────────────────
export async function checkRouting(input: {
  text: string;
  authorId: string;
  recipientIds: string[];
  channelId: string;
}): Promise<RoutingVerdict> {
  if (BACKEND_URL) {
    try {
      return await callBackend<RoutingVerdict>("/assistant/check-routing", input);
    } catch {
      /* fall back to mock */
    }
  }
  const users = await listUsers();
  const byId = new Map(users.map((u) => [u.id, u]));
  const hit = resolveOwner(input.text, users);
  if (!hit) return { misrouted: false };

  const { owner, rule } = hit;
  const recipients = input.recipientIds.map((id) => byId.get(id)).filter(Boolean) as StoreUser[];
  const reachesOwner =
    input.recipientIds.includes(owner.id) || recipients.some((r) => teamMatches(r, rule.team));
  if (reachesOwner || !recipients.length) return { misrouted: false };

  return {
    misrouted: true,
    ownerId: owner.id,
    reason: `${rule.topic} is owned by <@${owner.id}> (${owner.title ?? "owner"}), not ${recipients
      .map((r) => `<@${r.id}>`)
      .join(", ")}.`,
  };
}

async function callBackend<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // analysis can be slowish; keep it snappy for the UI
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`backend ${path} -> ${res.status}`);
  return (await res.json()) as T;
}
