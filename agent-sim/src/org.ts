import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../out/org.json");
const CHEAP_MODEL = "claude-haiku-4-5-20251001";

export interface OrgUser {
  id: string;
  handle: string;
  realName: string;
  title: string;
  team: string;
  department: string;
  avatarColor: string;
  persona: string;
}

export interface OrgChannel {
  id: string;
  name: string;
  kind: "channel" | "dm";
  members: string[];
}

export interface Org {
  users: OrgUser[];
  channels: OrgChannel[];
}

// ---- the blueprint: a logistics startup "Nimbus" -------------------------

interface TeamSpec {
  name: string; // team slug used for channel + grouping
  label: string; // human team name
  department: string;
  headcount: number;
  owns: string; // what this team is responsible for
  channel: string; // dedicated team channel name (no #)
}

const TEAMS: TeamSpec[] = [
  { name: "exec", label: "Executive", department: "Leadership", headcount: 4, owns: "company strategy, fundraising, board, final calls on cross-team tradeoffs", channel: "leadership" },
  { name: "ops", label: "Operations", department: "Operations", headcount: 9, owns: "day-to-day fulfillment operations, warehouse throughput, SLAs", channel: "ops" },
  { name: "dispatch", label: "Dispatch & Routing", department: "Operations", headcount: 8, owns: "live route assignment, driver dispatch, ETA accuracy, exceptions", channel: "dispatch" },
  { name: "fleet", label: "Fleet & Drivers", department: "Operations", headcount: 7, owns: "driver onboarding, vehicle maintenance, fleet capacity, driver app issues", channel: "fleet" },
  { name: "warehouse", label: "Warehouse", department: "Operations", headcount: 8, owns: "inbound/outbound, inventory accuracy, pick-pack, returns processing", channel: "warehouse" },
  { name: "eng-platform", label: "Platform Engineering", department: "Engineering", headcount: 8, owns: "core services, APIs, infra, CI/CD, on-call for production", channel: "eng-platform" },
  { name: "eng-routing", label: "Routing Engineering", department: "Engineering", headcount: 7, owns: "the routing/optimization engine and ETA models", channel: "eng-routing" },
  { name: "eng-mobile", label: "Mobile Engineering", department: "Engineering", headcount: 6, owns: "driver + customer mobile apps, push, release pipeline", channel: "eng-mobile" },
  { name: "data", label: "Data & Analytics", department: "Engineering", headcount: 6, owns: "data pipelines, dashboards, metrics definitions, experimentation", channel: "data" },
  { name: "product", label: "Product", department: "Product", headcount: 6, owns: "roadmap, specs, prioritization, customer discovery", channel: "product" },
  { name: "design", label: "Design", department: "Product", headcount: 4, owns: "UX, design system, research, prototypes", channel: "design" },
  { name: "support", label: "Customer Support", department: "Customer", headcount: 9, owns: "customer tickets, escalations, refund decisions, CSAT", channel: "support" },
  { name: "sales", label: "Sales", department: "Go-To-Market", headcount: 7, owns: "B2B enterprise shipping accounts, pipeline, contracts", channel: "sales" },
  { name: "marketing", label: "Marketing", department: "Go-To-Market", headcount: 5, owns: "brand, growth campaigns, content, demand gen", channel: "marketing" },
  { name: "people", label: "People & Finance", department: "G&A", headcount: 6, owns: "hiring, payroll, benefits, finance/spend, office", channel: "people" },
];

const AVATAR_COLORS = [
  "#E8590C", "#1971C2", "#2F9E44", "#9C36B5", "#F08C00", "#0CA678",
  "#E03131", "#1098AD", "#5F3DC4", "#37B24D", "#D6336C", "#1864AB",
];

const FALLBACK_FIRST = ["Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Avery", "Quinn"];
const FALLBACK_LAST = ["Ng", "Patel", "Rossi", "Kim", "Novak", "Silva", "Hassan", "Brandt", "Owusu", "Larsen"];

function colorFor(i: number) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 14);
}

// ---- LLM fleshing of one team -------------------------------------------

interface FleshedPerson {
  realName: string;
  title: string;
  persona: string;
}

