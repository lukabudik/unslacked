"""
Free-running persona simulation. We don't script who routes to whom — each
persona's system prompt knows what they own and that they should redirect
anything else, so routing chains emerge on their own. We only script the
*cadence*: which channels are active, when, and roughly what kind of scene
(a question, an incident, banter…). Personas generate every message.
"""
from __future__ import annotations
import asyncio
import itertools
import random
from datetime import datetime, timedelta, timezone

from . import blueprint as bp
from .llm import acomplete_text
from .personas import build_static_context, build_persona, normalize_mentions
from .topics import SOCIAL_PROMPTS, INCIDENT_PROMPTS, STYLE_NUDGES, ANTI_CLICHE

EMOJIS = ["👍", "✅", "🙏", "🎉", "👀", "🔥", "😂", "💯", "🚀", "😅", "🤝", "❤️", "🫡", "💸", "🧠"]

# scene mix (channel scenes) — routing questions dominate, plus realistic noise
SCENE_WEIGHTS = {
    "routing_question": 5,
    "team_question": 3,
    "status": 2,
    "incident": 1,
    "social": 2,
    "announcement": 1,
}


class Counter:
    def __init__(self): self._c = itertools.count(1)
    def next(self, prefix="M"): return f"{prefix}_{next(self._c):05d}"


def _index(org):
    people = {p["id"]: p for p in org["people"]}
    active = [p for p in org["people"] if p["is_active"] and not p["is_bot"]]
    handle_to_id = {p["handle"]: p["id"] for p in active}
    chan_name_to_id = {c["name"]: f"C_{c['key'].upper()}" for c in org["channels"]}
    usergroups = {g["handle"] for g in org["usergroups"]}
    members: dict[str, list[str]] = {c["key"]: [] for c in org["channels"]}
    for p in active:
        for ck in p["channels"]:
            if ck in members:
                members[ck].append(p["id"])
    return people, active, handle_to_id, chan_name_to_id, usergroups, members


def _transcript(msgs, people):
    out = []
    for m in msgs:
        out.append(f"@{people[m['user_id']]['handle']}: {m['text']}")
    return "\n".join(out)


async def _say(sem, static_ctx, person, channel_name, scene_msgs, people, instruction):
    persona = build_persona(person)
    if scene_msgs:
        user = (f"Thread so far in #{channel_name}:\n{_transcript(scene_msgs, people)}\n\n"
                f"{instruction} If you have nothing useful to add, reply exactly: PASS")
    else:
        user = instruction
    text = await acomplete_text(sem, static_ctx, persona, user, max_tokens=220)
    return text.strip()


def _mk(counter, channel_id, channel_key, person, text, ts, thread_ts, idx):
    return {"id": counter.next(), "channel_id": channel_id, "channel_key": channel_key,
            "user_id": person["id"], "handle": person["handle"], "text": text,
            "thread_ts": thread_ts, "ts": ts}


async def _run_channel_scene(sem, static, ctx, spec, counter, topics):
    people, _active, h2id, cn2id, ugs, members = ctx
    ck = spec["channel_key"]
    cid = f"C_{ck.upper()}"
    cname = bp.CHANNELS_BY_KEY[ck].name
    pool = [people[i] for i in members.get(ck, [])]
    if len(pool) < 2:
        return []
    rng = spec["rng"]
    t = spec["dt"]
    stype = spec["type"]
    style = rng.choice(STYLE_NUDGES)
    reply_instr = f"Reply as yourself — your next Slack message in this thread. {rng.choice(STYLE_NUDGES)}"

    def norm(s):
        return normalize_mentions(s, h2id, cn2id, ugs)

    def topic_for(team_key):
        pool_t = topics.get(team_key) or [bp.TEAMS_BY_KEY[team_key].owns]
        return rng.choice(pool_t)

    msgs = []
    initiator = spec["initiator"]

    if stype in ("routing_question", "team_question"):
        owner_team = spec["owner_team"]
        topic = topic_for(owner_team)
        if stype == "routing_question":
            open_instr = (f'You have a question/need help about: "{topic}". That is the '
                          f"{bp.TEAMS_BY_KEY[owner_team].name} team's area, not yours. Ask about it "
                          f"naturally in #{cname}. {ANTI_CLICHE} {style}")
        else:
            open_instr = (f'You want to discuss/ask about: "{topic}" in #{cname} (your area). '
                          f"{ANTI_CLICHE} {style}")
        first = await _say(sem, static, initiator, cname, [], people, open_instr)
        if not first or first == "PASS":
            return []
        msgs.append(_mk(counter, cid, ck, initiator, norm(first), t, None, 0))
        parent = msgs[0]["id"]

        last = initiator
        spoken = {initiator["id"]}
        for hop in range(spec["max_hops"]):
            nxt = _pick_responder(spec, pool, last, spoken, msgs, people, h2id, owner_team, rng)
            if not nxt:
                break
            t = t + timedelta(minutes=rng.randint(2, 40))
            reply = await _say(sem, static, nxt, cname, msgs, people, reply_instr)
            if not reply or reply == "PASS":
                spoken.add(nxt["id"])
                last = nxt
                continue
            msgs.append(_mk(counter, cid, ck, nxt, norm(reply), t, parent, hop + 1))
            spoken.add(nxt["id"])
            last = nxt
            if nxt["team_key"] == owner_team and hop >= 1:
                break
    else:
        seed_instr = {
            "status": f'Post a short standup-style update about your work on: "{topic_for(initiator["team_key"])}". {ANTI_CLICHE} {style}',
            "incident": f"Post a brief incident update in #{cname}: {rng.choice(INCIDENT_PROMPTS)}. {ANTI_CLICHE} {style}",
            "social": f"Post a light, social Slack message: {rng.choice(SOCIAL_PROMPTS)}. {ANTI_CLICHE} Keep it one casual line.",
            "announcement": f"Post a short, real company/team announcement in #{cname} (you're on leadership). {style}",
        }[stype]
        first = await _say(sem, static, initiator, cname, [], people, seed_instr)
        if not first or first == "PASS":
            return []
        msgs.append(_mk(counter, cid, ck, initiator, norm(first), t, None, 0))
        parent = msgs[0]["id"]
        n_repl = rng.randint(1, 6 if stype == "incident" else 4)
        last = initiator
        for hop in range(n_repl):
            cand = [p for p in pool if p["id"] != last["id"]]
            if not cand:
                break
            nxt = rng.choice(cand)
            t = t + timedelta(minutes=rng.randint(1, 30))
            reply = await _say(sem, static, nxt, cname, msgs, people, reply_instr)
            if not reply or reply == "PASS":
                last = nxt
                continue
            msgs.append(_mk(counter, cid, ck, nxt, norm(reply), t, parent, hop + 1))
            last = nxt

    _add_reactions(msgs, pool, rng)
    return msgs


