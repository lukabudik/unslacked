"""
The Director — scripts the routing *signal* (and, in phase 2, storylines) on top
of the free-running ambient noise the scene engine produces.

For routing it decides the structure deterministically using the org's
who-owns-what — asker -> m1 -> ... -> owner — with a weighted depth distribution
and a per-chain mechanism for the final link:
  • tag      — redirector @-mentions the next person in-thread
  • handoff  — redirector posts a holding line (no @), then DMs the owner
               directly about the same topic (no link to the asker), the owner
               answers in the DM, and the redirector brings the answer back to
               the thread. The implicit, hard-to-detect case.
The LLM only *voices* each beat; edges are guaranteed (post-processed) so chains
are clean and graph-legible, and every chain is emitted as a ground-truth label.
"""
from __future__ import annotations
import asyncio
import random
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from . import blueprint as bp
from .personas import normalize_mentions
from .topics import ANTI_CLICHE
from .simulate import _say, _add_reactions  # shared engine helpers

DEPTHS = [1, 2, 3, 4, 5]          # number of redirectors before the owner answers
DEPTH_WEIGHTS = [30, 30, 22, 12, 6]
HANDOFF_PROB = 0.35


def _ensure_mention(text: str, person: dict) -> str:
    tok = f"<@{person['id']}>"
    return text if tok in text else f"{text} {tok}"


def plan_chains(org, ctx, n, weeks, rng):
    people, active, h2id, cn2id, ugs, members = ctx
    by_team = defaultdict(list)
    for p in active:
        by_team[p["team_key"]].append(p)
    pub = [c for c in org["channels"] if c["kind"] == "public_channel" and len(members.get(c["key"], [])) >= 4]
    weights = [len(members[c["key"]]) for c in pub]
    end = datetime(2026, 6, 1, tzinfo=timezone.utc)
    start = end - timedelta(weeks=weeks)
    span = max(1, (end - start).days - 1)

    specs = []
    for i in range(n):
        c = rng.choices(pub, weights)[0]
        ck = c["key"]
        pool = [people[x] for x in members[ck]]
        asker = rng.choice(pool)
        owner_team = rng.choice([t.key for t in bp.TEAMS
                                 if t.key != asker["team_key"] and by_team.get(t.key)])
        owners = by_team[owner_team]
        leads = [p for p in owners if p.get("is_lead")]
        owner = rng.choice(leads) if (leads and rng.random() < 0.5) else rng.choice(owners)

        eligible = [p for p in pool if p["team_key"] != owner_team and p["id"] != asker["id"]]
        connectors = [p for p in active if p.get("connector")
                      and p["team_key"] != owner_team and p["id"] != asker["id"]]
        cand = eligible if len(eligible) >= 1 else connectors
        if not cand:
            continue
        # mix channel members + connectors, connectors first for variety of routers
        merged = list({p["id"]: p for p in (connectors + eligible)}.values())
        merged.sort(key=lambda p: (0 if p.get("connector") else 1, rng.random()))
        N = min(rng.choices(DEPTHS, DEPTH_WEIGHTS)[0], len(merged))
        mids = merged[:N] if N else [cand[0]]

        day = start + timedelta(days=rng.randint(0, span))
        while day.weekday() >= 5:
            day += timedelta(days=1)
        specs.append({
            "idx": i, "channel_key": ck, "asker": asker, "owner": owner, "owner_team": owner_team,
            "intermediaries": mids,
            "topic": rng.choice(org["topics"].get(owner_team) or [bp.TEAMS_BY_KEY[owner_team].owns]),
            "mechanism": "handoff" if rng.random() < HANDOFF_PROB else "tag",
            "dt": day + timedelta(hours=rng.randint(7, 16), minutes=rng.randint(0, 59)),
            "rng": random.Random(rng.random()),
        })
    return specs


