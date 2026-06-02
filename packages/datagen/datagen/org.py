"""
Build the org: flesh ~100 individuals across the blueprint's teams (names,
personalities, seniority via the LLM), then deterministically assign ids, status
flags, channel membership, and usergroups. Output is a plain dict saved to
out/org.json.
"""
from __future__ import annotations
import hashlib
import json
import re
from pathlib import Path

from . import blueprint as bp
from .llm import complete_text, parse_json

PALETTE = ["#4a154b", "#1264a3", "#2bac76", "#e8912d", "#e01e5a", "#0b8a8f",
           "#cd2553", "#7c3aed", "#0f7b6c", "#c2410c", "#1d4ed8", "#be123c"]


def _color(seed: str) -> str:
    h = int(hashlib.md5(seed.encode()).hexdigest(), 16)
    return PALETTE[h % len(PALETTE)]


def _slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "", name.lower())
    return s or "user"


def _flesh_team(team: bp.Team) -> list[dict]:
    """LLM call: invent this team's people."""
    sys = (
        f"{bp.COMPANY_BLURB}\nYou invent realistic employees for a tech company. "
        "Use varied, believable names (mostly Czech/Central-European, some "
        "international). Return ONLY JSON."
    )
    user = (
        f"Invent exactly {team.headcount} employees on the '{team.name}' team "
        f"({team.department} dept). This team owns: {team.owns}\n\n"
        "Return a JSON array; each object: "
        '{"real_name": str, "handle": str (lowercase, unique-ish, e.g. first name or first.last), '
        '"title": str (realistic for this team; include exactly one lead/head/manager), '
        '"seniority": one of ["lead","senior","mid","junior"], '
        '"personality": str (2-3 vivid traits + a quirk + how they write on Slack, '
        'e.g. "blunt, allergic to meetings, over-uses 🔥, explains things with food analogies"; '
        'make each person distinct), '
        '"timezone": one of ["Europe/Prague","Europe/London","Europe/Berlin","America/New_York"] '
        '(mostly Europe/Prague)}'
    )
    data = parse_json(complete_text(sys, None, user, max_tokens=1800, temperature=1.0))
    if isinstance(data, dict):
        data = data.get("employees") or next((v for v in data.values() if isinstance(v, list)), [])
    return data[: team.headcount]


def build_org(verbose: bool = True) -> dict:
    people: list[dict] = []
    seen_handles: set[str] = set()

    for team in bp.TEAMS:
        if verbose:
            print(f"  fleshing {team.name} ({team.headcount})…", flush=True)
        raw = _flesh_team(team)
        for i, p in enumerate(raw):
            handle = _slug(p.get("handle") or p.get("real_name", f"user{i}"))
            while handle in seen_handles:
                handle += str(i)
            seen_handles.add(handle)
            uid = f"U_{handle.upper()}"
            is_lead = (p.get("seniority") == "lead") or i == 0
            people.append({
                "id": uid,
                "handle": handle,
                "real_name": p.get("real_name", handle.title()),
                "title": p.get("title", "Team Member"),
                "department": team.department,
                "team": team.name,
                "team_key": team.key,
                "seniority": p.get("seniority", "mid"),
                "personality": p.get("personality", "friendly and helpful"),
                "timezone": p.get("timezone", "Europe/Prague"),
                "email": f"{handle}@nimbus.test",
                "avatar_color": _color(uid),
                "is_bot": False,
                "is_active": True,
                "is_guest": False,
                "is_admin": team.key == "it" or team.key == "leadership" or (team.key == "sre" and is_lead),
                "connector": team.connector and (is_lead or team.key in ("it", "ops", "people", "leadership")),
                "usergroup": team.usergroup,
                "channels": _channels_for(team),
                "is_lead": is_lead,
            })

    _apply_status_variation(people)
    people.append(_bot())

    # concrete per-team topic banks so scenes seed specific, varied prompts
    topics = {}
    for team in bp.TEAMS:
        if verbose:
            print(f"  topics for {team.name}…", flush=True)
        topics[team.key] = _topics_for_team(team)

    # the UI "logged-in" user — a central, well-connected person
    viewer = next((p for p in people if p["team_key"] == "leadership" and p.get("is_lead") and p["is_active"]), None)
    viewer = viewer or next(p for p in people if p["connector"] and p["is_active"])

    org = {
        "company": bp.COMPANY,
        "directory": bp.build_directory(),
        "people": people,
        "channels": _channel_defs(),
        "usergroups": _usergroups(people),
        "topics": topics,
        "viewer_id": viewer["id"],
    }
    return org


def _topics_for_team(team: bp.Team) -> list[str]:
    sys = f"{bp.COMPANY_BLURB}\nReturn ONLY a JSON array of strings."
    user = (
        f"List 16 specific, varied, realistic things people at {bp.COMPANY} would ask about "
        f"or raise regarding the {team.name} team's area. This team owns: {team.owns}. "
        "Each item is a concrete question/problem/request in a few words "
        "(e.g. 'refund webhook failing for EU merchants', 'how do I add a coupon code', "
        "'need staging db access', 'p99 on the orders API doubled'). Mix questions, bugs, "
        "and requests. JSON array of strings only."
    )
    try:
        data = parse_json(complete_text(sys, None, user, max_tokens=900, temperature=1.0))
        return [str(x) for x in data][:16] or [team.owns]
    except Exception:
        return [team.owns]


def _channels_for(team: bp.Team) -> list[str]:
    chans = set(team.channels)
    for c in bp.CHANNELS:
        if c.company_wide:
            chans.add(c.key)
        if team.key in c.extra_teams:
            chans.add(c.key)
    return sorted(chans)


def _channel_defs() -> list[dict]:
    return [{"key": c.key, "name": c.name, "kind": c.kind, "purpose": c.purpose,
             "company_wide": c.company_wide} for c in bp.CHANNELS]


def _usergroups(people: list[dict]) -> list[dict]:
    groups = {}
    for t in bp.TEAMS:
        groups[t.usergroup] = {
            "id": f"S_{t.key.upper()}", "handle": t.usergroup, "name": t.name,
            "description": t.owns, "members": [],
        }
    for p in people:
        if p.get("usergroup") in groups and p["is_active"]:
            groups[p["usergroup"]]["members"].append(p["id"])
    return list(groups.values())


def _apply_status_variation(people: list[dict]) -> None:
    """Deterministically deactivate a few (former employees) and mark guests."""
    actives = [p for p in people if not p["is_bot"]]
    # deactivate 4 across different teams — incl. a connector (broken dependency!)
    for idx in (3, 27, 51, 80):
        if idx < len(actives):
            actives[idx]["is_active"] = False
    # a few external guests in support/sales
    guests = [p for p in actives if p["team_key"] in ("support", "sales")][:3]
    for g in guests:
        g["is_guest"] = True


def _bot() -> dict:
    return {
        "id": "U_UNSLACKED_BOT", "handle": "unslacked", "real_name": "Unslacked Bot",
        "title": "Routing Assistant", "department": "—", "team": "—", "team_key": "bot",
        "seniority": "n/a", "personality": "concise assistant", "timezone": "Europe/Prague",
        "email": "", "avatar_color": "#0b8a8f", "is_bot": True, "is_active": True,
        "is_guest": False, "is_admin": False, "connector": False, "usergroup": None,
        "channels": ["general", "announcements"], "is_lead": False,
    }


def save_org(org: dict, path: str = "out/org.json") -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(org, ensure_ascii=False, indent=2))


def load_org(path: str = "out/org.json") -> dict:
    return json.loads(Path(path).read_text())