def _pick_responder(spec, pool, last, spoken, msgs, people, h2id, owner_team, rng):
    # if the last message @mentions someone in the channel, they reply next
    last_text = msgs[-1]["text"]
    mentioned = [pid for h, pid in h2id.items() if f"<@{pid}>" in last_text]
    in_pool = {p["id"] for p in pool}
    ment_in = [pid for pid in mentioned if pid in in_pool and pid != last["id"]]
    if ment_in:
        return people[rng.choice(ment_in)]
    cands = [p for p in pool if p["id"] != last["id"]]
    if not cands:
        return None
    # bias: a connector who hasn't spoken (deflects), or an owner (resolves), else random
    connectors = [p for p in cands if p.get("connector") and p["id"] not in spoken]
    owners = [p for p in cands if p["team_key"] == owner_team]
    r = rng.random()
    if connectors and r < 0.45:
        return rng.choice(connectors)
    if owners and r < 0.75:
        return rng.choice(owners)
    return rng.choice(cands)


def _add_reactions(msgs, pool, rng):
    for m in msgs:
        if rng.random() < 0.35:
            k = rng.randint(1, min(4, len(pool)))
            reactors = rng.sample(pool, k)
            emojis = rng.sample(EMOJIS, min(rng.randint(1, 2), len(EMOJIS)))
            m.setdefault("reactions", [])
            for e in emojis:
                for u in reactors:
                    m["reactions"].append({"user_id": u["id"], "emoji": e})


def _plan(org, weeks, scenes_per_day, ctx, rng):
    people, active, h2id, cn2id, ugs, members = ctx
    # channels with enough members, weighted by liveliness
    live = [c for c in org["channels"] if len(members.get(c["key"], [])) >= 3]
    weight = {}
    for c in live:
        w = len(members[c["key"]])
        if c["key"] in ("general", "engineering", "customer-support", "ops", "random"):
            w *= 2
        weight[c["key"]] = w
    chan_keys = list(weight)
    chan_w = [weight[k] for k in chan_keys]

    stypes = list(SCENE_WEIGHTS)
    sw = list(SCENE_WEIGHTS.values())

    end = datetime(2026, 6, 1, tzinfo=timezone.utc)
    start = end - timedelta(weeks=weeks)
    specs = []
    day = start
    while day < end:
        if day.weekday() < 5:  # weekdays
            for _ in range(scenes_per_day):
                ck = rng.choices(chan_keys, chan_w)[0]
                pool = [people[i] for i in members[ck]]
                stype = rng.choices(stypes, sw)[0]
                # restrict some scene types to apt channels
                if ck == "random":
                    stype = "social"
                if ck == "incidents":
                    stype = "incident"
                if ck == "announcements":
                    stype = "announcement"
                # announcements must come from leadership; otherwise personas refuse
                if stype == "announcement":
                    leaders = [p for p in pool if p["team_key"] == "leadership"]
                    if not leaders:
                        stype = "social" if ck == "random" else "team_question"
                    else:
                        initiator = rng.choice(leaders)
                if stype != "announcement":
                    initiator = rng.choice(pool)
                spec = {"channel_key": ck, "type": stype, "initiator": initiator,
                        "max_hops": rng.randint(2, 6),
                        "dt": day + timedelta(hours=rng.randint(7, 16), minutes=rng.randint(0, 59)),
                        "rng": random.Random(rng.random())}
                if stype == "routing_question":
                    others = [t.key for t in bp.TEAMS if t.key != initiator["team_key"]]
                    spec["owner_team"] = rng.choice(others)
                elif stype == "team_question":
                    spec["owner_team"] = initiator["team_key"]  # asked & answered within team
                specs.append(spec)
        day += timedelta(days=1)
    return specs


