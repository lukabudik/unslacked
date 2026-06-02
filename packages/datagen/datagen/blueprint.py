"""
The company skeleton for "Nimbus Logistics" — a ~100-person logistics/delivery
scale-up. This is the deterministic backbone we author by hand: teams, what each
team OWNS (so personas know how to route), channels, usergroups, and which roles
are high-fan-in "connectors" (the people everyone pings first who then redirect).

The free-running simulation reads this so routing emerges organically: a persona
who doesn't own a topic points at whoever does, per the directory built here.
"""
from __future__ import annotations
from dataclasses import dataclass, field

COMPANY = "Nimbus Logistics"
COMPANY_BLURB = (
    "Nimbus Logistics is a ~100-person logistics/delivery scale-up: same-day "
    "courier delivery, a customer web+mobile app, a merchant platform, and a "
    "warehouse/ops network. Fast-moving, Slack-runs-everything culture."
)


@dataclass
class Team:
    key: str
    name: str
    department: str
    headcount: int
    owns: str          # what this team answers for (drives routing)
    usergroup: str     # @handle
    channels: list[str]  # channel keys members live in
    connector: bool = False  # members tend to be pinged-first routers


@dataclass
class Channel:
    key: str
    name: str
    kind: str          # public_channel | private_channel
    purpose: str
    company_wide: bool = False   # everyone is a member
    extra_teams: list[str] = field(default_factory=list)  # private-channel access


TEAMS: list[Team] = [
    Team("leadership", "Leadership", "Leadership", 4,
         "company strategy, fundraising, board, headcount, final cross-team decisions",
         "exec", ["general", "announcements", "strategy"], connector=True),
    Team("platform", "Platform Engineering", "Engineering", 8,
         "core backend services, public/internal APIs, service infra, deploy pipeline, backend on-call",
         "platform-eng", ["engineering", "platform", "incidents", "deploys"], connector=True),
    Team("payments", "Payments Engineering", "Engineering", 7,
         "billing, payments, invoicing, payouts to couriers/merchants, subscription & pricing logic",
         "payments-eng", ["engineering", "payments", "incidents"]),
    Team("frontend", "Frontend Engineering", "Engineering", 7,
         "customer & merchant web app UI, design-system implementation, web performance",
         "frontend", ["engineering", "frontend", "design"]),
    Team("mobile", "Mobile Engineering", "Engineering", 5,
         "iOS and Android courier+customer apps, mobile releases, push notifications",
         "mobile", ["engineering", "mobile"]),
    Team("data", "Data & ML", "Engineering", 6,
         "data pipelines, the analytics warehouse, dashboards, ETA/routing ML models, experimentation",
         "data-team", ["engineering", "data", "analytics"]),
    Team("sre", "SRE / Infrastructure", "Engineering", 6,
         "reliability, kubernetes, cloud infra, monitoring/alerting, incident command, security infra & access",
         "sre", ["engineering", "incidents", "infra", "security"], connector=True),
    Team("product", "Product", "Product", 8,
         "product roadmap, specs, prioritization, feature scope, release decisions",
         "product", ["product", "roadmap", "general"]),
    Team("design", "Design", "Design", 6,
         "UX/UI design, the design system, brand visuals, user research",
         "design", ["design", "product"]),
    Team("ops", "Operations", "Operations", 6,
         "courier/warehouse operations, logistics process, dispatch, internal operational tooling",
         "ops", ["ops", "general"], connector=True),
    Team("it", "IT & Workplace", "Operations", 4,
         "laptops, accounts & access, VPN, SaaS tool admin, office/workplace IT, onboarding setup",
         "it-helpdesk", ["it-help", "general"], connector=True),
    Team("people", "People & HR", "People", 5,
         "hiring, onboarding, payroll, time off, benefits, HR policy, performance process",
         "people-ops", ["people", "hiring", "general"], connector=True),
    Team("finance", "Finance", "Finance", 5,
         "budgets, expense approvals, vendor & invoice payments, procurement, financial reporting",
         "finance", ["finance", "general"]),
    Team("legal", "Legal & Compliance", "Legal", 3,
         "contracts, compliance, GDPR/data privacy, vendor & customer legal review, DPAs",
         "legal", ["legal", "general"]),
    Team("sales", "Sales", "Sales", 9,
         "enterprise/merchant deals, pipeline, commercial contracts, account management",
         "sales", ["sales", "general"]),
    Team("support", "Customer Support", "Support", 9,
         "customer & merchant tickets, escalations, refunds, customer success",
         "support", ["customer-support", "general"]),
    Team("marketing", "Marketing", "Marketing", 6,
         "brand, campaigns, content, PR, social, lifecycle email",
         "marketing", ["marketing", "general"]),
]

