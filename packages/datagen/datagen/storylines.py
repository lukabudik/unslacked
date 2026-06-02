"""
Storylines — multi-beat arcs that give the workspace continuity. The LLM
outlines ~15 arcs (a launch, an incident→postmortem→fix, a hire, a reorg, a
vendor migration, a big debate). Each arc has a fixed cast and 4–6 beats spread
across the 6 weeks; every beat thread gets the arc's *running state* injected, so
later messages reference earlier events and you can read it as a story.
"""
from __future__ import annotations
import asyncio
import random
from datetime import datetime, timedelta, timezone

from . import blueprint as bp
from .personas import normalize_mentions
from .topics import ANTI_CLICHE
from .llm import complete_text, parse_json
from .simulate import _say, _add_reactions

END = datetime(2026, 6, 1, tzinfo=timezone.utc)


def _gen_outlines(org, n):
    chans = [c["key"] for c in org["channels"] if c["kind"] in ("public_channel", "private_channel")]
    sys = f"{bp.COMPANY_BLURB}\nYou design realistic ongoing workplace storylines. Return ONLY a JSON array."
    user = (
        f"Invent {n} distinct ongoing storylines that unfold over ~6 weeks at this company — arcs you could "
        "follow across many Slack messages. Mix kinds: product launches, incidents + postmortems, hiring & "
        "onboarding, reorgs, vendor/infra migrations, and big decisions/debates. Each object: "
        '{"title": str, "kind": str, "channel": one of ' + str(chans) + ', '
        '"beats": [5 short strings in chronological order, each describing what happens at that stage]}. '
        "Make beats build on each other so it reads as one continuous arc (kickoff → progress → complication "
        "→ resolution → follow-up). JSON array only."
    )
    try:
        data = parse_json(complete_text(sys, None, user, max_tokens=3000, temperature=1.0))
        return [o for o in data if isinstance(o, dict) and o.get("beats")][:n]
    except Exception:
        return []


async def _run_storyline(sem, static, ctx, ck, cast, outline, start, weeks, counter, rng):
    people, active, h2id, cn2id, ugs, members = ctx
    cid = f"C_{ck.upper()}"
    cname = bp.CHANNELS_BY_KEY[ck].name
    beats = outline["beats"][:6]
    span = (END - start).days

    def norm(s):
        return normalize_mentions(s, h2id, cn2id, ugs)

    def mk(person, text, thread_ts, ts):
        return {"id": counter.next(), "channel_id": cid, "channel_key": ck, "user_id": person["id"],
                "handle": person["handle"], "text": text, "thread_ts": thread_ts, "ts": ts}

    msgs = []
    state: list[str] = []
    label = {"title": outline["title"], "kind": outline.get("kind"), "channel": cid, "cast": [p["id"] for p in cast], "beats": []}

    for bi, beat in enumerate(beats):
        day = start + timedelta(days=int(span * (bi + 0.5) / len(beats)))
        while day.weekday() >= 5:
            day += timedelta(days=1)
        t = day + timedelta(hours=rng.randint(8, 17), minutes=rng.randint(0, 59))
        initiator = rng.choice(cast)
        so_far = "\n".join(f"- {s}" for s in state) if state else "(this is the start of the arc)"
        title = outline["title"]
        kickoff = (
            f"You are in an ongoing storyline at work: {title!r}.\n"
            f"What has happened so far:\n{so_far}\n"
            f"Now, this is the next development: {beat}\n"
            f"Post the Slack message that moves this forward in #{cname}, referencing earlier "
            f"context naturally if relevant. {ANTI_CLICHE}")
        first = await _say(sem, static, initiator, cname, [], people, kickoff, allow_pass=False)
        if not first or first == "PASS":
            continue
        root = mk(initiator, norm(first), None, t)
        beat_msgs = [root]
        msgs.append(root)
        last = initiator
        for _ in range(rng.randint(1, 4)):
            cand = [p for p in cast if p["id"] != last["id"]]
            if not cand:
                break
            nxt = rng.choice(cand)
            t = t + timedelta(minutes=rng.randint(3, 50))
            reply = await _say(sem, static, nxt, cname, beat_msgs, people,
                               f'Continue this "{outline["title"]}" thread — your reply.')
            if reply and reply != "PASS":
                m = mk(nxt, norm(reply), root["id"], t)
                beat_msgs.append(m)
                msgs.append(m)
            last = nxt
        _add_reactions(beat_msgs, cast, rng)
        label["beats"].append({"beat": beat, "message_ids": [m["id"] for m in beat_msgs]})
        state.append(beat)

    return {"messages": msgs, "label": label}


async def run_storylines(sem, static, ctx, org, counter, n, weeks, rng):
    people, active, h2id, cn2id, ugs, members = ctx
    outlines = _gen_outlines(org, n)
    print(f"  weaving {len(outlines)} storylines…", flush=True)
    start = END - timedelta(weeks=weeks)
    pub = [c["key"] for c in org["channels"] if c["kind"] == "public_channel" and len(members.get(c["key"], [])) >= 3]

    tasks = []
    for o in outlines:
        ck = o.get("channel") if o.get("channel") in members and len(members.get(o.get("channel"), [])) >= 3 else rng.choice(pub)
        pool = [people[x] for x in members.get(ck, [])]
        if len(pool) < 2:
            continue
        cast = rng.sample(pool, min(len(pool), rng.randint(3, 5)))
        tasks.append(_run_storyline(sem, static, ctx, ck, cast, o, start, weeks, counter, rng))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    msgs, labels = [], []
    for r in results:
        if isinstance(r, Exception) or not r:
            continue
        msgs.extend(r["messages"])
        labels.append(r["label"])
    return msgs, labels
