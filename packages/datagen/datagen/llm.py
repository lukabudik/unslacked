"""Thin Anthropic wrapper: sync + async, retries, prompt-caching, JSON parsing."""
from __future__ import annotations
import asyncio
import json
import os
import re
import time
from dotenv import load_dotenv
from anthropic import Anthropic, AsyncAnthropic, APIStatusError, APIConnectionError

load_dotenv()

# Cheap model for the persona agents, per the brief.
MODEL = os.environ.get("DATAGEN_MODEL", "claude-haiku-4-5-20251001")

_sync = Anthropic()
_async = AsyncAnthropic()


def _system_blocks(static_ctx: str, persona: str | None):
    """System as cacheable static prefix + per-call persona suffix."""
    blocks = [{"type": "text", "text": static_ctx, "cache_control": {"type": "ephemeral"}}]
    if persona:
        blocks.append({"type": "text", "text": persona})
    return blocks


def complete_text(static_ctx: str, persona: str | None, user: str,
                  max_tokens: int = 400, temperature: float = 1.0) -> str:
    for attempt in range(5):
        try:
            r = _sync.messages.create(
                model=MODEL, max_tokens=max_tokens, temperature=temperature,
                system=_system_blocks(static_ctx, persona),
                messages=[{"role": "user", "content": user}],
            )
            return "".join(b.text for b in r.content if b.type == "text").strip()
        except (APIStatusError, APIConnectionError) as e:
            if attempt == 4:
                raise
            time.sleep(2 ** attempt)
    return ""


async def acomplete_text(sem: asyncio.Semaphore, static_ctx: str, persona: str | None,
                         user: str, history: list[dict] | None = None,
                         max_tokens: int = 350, temperature: float = 1.0) -> str:
    msgs = (history or []) + [{"role": "user", "content": user}]
    async with sem:
        for attempt in range(5):
            try:
                r = await _async.messages.create(
                    model=MODEL, max_tokens=max_tokens, temperature=temperature,
                    system=_system_blocks(static_ctx, persona),
                    messages=msgs,
                )
                return "".join(b.text for b in r.content if b.type == "text").strip()
            except (APIStatusError, APIConnectionError):
                if attempt == 4:
                    return ""
                await asyncio.sleep(2 ** attempt)
    return ""


def parse_json(text: str):
    """Pull a JSON value out of a model response (handles ```json fences / prose)."""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fence:
        text = fence.group(1).strip()
    # find first { or [ and matching tail
    start = min((i for i in (text.find("{"), text.find("[")) if i != -1), default=-1)
    if start == -1:
        raise ValueError(f"no JSON found in: {text[:200]}")
    end = max(text.rfind("}"), text.rfind("]"))
    return json.loads(text[start:end + 1])
