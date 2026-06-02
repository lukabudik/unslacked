import { NextRequest, NextResponse } from "next/server";
import { getHistory } from "@unslacked/db";
import { toSlackMessage } from "@/lib/slackShape";

// Mirrors https://api.slack.com/methods/conversations.history
// Top-level messages for a channel. Pass ?channel=C_ENGINEERING
export async function GET(req: NextRequest) {
  const channel = req.nextUrl.searchParams.get("channel");
  if (!channel) {
    return NextResponse.json({ ok: false, error: "channel_not_found" }, { status: 400 });
  }
  const all = await getHistory(channel);
  // conversations.history returns top-level messages; replies come from .replies
  const top = all.filter((m) => !m.threadTs);
  return NextResponse.json({ ok: true, messages: top.map(toSlackMessage), has_more: false });
}
