import { NextRequest, NextResponse } from "next/server";
import { removeReaction } from "@unslacked/db";

// Mirrors https://api.slack.com/methods/reactions.remove
export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") ?? "";
  const body = ct.includes("application/json")
    ? ((await req.json()) as Record<string, unknown>)
    : Object.fromEntries((await req.formData()).entries());

  const messageId = String(body.timestamp ?? body.message ?? "");
  const emoji = String(body.emoji ?? body.name ?? "");
  const user = String(body.user ?? "U_BOT");
  if (!messageId || !emoji) {
    return NextResponse.json({ ok: false, error: "timestamp_and_emoji_required" }, { status: 400 });
  }

  await removeReaction(messageId, user, emoji);
  return NextResponse.json({ ok: true });
}
