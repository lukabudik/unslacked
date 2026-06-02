// Analyze a finished run: out/org.json (people) + out/transcript.jsonl (messages + DMs).
import { readFileSync } from "node:fs";

const org = JSON.parse(readFileSync("out/org.json", "utf8"));
const byId = Object.fromEntries(org.users.map((u) => [u.id, u]));
const byHandle = Object.fromEntries(org.users.map((u) => [u.handle.toLowerCase(), u]));

const lines = readFileSync("out/transcript.jsonl", "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const msgs = lines.filter((l) => l.k === "message");
const dms = lines.filter((l) => l.k === "channel" && l.kind === "dm");

const isDm = (chId) => String(chId).startsWith("D") || dms.some((d) => d.id === chId);

// resolve mentions: text uses @handle and/or <@U_ID>
function mentionsOf(text) {
  const ids = new Set();
  for (const m of text.matchAll(/<@(U_[A-Z0-9_]+)>/g)) if (byId[m[1]]) ids.add(m[1]);
  for (const m of text.matchAll(/(?<![\w/])@([a-z0-9._-]+)/gi)) {
    const u = byHandle[m[1].toLowerCase()];
    if (u) ids.add(u.id);
  }
  return [...ids];
}

const perAuthor = {};
let withMention = 0;
const inDeg = {}; // who gets mentioned/routed-to
const edges = []; // [author, target]
for (const m of msgs) {
  perAuthor[m.userId] = (perAuthor[m.userId] || 0) + 1;
  const ment = mentionsOf(m.text || "");
  if (ment.length) withMention++;
  for (const t of ment) {
    inDeg[t] = (inDeg[t] || 0) + 1;
    edges.push([m.userId, t]);
  }
}

const dmMsgs = msgs.filter((m) => isDm(m.channelId)).length;
const nm = (id) => (byId[id] ? `${byId[id].realName} (${byId[id].title})` : id);

console.log("=== VOLUME ===");
console.log(`messages: ${msgs.length} | with @mention: ${withMention} (${Math.round((100 * withMention) / Math.max(1, msgs.length))}%)`);
console.log(`channel msgs: ${msgs.length - dmMsgs} | DM msgs: ${dmMsgs} | DMs created by agents: ${dms.length}`);
console.log(`distinct authors: ${Object.keys(perAuthor).length}/${org.users.length}`);

console.log("\n=== TOP ROUTED-TO (mention in-degree) ===");
Object.entries(inDeg).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([id, n]) => console.log(`  ${n}×  ${nm(id)}`));

console.log("\n=== MULTI-HOP? (mentioned person who then mentions someone else) ===");
const mentioned = new Set(edges.map((e) => e[1]));
const forwarders = edges.filter((e) => mentioned.has(e[0])).map((e) => e[0]);
console.log(`  forwarder events (a routed-to person who then routes onward): ${forwarders.length}`);
console.log(`  distinct forwarders: ${new Set(forwarders).size}`);

console.log("\n=== ORGANIC-NESS: most repeated openings (first 22 chars) ===");
const ops = {};
for (const m of msgs) { const o = (m.text || "").slice(0, 22).toLowerCase(); ops[o] = (ops[o] || 0) + 1; }
Object.entries(ops).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([o, n]) => console.log(`  ${n}×  "${o}…"`));

console.log("\n=== PERSONA SPOT-CHECK: a busy agent's messages ===");
const top = Object.entries(perAuthor).sort((a, b) => b[1] - a[1])[0];
if (top) {
  console.log(`  ${nm(top[0])} — ${top[1]} msgs, team ${byId[top[0]]?.team}`);
  msgs.filter((m) => m.userId === top[0]).slice(0, 5).forEach((m) => console.log(`    • ${(m.text || "").replace(/\s+/g, " ").slice(0, 130)}`));
}
