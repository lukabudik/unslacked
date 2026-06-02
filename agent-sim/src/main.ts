import { appendFileSync, writeFileSync } from "node:fs";
import { loadOrg } from "./org.js";
import { World } from "./world.js";
import { startServer } from "./server.js";
import { Simulation, type SimConfig } from "./orchestrator.js";

const TRANSCRIPT = "out/transcript.jsonl";

/** Persist every message + channel-creation so a run can be analyzed afterward. */
function persist(world: World) {
  writeFileSync(TRANSCRIPT, ""); // fresh per run
  world.on("message", (m) => appendFileSync(TRANSCRIPT, JSON.stringify({ k: "message", ...m }) + "\n"));
  world.on("channel", (c) => appendFileSync(TRANSCRIPT, JSON.stringify({ k: "channel", ...c }) + "\n"));
}

function parseArgs(argv: string[]): SimConfig {
  const get = (flag: string, def: number) => {
    const i = argv.indexOf(flag);
    if (i === -1) return def;
    const v = Number(argv[i + 1]);
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : def;
  };
  return {
    agents: get("--agents", 12),
    ticks: get("--ticks", 6),
    concurrency: get("--concurrency", 6),
    forever: argv.includes("--forever"),
    tickDelayMs: get("--tick-delay", 0),
  };
}

/** load the cached org into a fresh World */
export function seedWorld(world: World, org: Awaited<ReturnType<typeof loadOrg>>) {
  for (const u of org.users) world.addUser(u);
  for (const c of org.channels) world.addChannel(c);
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  const org = await loadOrg();
  const world = new World();
  seedWorld(world, org);

  persist(world);
  const server = startServer(world, config);
  console.log(`[main] org: ${org.users.length} users, ${org.channels.length} channels`);
  console.log(`[main] ws server: ${server.url}  (health: http://localhost:${server.port}/health)`);
  console.log(
    `[main] sim config: agents=${config.agents} ticks=${config.ticks} concurrency=${config.concurrency}`,
  );
  console.log("[main] running simulation... (open the UI to watch)");

  const sim = new Simulation(world, config);
  await sim.run();

  console.log(`[main] done. ${[...world.messages.values()].reduce((n, a) => n + a.length, 0)} messages total.`);
  console.log("[main] ws server still up; Ctrl-C to exit.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
