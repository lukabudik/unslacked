import { NextRequest, NextResponse } from "next/server";
import { addMessage } from "@unslacked/db";

// Mirrors https://api.slack.com/methods/chat.postMessage
// Body: { channel, text, thread_ts?, user? }. `user` defaults to the bot so the
// routing assistant can post. Accepts JSON or form-encoded bodies.
export async function POST(req: NextRequest) {
  const body = await readBody(req);
  const channel = body.channel;
  const text = body.text;
  if (!channel || !text) {
    return NextResponse.json({ ok: false, error: "channel_and_text_required" }, { status: 400 });
  }

  const msg = await addMessage({
    channelId: String(channel),
    userId: String(body.user ?? "U_BOT"),
    text: String(text),
    threadTs: body.thread_ts ? String(body.thread_ts) : null,
  });

  return NextResponse.json({
    ok: true,
    channel,
    ts: msg.id,
    message: { type: "message", user: msg.userId, text: msg.text, ts: msg.ts, thread_ts: msg.threadTs ?? undefined },
  });
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await req.json()) as Record<string, unknown>;
  const form = await req.formData();
  return Object.fromEntries(form.entries());
}
