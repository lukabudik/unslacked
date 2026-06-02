"""
Per-person system prompts. The shared company context (directory, key people,
channels, style) is the cacheable prefix; the persona block is per-agent and is
what makes routing emerge — it tells each person what they own and, crucially,
that they should redirect anything outside their area.
"""
from __future__ import annotations
import re
from . import blueprint as bp


def build_static_context(org: dict) -> str:
    people = {p["id"]: p for p in org["people"]}
    leads = []
    for t in bp.TEAMS:
        lead = next((p for p in org["people"]
                     if p["team_key"] == t.key and p.get("is_lead") and p["is_active"]), None)
        if not lead:
            lead = next((p for p in org["people"] if p["team_key"] == t.key and p["is_active"]), None)
        if lead:
            leads.append(f"- @{lead['handle']} — {lead['title']}, {t.name} (ping @{t.usergroup} for the team)")

    chans = "\n".join(f"- #{c.name}: {c.purpose}" for c in bp.CHANNELS if c.kind == "public_channel")

    return (
        f"{bp.COMPANY_BLURB}\n\n"
        f"{org['directory']}\n\n"
        "KEY PEOPLE — route to the right team's lead or usergroup by @handle:\n"
        + "\n".join(leads) + "\n\n"
        "MAIN CHANNELS:\n" + chans + "\n\n"
        "HOW TO WRITE: You're messaging on Slack at a fast startup. Keep it SHORT "
        "(usually 1 sentence, sometimes 2–3). Casual, lowercase is fine, an emoji "
        "now and then. Mention people as @handle, channels as #channel, teams as "
        "@usergroup-handle. No email greetings or sign-offs, no *narration* of "
        "actions — just what you'd type into the message box. Never invent facts "
        "outside your area; redirect instead."
    )


def build_persona(person: dict) -> str:
    team = bp.TEAMS_BY_KEY.get(person["team_key"])
    owns = team.owns if team else "general team work"
    lines = [
        f"YOU ARE @{person['handle']} ({person['real_name']}), {person['title']} "
        f"on the {person['team']} team ({person['department']}).",
        f"Personality: {person['personality']}. Timezone: {person['timezone']}.",
        f"YOUR AREA (answer these concretely, you know them well): {owns}.",
        "If someone asks about something OUTSIDE your area, do NOT make up an "
        "answer — point them to the owning team/lead/usergroup from the directory.",
    ]
    if person.get("connector"):
        lines.append(
            "You're well-connected and people ping YOU first for all sorts of "
            "things. You usually don't own the deep answer — your move is to "
            "quickly route them to whoever does (name a @handle or @usergroup), "
            "maybe with a one-liner. You rarely solve it yourself."
        )
    if person.get("seniority") == "junior":
        lines.append("You're newish and ask a lot of questions; you often don't know who owns what.")
    return "\n".join(lines)


_MENTION = re.compile(r"(?<![\w/])@([a-z0-9._-]+)", re.I)
_CHANNEL = re.compile(r"(?<![\w])#([a-z0-9._-]+)", re.I)


def normalize_mentions(text: str, handle_to_id: dict[str, str],
                       channel_name_to_id: dict[str, str], usergroups: set[str]) -> str:
    """Convert @handle -> <@U_ID> and #channel -> <#C_KEY>. Leave @usergroup as
    plain text (still a routing signal the backend can read)."""
    def sub_mention(m: re.Match) -> str:
        h = m.group(1).lower().rstrip(".")
        if h in handle_to_id:
            return f"<@{handle_to_id[h]}>"
        return m.group(0)  # usergroup or unknown — leave as-is

    def sub_channel(m: re.Match) -> str:
        name = m.group(1).lower().rstrip(".")
        if name in channel_name_to_id:
            return f"<#{channel_name_to_id[name]}>"
        return m.group(0)

    text = _MENTION.sub(sub_mention, text)
    text = _CHANNEL.sub(sub_channel, text)
    return text