async function fleshTeam(team: TeamSpec): Promise<FleshedPerson[]> {
  const prompt = `Generate ${team.headcount} realistic employees for the "${team.label}" team (department: ${team.department}) at Nimbus, a logistics/last-mile delivery startup.

This team OWNS: ${team.owns}

Return ONLY a JSON array of exactly ${team.headcount} objects, no prose, no markdown fences. Each object:
{
  "realName": "First Last",
  "title": "specific job title within this team (include one manager/lead)",
  "persona": "ONE rich sentence: who they are + the SPECIFIC slice of '${team.owns}' they personally own + that they route anything outside their area to the right team + a distinct voice/quirk (e.g. terse, emoji-heavy, asks clarifying questions, data-obsessed, blunt)."
}

Make names diverse. Make personas distinct from each other so routing behavior emerges. The persona must make clear what they will answer vs. hand off.`;

  let raw = "";
  for await (const m of query({
    prompt,
    options: { model: CHEAP_MODEL, maxTurns: 1 },
  })) {
    if (m.type === "result" && m.subtype === "success") raw = m.result;
  }

  const parsed = extractJsonArray(raw);
  if (parsed && parsed.length) {
    return parsed.slice(0, team.headcount).map((p: any, i: number) => ({
      realName: String(p.realName ?? fallbackName(i)),
      title: String(p.title ?? team.label),
      persona: String(p.persona ?? `Works on ${team.owns}; routes anything else to the right team.`),
    }));
  }
  // fallback if LLM hiccups: deterministic generic personas
  console.warn(`[org] LLM fleshing failed for ${team.label}, using fallback`);
  return Array.from({ length: team.headcount }, (_, i) => ({
    realName: fallbackName(i),
    title: i === 0 ? `${team.label} Lead` : team.label,
    persona: `Owns part of: ${team.owns}. Routes anything outside that to the right team. Keeps it brief.`,
  }));
}

function fallbackName(i: number) {
  return `${FALLBACK_FIRST[i % FALLBACK_FIRST.length]} ${FALLBACK_LAST[(i * 3) % FALLBACK_LAST.length]}`;
}

function extractJsonArray(raw: string): any[] | null {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ---- assemble the full org ----------------------------------------------

function uniqueHandle(realName: string, taken: Set<string>): string {
  const parts = realName.toLowerCase().split(/\s+/);
  let base = (parts[0] + (parts[1]?.[0] ?? "")).replace(/[^a-z0-9]/g, "");
  if (!base) base = "user";
  let h = base;
  let n = 1;
  while (taken.has(h)) h = `${base}${++n}`;
  taken.add(h);
  return h;
}

export async function generateOrg(): Promise<Org> {
  console.log("[org] fleshing teams via", CHEAP_MODEL, "...");
  const fleshed = await Promise.all(
    TEAMS.map(async (t) => ({ team: t, people: await fleshTeam(t) })),
  );

  const users: OrgUser[] = [];
  const takenHandles = new Set<string>();
  let idx = 0;

  for (const { team, people } of fleshed) {
    for (const p of people) {
      const handle = uniqueHandle(p.realName, takenHandles);
      users.push({
        id: `U_${idx.toString(36).padStart(3, "0")}`,
        handle,
        realName: p.realName,
        title: p.title,
        team: team.name,
        department: team.department,
        avatarColor: colorFor(idx),
        persona: p.persona,
      });
      idx++;
    }
  }

  // channels: company-wide + per-team
  const channels: OrgChannel[] = [];
  const allIds = users.map((u) => u.id);
  channels.push({ id: "C_general", name: "general", kind: "channel", members: [...allIds] });
  channels.push({ id: "C_random", name: "random", kind: "channel", members: [...allIds] });

  for (const t of TEAMS) {
    const members = users.filter((u) => u.team === t.name).map((u) => u.id);
    channels.push({
      id: `C_${slug(t.channel)}`,
      name: t.channel,
      kind: "channel",
      members,
    });
  }

  // a few cross-functional channels so hand-offs have somewhere to land
  const cross: { name: string; teams: string[] }[] = [
    { name: "incidents", teams: ["exec", "eng-platform", "ops", "dispatch", "support"] },
    { name: "launches", teams: ["product", "design", "eng-mobile", "marketing", "exec"] },
    { name: "ops-eng", teams: ["ops", "dispatch", "fleet", "warehouse", "eng-routing", "eng-platform", "data"] },
  ];
  for (const c of cross) {
    const members = users.filter((u) => c.teams.includes(u.team)).map((u) => u.id);
    channels.push({ id: `C_${slug(c.name)}`, name: c.name, kind: "channel", members });
  }

  console.log(`[org] built ${users.length} people, ${channels.length} channels`);
  return { users, channels };
}

export async function loadOrg(opts: { regenerate?: boolean } = {}): Promise<Org> {
  if (!opts.regenerate && existsSync(OUT_PATH)) {
    return JSON.parse(readFileSync(OUT_PATH, "utf8")) as Org;
  }
  const org = await generateOrg();
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(org, null, 2));
  console.log("[org] wrote", OUT_PATH);
  return org;
}

// run directly: `npm run org` regenerates
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  loadOrg({ regenerate: true })
    .then((o) => console.log(`[org] done: ${o.users.length} users, ${o.channels.length} channels`))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
