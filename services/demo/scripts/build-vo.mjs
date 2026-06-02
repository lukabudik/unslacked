/**
 * build-vo.mjs — generate the voiceover with ElevenLabs.
 *
 * One clip per scene. Uses the /with-timestamps endpoint so we get the exact
 * spoken duration of each clip, written to src/data/vo-manifest.json — the
 * Remotion timeline reads that to size each scene to its narration.
 *
 * Reads ELEVENLABS_API_KEY from env or services/demo/.env.local (gitignored).
 * Run: pnpm --filter @unslacked/demo vo
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// load key
let KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY && existsSync(join(ROOT, ".env.local"))) {
  const m = readFileSync(join(ROOT, ".env.local"), "utf8").match(/ELEVENLABS_API_KEY=(.+)/);
  if (m) KEY = m[1].trim();
}
if (!KEY) {
  console.error("Missing ELEVENLABS_API_KEY (env or .env.local)");
  process.exit(1);
}

const MODEL = "eleven_multilingual_v2";
const FORMAT = "mp3_44100_128";
const PREFERRED = ["Eric", "Brian", "Bill", "Charlie", "Adam", "Roger"];
const PREFER_BY_ID = process.env.VO_VOICE_ID; // optional override

// The script. Punchy, English, no Czech names (so pronunciation stays clean).
const LINES = [
  { id: "hook", text: "Every company has a hidden org chart. Not the one on the wall — the one buried in Slack." },
  { id: "world", text: "This is six weeks of one company's Slack. It looks busy. It looks fine." },
  { id: "trace", text: "But watch one simple question. It gets forwarded. And forwarded. Five times — and nobody actually owns it." },
  { id: "multiply", text: "And it isn't one bad thread. Four hundred times, questions bounce between people. A hundred and twenty-six of them, hidden in private DMs." },
  { id: "reveal", text: "Map every hand-off, and the real org appears — a handful of people that everything quietly routes through." },
  { id: "dashboard", text: "Unslacked turns your Slack into this. The hidden middlemen, the single points of failure, and the questions that never reach an owner." },
  { id: "automations", text: "It also finds the work worth automating — the same requests, again and again — and drafts a ready-to-ship brief straight into a Duvo AI agent." },
  { id: "assistant", text: "And it lives right inside Slack. Message the wrong person, and an agent quietly tells you who really owns it — one click to reroute. Not sure who to ask? Just ask the bot." },
  { id: "fix", text: "The result: five hops and days of waiting become a single message, straight to the owner." },
  { id: "build", text: "We built this whole pipeline today. A working Slack clone — because we needed somewhere to simulate the data. A hundred AI agents role-played six weeks of chatter. An analysis agent reads it with the Anthropic SDK, and the dashboard turns it into Claude-enriched insight, plus automation briefs for Duvo." },
  { id: "close", text: "Unslacked. See who really runs your company." },
];

const H = { "xi-api-key": KEY, "Content-Type": "application/json" };

async function pickVoice() {
  const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": KEY } });
  if (!r.ok) throw new Error(`voices ${r.status}: ${await r.text()}`);
  const { voices } = await r.json();
  if (PREFER_BY_ID) {
    const v = voices.find((x) => x.voice_id === PREFER_BY_ID);
    if (v) return v;
  }
  for (const name of PREFERRED) {
    const v = voices.find((x) => x.name === name || x.name.startsWith(name + " ") || x.name.startsWith(name + " -"));
    if (v) return v;
  }
  return voices[0];
}

async function tts(voiceId, text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=${FORMAT}`;
  const r = await fetch(url, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      text,
      model_id: MODEL,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
    }),
  });
  if (!r.ok) throw new Error(`tts ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const ends = j.alignment?.character_end_times_seconds || j.normalized_alignment?.character_end_times_seconds || [];
  const duration = ends.length ? ends[ends.length - 1] : null;
  return { audio: Buffer.from(j.audio_base64, "base64"), duration };
}

const outDir = join(ROOT, "public", "vo");
mkdirSync(outDir, { recursive: true });

// optional partial regen: `node build-vo.mjs build assistant` only re-synths those ids (saves credits)
const only = process.argv.slice(2).filter((x) => !x.startsWith("-"));
const manifestPath = join(ROOT, "src", "data", "vo-manifest.json");

const voice = await pickVoice();
console.log(`voice: ${voice.name} (${voice.voice_id})`);

let manifest = { voice: voice.name, voiceId: voice.voice_id, model: MODEL, clips: {} };
if (only.length && existsSync(manifestPath)) {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.voice = voice.name;
  manifest.voiceId = voice.voice_id;
}
const targets = only.length ? LINES.filter((l) => only.includes(l.id)) : LINES;
for (const line of targets) {
  const { audio, duration } = await tts(voice.voice_id, line.text);
  writeFileSync(join(outDir, `${line.id}.mp3`), audio);
  manifest.clips[line.id] = { file: `vo/${line.id}.mp3`, duration: Math.round(duration * 1000) / 1000, text: line.text };
  console.log(`  ${line.id}: ${duration?.toFixed(2)}s`);
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
const total = Object.values(manifest.clips).reduce((a, c) => a + c.duration, 0);
console.log(`total narration: ${total.toFixed(1)}s -> src/data/vo-manifest.json`);
