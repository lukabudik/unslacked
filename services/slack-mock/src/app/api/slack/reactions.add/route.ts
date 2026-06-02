import { NextRequest, NextResponse } from "next/server";
import { addReaction } from "@/lib/store";

// Mirrors https://api.slack.com/methods/reactions.add
// Body: { timestamp (message id), emoji (unicode), user? }. Slack uses `name`
// (shortcode); we accept `emoji` (unicode) and fall back to `name`.
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

  await addReaction(messageId, user, emoji);
  return NextResponse.json({ ok: true });
}
