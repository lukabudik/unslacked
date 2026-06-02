import { NextRequest, NextResponse } from "next/server";
import { getReplies } from "@/lib/store";
import { toSlackMessage } from "@/lib/slackShape";

// Mirrors https://api.slack.com/methods/conversations.replies
// All messages in a thread. Pass ?channel=C_X&ts=M_001
export async function GET(req: NextRequest) {
  const ts = req.nextUrl.searchParams.get("ts");
  if (!ts) {
    return NextResponse.json({ ok: false, error: "thread_not_found" }, { status: 400 });
  }
  const replies = await getReplies(ts);
  return NextResponse.json({ ok: true, messages: replies.map(toSlackMessage), has_more: false });
}