async def _one_dm(sem, static, ctx, counter, spec):
    people, active, h2id, cn2id, ugs, members = ctx
    a, partners, topic, drng = spec["a"], spec["partners"], spec["topic"], spec["rng"]
    parts = [a] + partners
    kind = "mpim" if len(parts) > 2 else "im"
    cid = "D_" + "_".join(sorted(p["handle"][:6].upper() for p in parts)) + f"_{spec['i']}"
    channel = {"id": cid, "name": "-".join(p["handle"] for p in parts), "kind": kind, "purpose": None}
    mem = [(cid, p["id"]) for p in parts]
    t = datetime(2026, 5, 1, tzinfo=timezone.utc) + timedelta(days=spec["day"], hours=spec["hour"])

    def norm(s):
        return normalize_mentions(s, h2id, cn2id, ugs)

    msgs = []
    first = await _say(sem, static, a, channel["name"], [], people,
                       f'DM {partners[0]["real_name"]} about: "{topic}" (not your area). {ANTI_CLICHE}')
    if not first or first == "PASS":
        return channel, mem, []
    msgs.append({"id": counter.next(), "channel_id": cid, "channel_key": None, "user_id": a["id"],
                 "handle": a["handle"], "text": norm(first), "thread_ts": None, "ts": t})
    last = a
    for _ in range(spec["n_turns"]):
        nxt = drng.choice([p for p in parts if p["id"] != last["id"]])
        t = t + timedelta(minutes=drng.randint(2, 60))
        reply = await _say(sem, static, nxt, channel["name"], msgs, people, "Reply as yourself in this DM.")
        if reply and reply != "PASS":
            msgs.append({"id": counter.next(), "channel_id": cid, "channel_key": None, "user_id": nxt["id"],
                         "handle": nxt["handle"], "text": norm(reply), "thread_ts": msgs[0]["id"], "ts": t})
        last = nxt
    return channel, mem, msgs


async def _run_dms(sem, static, org, ctx, counter, viewer_id, n, rng):
    people, active, h2id, cn2id, ugs, members = ctx
    specs = []
    for i in range(n):
        group = rng.random() < 0.3
        a = people[viewer_id] if (viewer_id and i < n * 0.4) else rng.choice(active)
        partners = rng.sample([p for p in active if p["id"] != a["id"]], 2 if group else 1)
        owner_team = rng.choice([t.key for t in bp.TEAMS if t.key != a["team_key"]])
        tp = org.get("topics", {}).get(owner_team) or [bp.TEAMS_BY_KEY[owner_team].owns]
        specs.append({"i": i, "a": a, "partners": partners, "topic": rng.choice(tp),
                      "n_turns": rng.randint(1, 3), "day": rng.randint(0, 28),
                      "hour": rng.randint(8, 17), "rng": random.Random(rng.random())})

    res = await asyncio.gather(*[_one_dm(sem, static, ctx, counter, s) for s in specs],
                               return_exceptions=True)
    chans, mem, msgs = [], [], []
    for r in res:
        if isinstance(r, Exception) or not r:
            continue
        c, mm, ms = r
        chans.append(c)
        mem.extend(mm)
        msgs.extend(ms)
    return chans, mem, msgs


async def simulate(org, weeks=6, scenes_per_day=80, concurrency=18, seed=7, dm_count=80):
    rng = random.Random(seed)
    ctx = _index(org)
    static = build_static_context(org)
    topics = org.get("topics", {})
    counter = Counter()
    sem = asyncio.Semaphore(concurrency)

    specs = _plan(org, weeks, scenes_per_day, ctx, rng)
    print(f"  planned {len(specs)} channel scenes over {weeks}w; generating…", flush=True)

    results = await asyncio.gather(
        *[_run_channel_scene(sem, static, ctx, s, counter, topics) for s in specs],
        return_exceptions=True)
    channel_msgs = [m for scene in results if isinstance(scene, list) for m in scene]
    errs = sum(1 for r in results if isinstance(r, Exception))
    if errs:
        print(f"  ({errs} scenes errored and were skipped)", flush=True)

    viewer_id = org.get("viewer_id")
    dm_chans, dm_members, dm_msgs = await _run_dms(sem, static, org, ctx, counter, viewer_id, dm_count, rng)

    return {"channel_messages": channel_msgs, "dm_channels": dm_chans,
            "dm_members": dm_members, "dm_messages": dm_msgs}
