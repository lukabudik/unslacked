"""Load a generated org + transcript into Neon (wipe + insert)."""
from __future__ import annotations
import os
import re
import psycopg

MENTION = re.compile(r"<@(U_[A-Z0-9_]+)>")


def _conn():
    url = os.environ["DATABASE_URL"]
    return psycopg.connect(url)


def load(org: dict, sim: dict, verbose: bool = True) -> dict:
    people = org["people"]
    valid_ids = {p["id"] for p in people}

    # ---- channels: blueprint channels + generated DMs ----
    channels = []
    for c in org["channels"]:
        channels.append((f"C_{c['key'].upper()}", c["name"], c["kind"], c["purpose"], None, False))
    for d in sim["dm_channels"]:
        channels.append((d["id"], d["name"], d["kind"], d.get("purpose"), None, False))

    valid_channel_ids = {c[0] for c in channels}
    # ---- channel membership: active people's channels + DM members ----
    members = set()
    for p in people:
        if (p["is_active"] or p["is_bot"]):
            for ck in p["channels"]:
                cid = f"C_{ck.upper()}"
                if cid in valid_channel_ids:
                    members.add((cid, p["id"]))
    for cid, uid in sim["dm_members"]:
        if cid in valid_channel_ids:
            members.add((cid, uid))

    # ---- messages ----
    all_msgs = sim["channel_messages"] + sim["dm_messages"]
    msg_rows, mention_rows, reaction_rows = [], [], []
    seen_mentions, seen_reactions = set(), set()
    for m in all_msgs:
        ts = m["ts"]
        msg_rows.append((m["id"], m["channel_id"], m["user_id"], m["text"], m["thread_ts"], ts))
        for uid in set(MENTION.findall(m["text"])):
            if uid in valid_ids and (m["id"], uid) not in seen_mentions:
                seen_mentions.add((m["id"], uid))
                mention_rows.append((f"{m['id']}:{uid}", m["id"], uid))
        for r in m.get("reactions", []):
            key = (m["id"], r["user_id"], r["emoji"])
            if key not in seen_reactions and r["user_id"] in valid_ids:
                seen_reactions.add(key)
                reaction_rows.append(key)

    user_rows = [(
        p["id"], p["handle"], p["real_name"], p.get("email") or None, p.get("title"),
        p.get("department"), p.get("team") if p.get("team") != "—" else None, p["avatar_color"],
        p.get("status_emoji"), p.get("status_text"), p.get("timezone"),
        p["is_bot"], p["is_active"], p["is_guest"], p["is_admin"],
    ) for p in people]

    ug_rows = [(g["id"], g["handle"], g["name"], g.get("description")) for g in org["usergroups"]]
    ugm_rows = list({(g["id"], uid) for g in org["usergroups"] for uid in g["members"] if uid in valid_ids})

    with _conn() as conn, conn.cursor() as cur:
        if verbose:
            print("  wiping…", flush=True)
        for t in ("reactions", "mentions", "user_group_members", "user_groups",
                  "routing_events", "router_scores", "messages", "channel_members",
                  "channels", "users"):
            cur.execute(f"DELETE FROM {t}")

        cur.executemany(
            "INSERT INTO users (id,name,real_name,email,title,department,team,avatar_color,"
            "status_emoji,status_text,timezone,is_bot,is_active,is_guest,is_admin) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", user_rows)
        cur.executemany("INSERT INTO user_groups (id,handle,name,description) VALUES (%s,%s,%s,%s)", ug_rows)
        cur.executemany("INSERT INTO user_group_members (group_id,user_id) VALUES (%s,%s)", ugm_rows)
        cur.executemany(
            "INSERT INTO channels (id,name,kind,topic,created_by,is_archived) "
            "VALUES (%s,%s,%s,%s,%s,%s)", channels)
        cur.executemany("INSERT INTO channel_members (channel_id,user_id) VALUES (%s,%s)", list(members))
        cur.executemany(
            "INSERT INTO messages (id,channel_id,user_id,text,thread_ts,ts) VALUES (%s,%s,%s,%s,%s,%s)", msg_rows)
        cur.executemany(
            "INSERT INTO mentions (id,message_id,mentioned_user_id) VALUES (%s,%s,%s)", mention_rows)
        cur.executemany(
            "INSERT INTO reactions (message_id,user_id,emoji) VALUES (%s,%s,%s)", reaction_rows)
        conn.commit()

    return {"users": len(user_rows), "usergroups": len(ug_rows), "channels": len(channels),
            "memberships": len(members), "messages": len(msg_rows),
            "mentions": len(mention_rows), "reactions": len(reaction_rows)}
