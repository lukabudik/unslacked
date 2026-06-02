#!/usr/bin/env python
"""
Generate a realistic enterprise Slack dataset via free-running persona agents
and load it into Neon.

  python generate.py --pilot                 # tiny run, no DB (validate)
  python generate.py --pilot --load          # tiny run, into Neon
  python generate.py --weeks 6 --load        # full run
  python generate.py --reuse-org --weeks 6 --load   # skip org regen
"""
from __future__ import annotations
import argparse
import asyncio
import json
import time
from pathlib import Path

from datagen import org as org_mod
from datagen.simulate import simulate


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weeks", type=int, default=6)
    ap.add_argument("--scenes-per-day", type=int, default=80)
    ap.add_argument("--dm-count", type=int, default=120)
    ap.add_argument("--chains", type=int, default=400, help="directed routing chains (the signal)")
    ap.add_argument("--storylines", type=int, default=16, help="multi-beat continuity arcs")
    ap.add_argument("--concurrency", type=int, default=18)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--load", action="store_true", help="insert into Neon")
    ap.add_argument("--reuse-org", action="store_true", help="reuse out/org.json")
    ap.add_argument("--pilot", action="store_true", help="tiny preset for validation")
    args = ap.parse_args()

    if args.pilot:
        args.weeks, args.scenes_per_day, args.dm_count = 1, 6, 6
        args.chains, args.storylines = 20, 0

    t0 = time.time()
    if args.reuse_org and Path("out/org.json").exists():
        org = org_mod.load_org()
        print(f"reused org: {len(org['people'])} people")
    else:
        print(f"building org (~{org_mod.bp.total_headcount()} people)…")
        org = org_mod.build_org()
        org_mod.save_org(org)
        print(f"org: {len(org['people'])} people, viewer={org['viewer_id']}")

    sim = asyncio.run(simulate(org, weeks=args.weeks, scenes_per_day=args.scenes_per_day,
                               concurrency=args.concurrency, seed=args.seed, dm_count=args.dm_count,
                               n_chains=args.chains, n_storylines=args.storylines))
    Path("out/transcript.json").write_text(json.dumps(sim, default=str, ensure_ascii=False))
    labels = sim.get("labels", {})
    Path("out/truth.json").write_text(json.dumps(labels, default=str, ensure_ascii=False, indent=2))
    n_msgs = len(sim["channel_messages"]) + len(sim["dm_messages"])
    print(f"generated {n_msgs} messages ({len(sim['dm_channels'])} DMs, "
          f"{len(labels.get('chains', []))} chains, {len(labels.get('storylines', []))} storylines) "
          f"in {time.time()-t0:.0f}s")

    if args.load:
        from datagen.load import load
        stats = load(org, sim)
        print("loaded into Neon:", json.dumps(stats))
        print("VIEWER_ID =", org["viewer_id"])
    else:
        print("(--load not set; nothing written to Neon)")


if __name__ == "__main__":
    main()
