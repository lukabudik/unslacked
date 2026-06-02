import WebSocket from "ws";
const ws = new WebSocket("ws://localhost:8787");
const tally = {};
const samples = [];
let users = {};
ws.on("open", () => console.log("connected to ws"));
ws.on("message", (buf) => {
  const m = JSON.parse(buf.toString());
  tally[m.t] = (tally[m.t] || 0) + 1;
  if (m.t === "init") users = Object.fromEntries((m.users || []).map((u) => [u.id, u.realName || u.handle]));
  if (m.t === "message" && samples.length < 6)
    samples.push(`${users[m.message.userId] || m.message.userId}: ${m.message.text.slice(0, 90)}`);
});
ws.on("error", (e) => console.log("ws error:", e.message));
setTimeout(() => {
  console.log("event tally:", JSON.stringify(tally));
  console.log("sample messages:\n  " + samples.join("\n  "));
  process.exit(0);
}, 45000);
