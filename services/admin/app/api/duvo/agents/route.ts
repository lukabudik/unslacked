import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.DUVO_API_KEY;
  const teamId = process.env.DUVO_TEAM_ID;

  if (!apiKey || !teamId) {
    return Response.json(
      { error: "DUVO_API_KEY and DUVO_TEAM_ID must be set" },
      { status: 500 }
    );
  }

  let body: { name: string; brief: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, brief } = body;
  if (!name || !brief) {
    return Response.json({ error: "name and brief are required" }, { status: 400 });
  }

  const payload = {
    name,
    build: {
      name,
      config: {
        version: "v2",
        data: {
          models: {
            agent: { model: "claude-sonnet-4-6" },
            browsing: { provider: "anthropic", model: "claude-sonnet-4-5" },
          },
          input: brief,
        },
      },
    },
  };

  console.log("[duvo] POST agents", { teamId, name });

  const res = await fetch(`https://api.duvo.ai/v2/teams/${teamId}/agents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = rawText;
  }

  if (!res.ok) {
    console.error("[duvo] API error", { status: res.status, body: data, payload });
    const message =
      typeof data === "object" && data !== null
        ? ((data as Record<string, unknown>).message ??
           (data as Record<string, unknown>).error ??
           JSON.stringify(data))
        : String(data);
    return Response.json(
      { error: String(message), detail: data },
      { status: res.status }
    );
  }

  console.log("[duvo] agent created", data);
  return Response.json(data, { status: 201 });
}