CHANNELS: list[Channel] = [
    Channel("general", "general", "public_channel", "Company-wide chatter & cross-team questions", company_wide=True),
    Channel("announcements", "announcements", "public_channel", "Official company announcements", company_wide=True),
    Channel("random", "random", "public_channel", "Non-work: memes, food, watercooler", company_wide=True),
    Channel("engineering", "engineering", "public_channel", "Eng-wide discussion, RFCs, cross-team eng questions"),
    Channel("platform", "platform", "public_channel", "Platform/backend services & APIs"),
    Channel("payments", "payments", "public_channel", "Billing, payments, payouts"),
    Channel("frontend", "frontend", "public_channel", "Web app frontend"),
    Channel("mobile", "mobile", "public_channel", "iOS/Android apps"),
    Channel("data", "data", "public_channel", "Data pipelines, warehouse, dashboards"),
    Channel("analytics", "analytics", "public_channel", "Metrics, reporting, experiment results"),
    Channel("infra", "infra", "public_channel", "Cloud infra, k8s, monitoring"),
    Channel("incidents", "incidents", "public_channel", "Live incidents & postmortems"),
    Channel("deploys", "deploys", "public_channel", "Deploy coordination & freezes"),
    Channel("security", "security", "private_channel", "Security & access (need-to-know)", extra_teams=["leadership", "legal"]),
    Channel("product", "product", "public_channel", "Product discussion"),
    Channel("roadmap", "roadmap", "public_channel", "Roadmap & prioritization"),
    Channel("design", "design", "public_channel", "Design reviews & assets"),
    Channel("ops", "ops", "public_channel", "Operations & logistics coordination"),
    Channel("it-help", "it-help", "public_channel", "IT helpdesk: access, laptops, tools"),
    Channel("people", "people", "public_channel", "People & HR (general)"),
    Channel("hiring", "hiring", "private_channel", "Hiring & candidate debriefs", extra_teams=["leadership"]),
    Channel("finance", "finance", "private_channel", "Finance & budgets", extra_teams=["leadership"]),
    Channel("legal", "legal", "private_channel", "Legal & compliance", extra_teams=["leadership"]),
    Channel("strategy", "strategy", "private_channel", "Leadership strategy", extra_teams=[]),
    Channel("sales", "sales", "public_channel", "Sales pipeline & deals"),
    Channel("customer-support", "customer-support", "public_channel", "Support queue & escalations"),
    Channel("marketing", "marketing", "public_channel", "Campaigns & content"),
]

CHANNELS_BY_KEY = {c.key: c for c in CHANNELS}
TEAMS_BY_KEY = {t.key: t for t in TEAMS}


def channel_members(team_keys_for_channel: dict[str, list[str]]) -> None:
    """unused placeholder kept for clarity; membership is computed in org.py"""


def build_directory() -> str:
    """The 'who owns what' directory injected into every persona's prompt."""
    lines = [f"COMPANY DIRECTORY — who owns what at {COMPANY}:"]
    for t in TEAMS:
        ug = f" (ping @{t.usergroup})" if t.usergroup else ""
        lines.append(f"- {t.name} [{t.department}]{ug}: {t.owns}")
    lines.append(
        "\nWhen a question isn't your team's area, point the person to the team "
        "above that owns it (name the usergroup or a specific teammate). Don't "
        "guess answers outside your area — routing to the right owner is the norm here."
    )
    return "\n".join(lines)


def total_headcount() -> int:
    return sum(t.headcount for t in TEAMS)
