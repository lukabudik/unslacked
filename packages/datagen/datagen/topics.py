"""
Concrete seed banks that keep the simulation varied and on-topic. Per-team
question/status topics are LLM-generated at org time (see org.py); the social
and incident banks below are hand-authored for control. Seeding every scene
with a specific, different prompt is what kills the "every message sounds the
same" problem.
"""

SOCIAL_PROMPTS = [
    "share a strong (playful) opinion about a programming language or tool",
    "complain lightly about the office AC / heating",
    "ask where people are grabbing lunch today",
    "share a quick weekend plan or recap",
    "react to a recent football or hockey result",
    "celebrate a small win or a feature that just shipped",
    "describe a meme/gif you'd post right now",
    "ask for a good coffee spot near the office",
    "joke about being in back-to-back meetings",
    "welcome a new joiner warmly",
    "share a useful article, tool, or VS Code extension you found",
    "post Friday / TGIF energy",
    "start a silly poll (tabs vs spaces, pineapple on pizza, etc.)",
    "give an office plant / dog / snack-bar update",
    "thank a specific teammate for help this week",
    "vent lightly about a flaky third-party service",
    "ask if anyone's going to an upcoming meetup or conference",
    "share a quick book or podcast recommendation",
    "ask about the office vs WFH split this week",
    "react to the all-hands / town hall",
    "share a productivity or keyboard-shortcut tip",
    "post about a rough commute or public transport",
    "celebrate a teammate's work anniversary or birthday",
    "ask what everyone's listening to while coding",
]

INCIDENT_PROMPTS = [
    "API p95 latency is spiking and climbing",
    "elevated 5xx errors on the checkout endpoint",
    "the courier payout job is stuck / failing",
    "database connection pool looks exhausted",
    "a deploy seems to have caused a regression — considering rollback",
    "the payment provider is returning errors for a chunk of requests",
    "mobile app crash rate spiked after the latest release",
    "the data pipeline is lagging and dashboards are stale",
    "kubernetes nodes under memory pressure, pods getting evicted",
    "auth/login failures for a subset of users",
    "courier app live GPS tracking is degraded",
    "Redis memory is high and cache hit rate dropped",
]

# small random length/tone variety so messages aren't uniformly long
STYLE_NUDGES = [
    "Keep it to one short line.",
    "Be brief and casual.",
    "Get straight to the point.",
    "A sentence or two, conversational.",
    "Short, you can drop an emoji.",
    "",
]

ANTI_CLICHE = "Don't start with 'just realized' or 'quick question' — vary your opening."
