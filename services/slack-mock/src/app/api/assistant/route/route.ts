import { NextRequest, NextResponse } from "next/server";
import { routeAssistant } from "@/lib/assistant";

/**
 * The assistant endpoint. Triggered when you DM the bot ("who handles X?") and
 * on every message you send. Drops your message + the whole responsibility_claims
 * table into an LLM and returns a structured routing decision:
 *   { status: "route" | "correct" | "unclear", targetUserId?, message }
 *
 * Body: { text: string, recipientIds?: string[] }
 */
export async function POST(req: NextRequest) {
  let body: { text?: string; recipientIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "text_required" }, { status: 400 });

  const result = await routeAssistant({ text, recipientIds: body.recipientIds ?? [] });
  return NextResponse.json(result);
}
