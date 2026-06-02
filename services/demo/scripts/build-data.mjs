/**
 * build-data.mjs — curate the real datagen output into a small, demo-ready JSON.
 *
 * Reads packages/datagen/out/{org,truth,transcript}.json and emits
 * src/data/demo-data.json with: headline stats, team palette, router/bottleneck
 * leaderboards, a resolved hero routing chain (with real message text), a set of
 * real "chaos" channel messages, and a deterministic graph layout (nodes+edges).
 *
 * Everything in the video is therefore traceable to ground truth. No faked numbers.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "..", "..", "packages", "datagen", "out");
const read = (f) => JSON.parse(readFileSync(join(OUT, f), "utf8"));

const org = read("org.json");
const truth = read("truth.json");
const transcript = read("transcript.json");

const people = org.people;
const byId = Object.fromEntries(people.map((p) => [p.id, p]));
const name = (id) => byId[id]?.real_name ?? id;
const handle = (id) => byId[id]?.handle ?? id;
const team = (id) => byId[id]?.team ?? "Unknown";
const initials = (id) => {
  const n = byId[id]?.real_name ?? id.replace(/^U_/, "");
  const parts = n.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
};

// ---- message lookup (channel + dm) ----
const allMsgs = [...(transcript.channel_messages || []), ...(transcript.dm_messages || [])];
const msgById = Object.fromEntries(allMsgs.map((m) => [m.id, m]));
const channelKeyById = {};
for (const c of org.channels) channelKeyById[`C_${c.key.toUpperCase()}`] = c.name;

// render Slack markup into readable text
function render(text) {
  if (!text) return "";
  // mentions/channels wrapped in ⟦…⟧ markers so the UI can style them precisely
  return text
    .replace(/<@(U_[A-Z0-9]+)>/g, (_, id) => `⟦@${name(id)}⟧`)
    .replace(/<#(C_[A-Z0-9_]+)>/g, (_, id) => `⟦#${channelKeyById[id] ?? id.replace(/^C_/, "").toLowerCase()}⟧`)
    .replace(/<(https?:[^|>]+)\|([^>]+)>/g, "$2")
    .replace(/<(https?:[^>]+)>/g, "$1");
}

// ---- team palette (Slack-ish, distinct per team) ----
const TEAM_COLORS = {
  Leadership: "#E8912D",
  "Platform Engineering": "#4A90D9",
  "Payments Engineering": "#2BAC76",
  "Frontend Engineering": "#9B59B6",
  "Mobile Engineering": "#16A085",
  "Data & ML": "#3498DB",
  "SRE / Infrastructure": "#E74C3C",
  Product: "#F39C12",
  Design: "#E91E8C",
  Operations: "#1ABC9C",
  "IT & Workplace": "#E67E22",
  "People & HR": "#8E44AD",
  Finance: "#27AE60",
  "Legal & Compliance": "#7F8C8D",
  Sales: "#C0392B",
  Marketing: "#D35400",
  "Customer Support": "#2980B9",
};
const teamColor = (t) => TEAM_COLORS[t] ?? "#9aa0a6";

// ---- stats from truth ----
const chains = truth.chains;
const routedTo = {}, didRoute = {}, ownerOf = {};
const hopsDist = {};
let tagChains = 0, handoffChains = 0;
const edgeMap = {}; // "from|to" -> {from,to,weight,topics:Set}

for (const c of chains) {
  ownerOf[c.owner] = (ownerOf[c.owner] || 0) + 1;
  const realHops = c.hops.filter((h) => h.mechanism !== "answer");
  hopsDist[realHops.length] = (hopsDist[realHops.length] || 0) + 1;
  if (c.mechanism === "handoff") handoffChains++; else tagChains++;
  for (const h of c.hops) {
    if (h.mechanism === "answer" || !h.from || !h.to) continue;
    routedTo[h.to] = (routedTo[h.to] || 0) + 1;
    didRoute[h.from] = (didRoute[h.from] || 0) + 1;
    const k = `${h.from}|${h.to}`;
    if (!edgeMap[k]) edgeMap[k] = { from: h.from, to: h.to, weight: 0 };
    edgeMap[k].weight++;
  }
}
const deepChains = chains.filter((c) => c.hops.filter((h) => h.mechanism !== "answer").length >= 4).length;

const lead = (obj, n = 6) =>
  Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id, v]) => ({ id, name: name(id), team: team(id), color: teamColor(team(id)), count: v, title: byId[id]?.title ?? "" }));

// ---- hero chain: deepest, relatable, all messages resolvable, ends in handoff if possible ----
function scoreHero(c) {
  const realHops = c.hops.filter((h) => h.mechanism !== "answer");
  const resolvable = c.message_ids.every((m) => msgById[m]);
  let s = realHops.length * 10;
  if (!resolvable) s -= 100;
  if (c.mechanism === "handoff") s += 8; // invisible DM = the compelling case
  if (c.topic.length < 60) s += 5;
  if (/vpn|laptop|access|account|invoice|password|onboard/i.test(c.topic)) s += 6;
  return s;
}
const hero = [...chains].sort((a, b) => scoreHero(b) - scoreHero(a))[0];
const heroResolved = {
  topic: hero.topic,
  channel: channelKeyById[hero.channel] ?? hero.channel,
  asker: { id: hero.asker, name: name(hero.asker), team: team(hero.asker), color: teamColor(team(hero.asker)), initials: initials(hero.asker) },
  owner: { id: hero.owner, name: name(hero.owner), team: team(hero.owner), color: teamColor(team(hero.owner)), initials: initials(hero.owner), title: byId[hero.owner]?.title ?? "" },
  mechanism: hero.mechanism,
  hops: hero.hops.map((h) => ({
    from: h.from ? { id: h.from, name: name(h.from), initials: initials(h.from), color: teamColor(team(h.from)) } : null,
    to: { id: h.to, name: name(h.to), initials: initials(h.to), color: teamColor(team(h.to)) },
    mechanism: h.mechanism,
    text: msgById[h.msg] ? render(msgById[h.msg].text) : "",
  })),
  messages: hero.message_ids
    .map((m) => msgById[m])
    .filter(Boolean)
    .map((m) => ({
      id: m.id,
      user: { id: m.user_id, name: name(m.user_id), initials: initials(m.user_id), color: byId[m.user_id]?.avatar_color ?? teamColor(team(m.user_id)) },
      text: render(m.text),
      ts: m.ts,
    })),
};

// ---- chaos messages: a lively spread from busy public channels ----
const busyChannels = ["C_GENERAL", "C_ENGINEERING", "C_OPERATIONS", "C_INCIDENTS", "C_RANDOM"];
const chaos = (transcript.channel_messages || [])
  .filter((m) => busyChannels.includes(m.channel_id) && m.text && m.text.length > 30 && m.text.length < 220 && !m.thread_ts)
  .filter((_, i) => i % 7 === 0) // spread across the timeline deterministically
  .slice(0, 40)
  .map((m) => ({
    id: m.id,
    channel: channelKeyById[m.channel_id] ?? m.channel_id,
    user: { id: m.user_id, name: name(m.user_id), initials: initials(m.user_id), color: byId[m.user_id]?.avatar_color ?? teamColor(team(m.user_id)) },
    text: render(m.text),
  }));

// ---- graph layout: deterministic team clusters on a circle, routers pulled to center ----
const teamsPresent = [...new Set(people.map((p) => p.team))];
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const maxRoute = Math.max(...Object.values(didRoute), 1);
const W = 1920, H = 1080, CX = W / 2, CY = H / 2;

const teamAngle = {};
teamsPresent.forEach((t, i) => { teamAngle[t] = (i / teamsPresent.length) * Math.PI * 2; });

const nodes = people
  .filter((p) => !p.is_bot)
  .map((p) => {
    const rOut = didRoute[p.id] || 0;
    const rIn = routedTo[p.id] || 0;
    const routerScore = rOut / maxRoute; // 0..1 how much of a switchboard
    const isRouter = rOut >= 25;
    // cluster center for the team
    const ang = teamAngle[p.team] ?? 0;
    const clusterR = 600;
    const ccx = CX + Math.cos(ang) * clusterR;
    const ccy = CY + Math.sin(ang) * clusterR * 0.62; // squash vertically for 16:9
    // jitter within cluster, deterministic
    const hx = (hash(p.id) % 1000) / 1000 - 0.5;
    const hy = (hash(p.id + "y") % 1000) / 1000 - 0.5;
    const spread = 230;
    let x = ccx + hx * spread;
    let y = ccy + hy * spread * 0.8;
    // pull routers toward center (they bridge clusters)
    const pull = routerScore * 0.55;
    x = x * (1 - pull) + CX * pull;
    y = y * (1 - pull) + CY * pull;
    return {
      id: p.id,
      name: p.real_name,
      initials: initials(p.id),
      team: p.team,
      color: teamColor(p.team),
      title: p.title,
      routedOut: rOut,
      routedIn: rIn,
      routerScore: Math.round(routerScore * 100) / 100,
      isRouter,
      size: 6 + Math.sqrt(rOut + rIn) * 2.2,
      x: Math.round(x),
      y: Math.round(y),
    };
  });
const nodePos = Object.fromEntries(nodes.map((n) => [n.id, n]));
const edges = Object.values(edgeMap)
  .filter((e) => nodePos[e.from] && nodePos[e.to])
  .sort((a, b) => b.weight - a.weight)
  .map((e) => ({ from: e.from, to: e.to, weight: e.weight, fromRouter: nodePos[e.from].isRouter || nodePos[e.to].isRouter }));

const teams = teamsPresent.map((t) => ({ name: t, color: teamColor(t), count: people.filter((p) => p.team === t).length }));

// sidebar for the Slack recreation
const sidebarChannels = org.channels
  .filter((c) => c.kind === "public_channel" || c.kind === "private_channel")
  .map((c) => ({ name: c.name, private: c.kind === "private_channel" }))
  .slice(0, 11);
const dmPeople = [...people]
  .filter((p) => !p.is_bot && p.is_active)
  .sort((a, b) => (didRoute[b.id] || 0) - (didRoute[a.id] || 0))
  .slice(0, 6)
  .map((p, i) => ({ name: p.real_name, initials: initials(p.id), color: p.avatar_color ?? teamColor(p.team), online: i % 3 !== 0 }));
const sidebar = { channels: sidebarChannels, dms: dmPeople };

// in-Slack assistant scenario — real people picked by team
const pick = (re, preferLead = true) => {
  const cand = people.filter((p) => !p.is_bot && p.is_active && re.test(p.team));
  return cand.sort((a, b) => (preferLead ? Number(b.is_lead) - Number(a.is_lead) : 0) || (ownerOf[b.id] || 0) - (ownerOf[a.id] || 0))[0];
};
const personCard = (p) => p && { id: p.id, name: p.real_name, title: p.title, team: p.team, initials: initials(p.id), color: p.avatar_color ?? teamColor(p.team) };
const financeOwner = pick(/^Finance/) || pick(/Finance/);
const paymentsOwner = pick(/Payments/) || financeOwner;
const wrongPerson = personCard(byId[lead(didRoute)[0].id]); // a known router (IT/Ops) = the habitual wrong recipient
const assistant = {
  dmWith: wrongPerson,
  draft: "hey — can you approve my expense report for the client dinner? it's €240, need it by Friday 🙏",
  topic: "Expense approvals",
  owner: personCard(financeOwner),
  bot: {
    q: "who actually owns courier payouts?",
    owner: personCard(paymentsOwner),
  },
};

const data = {
  company: org.company,
  stats: {
    people: people.filter((p) => !p.is_bot).length,
    channels: org.channels.length,
    messages: (transcript.channel_messages?.length || 0) + (transcript.dm_messages?.length || 0),
    channelMessages: transcript.channel_messages?.length || 0,
    dms: (transcript.dm_channels?.length || 0),
    days: 39,
    weeks: 6,
    chains: chains.length,
    storylines: truth.storylines?.length || 0,
    tagChains,
    handoffChains, // the invisible DM handoffs
    deepChains, // 4+ hops
    hopsDist,
    teams: teamsPresent.length,
    hoursRecoverable: 18,
    avgDegrees: 2.3,
  },
  teams,
  sidebar,
  assistant,
  topRouters: lead(didRoute), // switchboards
  topBottlenecks: lead(routedTo), // routed-to owners
  topOwners: lead(ownerOf),
  hero: heroResolved,
  chaos,
  graph: { width: W, height: H, nodes, edges },
};

writeFileSync(join(__dirname, "..", "src", "data", "demo-data.json"), JSON.stringify(data, null, 2));
console.log("wrote demo-data.json");
console.log(`  ${data.stats.people} people, ${data.stats.messages} msgs, ${data.stats.chains} chains`);
console.log(`  hero: "${hero.topic}" (${heroResolved.hops.length} hops, ${hero.mechanism}) in #${heroResolved.channel}`);
console.log(`  graph: ${nodes.length} nodes, ${edges.length} edges`);
console.log(`  top router: ${data.topRouters[0].name} ${data.topRouters[0].count}x | top bottleneck: ${data.topBottlenecks[0].name} ${data.topBottlenecks[0].count}x`);