async def run_chain(sem, static, ctx, spec, counter):
    people, active, h2id, cn2id, ugs, members = ctx
    crng = spec["rng"]
    ck = spec["channel_key"]
    cid = f"C_{ck.upper()}"
    cname = bp.CHANNELS_BY_KEY[ck].name
    asker, owner, mids, topic = spec["asker"], spec["owner"], spec["intermediaries"], spec["topic"]

    def norm(s):
        return normalize_mentions(s, h2id, cn2id, ugs)

    def mk(channel_id, ck_key, person, text, thread_ts, ts):
        return {"id": counter.next(), "channel_id": channel_id, "channel_key": ck_key,
                "user_id": person["id"], "handle": person["handle"], "text": text,
                "thread_ts": thread_ts, "ts": ts}

    msgs, dm_channels, dm_members = [], [], []
    label = {"topic": topic, "channel": cid, "asker": asker["id"], "owner": owner["id"],
             "mechanism": spec["mechanism"], "hops": [], "message_ids": []}
    t = spec["dt"]

    q = await _say(sem, static, asker, cname, [], people,
                   f'You have a question about: "{topic}". You don\'t know who owns it. '
                   f"Ask it in #{cname}. {ANTI_CLICHE} one or two lines.", allow_pass=False)
    if not q or q == "PASS":
        return None
    root = mk(cid, ck, asker, norm(q), None, t)
    msgs.append(root)
    parent = root["id"]
    label["message_ids"].append(root["id"])

    reached_owner = False
    for i, rdr in enumerate(mids):
        nxt = mids[i + 1] if i + 1 < len(mids) else owner
        t = t + timedelta(minutes=crng.randint(3, 90))
        final_link = nxt is owner

        if final_link and spec["mechanism"] == "handoff":
            hold = await _say(sem, static, rdr, cname, msgs, people,
                              f'Someone asked about "{topic}" — not your area. Post ONE short line '
                              "saying you'll find the right person / look into it. Do NOT name or @ anyone.", allow_pass=False)
            mh = mk(cid, ck, rdr, norm(hold or "let me find out who owns this and get back to you"), parent, t)
            msgs.append(mh)
            label["message_ids"].append(mh["id"])
            label["hops"].append({"from": rdr["id"], "to": owner["id"], "mechanism": "handoff", "msg": mh["id"]})

            dmid = "D_" + "_".join(sorted([rdr["handle"][:6].upper(), owner["handle"][:6].upper()])) + f"_chain{spec['idx']}"
            dm_channels.append({"id": dmid, "name": f"{rdr['handle']}-{owner['handle']}", "kind": "im", "purpose": None})
            dm_members += [(dmid, rdr["id"]), (dmid, owner["id"])]
            dname = f"{rdr['handle']}-{owner['handle']}"

            t = t + timedelta(minutes=crng.randint(2, 30))
            out = await _say(sem, static, rdr, dname, [], people,
                             f'Write the Slack message you\'d send @{owner["handle"]} asking them to take a '
                             f'question about "{topic}" (it\'s their area). Just the message text — don\'t '
                             "mention who originally asked, don't narrate.", allow_pass=False)
            mo = mk(dmid, None, rdr, _ensure_mention(norm(out or f"hey, got a q about {topic} — your area?"), owner), None, t)
            msgs.append(mo)
            label["message_ids"].append(mo["id"])

            t = t + timedelta(minutes=crng.randint(5, 120))
            ans = await _say(sem, static, owner, dname, [mo], people,
                             f'Reply in this DM: "{topic}" IS your area — answer concretely / agree to take it.', allow_pass=False)
            ma = mk(dmid, None, owner, norm(ans or "yep that's mine, i'll take it"), mo["id"], t)
            msgs.append(ma)
            label["message_ids"].append(ma["id"])

            t = t + timedelta(minutes=crng.randint(5, 60))
            back = await _say(sem, static, rdr, cname, [root], people,
                              f'Back in #{cname}: you found @{owner["handle"]} owns "{topic}" and is handling it. '
                              "Short update tagging them.", allow_pass=False)
            mb = mk(cid, ck, rdr, _ensure_mention(norm(back or "found the right owner"), owner), parent, t)
            msgs.append(mb)
            label["message_ids"].append(mb["id"])
            reached_owner = True
            break
        else:
            rd = await _say(sem, static, rdr, cname, msgs, people,
                            f'Someone asked about "{topic}" in this thread. It\'s not your area — point them to '
                            f'@{nxt["handle"]} who owns/handles it. Mention @{nxt["handle"]}, one line, '
                            "don't answer it yourself.", allow_pass=False)
            mr = mk(cid, ck, rdr, _ensure_mention(norm(rd or f"that's @{nxt['handle']}'s area"), nxt), parent, t)
            msgs.append(mr)
            label["message_ids"].append(mr["id"])
            label["hops"].append({"from": rdr["id"], "to": nxt["id"], "mechanism": "tag", "msg": mr["id"]})

    if not reached_owner:
        t = t + timedelta(minutes=crng.randint(5, 120))
        ans = await _say(sem, static, owner, cname, msgs, people,
                         f'You were pointed to about "{topic}" — this IS your area. Answer concretely. {ANTI_CLICHE}', allow_pass=False)
        ma = mk(cid, ck, owner, norm(ans or "yeah this is mine — here's the deal"), parent, t)
        msgs.append(ma)
        label["message_ids"].append(ma["id"])
        label["hops"].append({"from": None, "to": owner["id"], "mechanism": "answer", "msg": ma["id"]})

    _add_reactions(msgs, [asker, owner] + mids, crng)
    return {"messages": msgs, "dm_channels": dm_channels, "dm_members": dm_members, "label": label}
