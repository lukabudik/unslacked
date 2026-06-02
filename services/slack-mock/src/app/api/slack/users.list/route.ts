import { NextResponse } from "next/server";
import { listUsers } from "@/lib/store";
import { toSlackUser } from "@/lib/slackShape";

// Mirrors https://api.slack.com/methods/users.list
export async function GET() {
  const users = await listUsers();
  return NextResponse.json({ ok: true, members: users.map(toSlackUser) });
}
