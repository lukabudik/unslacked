import type { World, User } from "./world.js";
import { runTurn, buildDirectory } from "./agent.js";

export interface SimConfig {
  agents: number; // how many of the org's people are active
  ticks: number;
  concurrency: number; // max concurrent turns
}

/** map a tick index to a compressed sim-time label */
function simClock(tick: number): string {
  // each tick ~= 30 sim-minutes starting 09:00
  const start = 9 * 60;
  const t = start + tick * 30;
  const h = Math.floor(t / 60) % 24;
  const m = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** run promise-returning tasks with a concurrency cap */
async function pool<T>(items: T[], cap: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(cap, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

export class Simulation {
  private active: User[];
  private directory: string;

  constructor(
    private world: World,
    private config: SimConfig,
  ) {
    const all = [...world.users.values()];
    this.active = shuffle(all).slice(0, Math.min(config.agents, all.length));
    this.directory = buildDirectory(world);
  }

  /** seed a little initial activity so tick 1 isn't silent */
  private seed() {
    const initiators = this.active.slice(0, Math.min(2, this.active.length));
    const general = this.world.channels.get("C_general");
    for (const u of initiators) {
      const ch = this.world.channelsFor(u.id)[0] ?? general;
      if (!ch) continue;
      this.world.addMessage(
        ch.id,
        u.id,
        `morning all — kicking off the day on ${u.team}. anything blocking that I should know about?`,
      );
    }
  }

  async run() {
    this.seed();

    // give a watcher time to open the UI before the workspace starts buzzing
    console.log("[sim] first tick in 4s — open the UI now to watch live");
    await new Promise((r) => setTimeout(r, 4000));

    for (let tick = 0; tick < this.config.ticks; tick++) {
      const clock = simClock(tick);
      this.world.emit("tick", { n: tick + 1, simClock: clock });

      // responders = anyone pinged/DM'd; initiators = ~half of the rest, who
      // proactively start something so the workspace keeps buzzing
      const pending = this.active.filter((u) => this.world.hasPending(u.id));
      const pendingIds = new Set(pending.map((u) => u.id));
      const initiatorCount = Math.max(1, Math.ceil(this.active.length * 0.5));
      const initiators = shuffle(this.active.filter((u) => !pendingIds.has(u.id))).slice(
        0,
        initiatorCount,
      );

      const wake = [
        ...pending.map((u) => ({ u, initiate: false })),
        ...initiators.map((u) => ({ u, initiate: true })),
      ];
      if (!wake.length) continue;

      await pool(shuffle(wake), this.config.concurrency, async ({ u, initiate }) => {
        await runTurn(this.world, u, this.directory, clock, { initiate });
      });
    }

    this.world.emit("done", {});
  }
}
