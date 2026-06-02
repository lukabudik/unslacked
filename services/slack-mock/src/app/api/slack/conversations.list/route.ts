import { NextResponse } from "next/server";
import { listChannels } from "@unslacked/db";
import { toSlackChannel } from "@/lib/slackShape";

// Mirrors https://api.slack.com/methods/conversations.list
export async function GET() {
  const channels = await listChannels();
  return NextResponse.json({ ok: true, channels: channels.map(toSlackChannel) });
}
