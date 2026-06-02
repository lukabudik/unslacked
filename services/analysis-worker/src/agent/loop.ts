import Anthropic from "@anthropic-ai/sdk";
import { detectAndSaveInefficiencies } from "@unslacked/db";
import { toolDefinitions, handleTool, buildContext, messagesSeen } from "./tools.js";
import { fetchConversations } from "../slackClient.js";
import { mineAutomations } from "./automations.js";

const anthropic = new Anthropic();

// One conversation per worker keeps each agent's turn count low (3–5 turns).
const CHUNK_SIZE = 3;
// Max workers running simultaneously — caps concurrent Anthropic API calls.
const MAX_CONCURRENT = 15;

const WORKER_SYSTEM_PROMPT = `
You are a routing-pattern analyst. You have been assigned a specific list of Slack conversations to process.

For each conversation ID in your list:
1. Call readConversation(conversationId) to read all messages
2. For each message with replyCount > 0, call readThread(conversationId, messageId) to read the full thread
3. Save what you find:
   - saveHandoff when someone redirects a question to another person instead of answering
   - saveResponsibilityClaim when someone explicitly says "X owns Y" or "ask X about Y" (confidence ~0.9)
   - saveTopicMention when someone answers a topic question authoritatively (confidence ~0.75)

Rules:
- Only use user IDs you actually saw in the messages
- Process every conversation in your list — do not skip any
- Save findings immediately as you go
`.trim();

// Workers don't list conversations and don't synthesise inefficiencies —
// the orchestrator handles both.
const WORKER_TOOLS = toolDefinitions.filter(
  (t) => !["listConversations", "saveInefficiency"].includes(t.name),
);

export interface ProgressEvent {
  worker?: number;
  toolName?: string;
  phase?: "workers" | "aggregating" | "automations";
}

export interface AnalysisResult {
  workers: number;
  toolCallCount: number;
  messagesSeen: number;
  inefficienciesFound: number;
  automationsFound: number;
  summary: string;
}

async function runWorker(
  workerIndex: number,
  conversationIds: string[],
  onProgress?: (event: ProgressEvent) => void,
): Promise<number> {
  console.info(`[worker ${workerIndex}] start conversations=${conversationIds.join(",")}`);
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        `Process these ${conversationIds.length} conversations: ${conversationIds.join(", ")}\n\n` +
        "Read each one and save all routing events and ownership signals you find.",
    },
  ];

  const MAX_TURNS = 25;
  let turn = 0;
  let toolCallCount = 0;

  while (turn < MAX_TURNS) {
    turn++;

    let response: Anthropic.Message;
    try {
      response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: WORKER_SYSTEM_PROMPT,
        tools: WORKER_TOOLS,
        messages,
      });
    } catch (err) {
      console.error(`[worker ${workerIndex}] Anthropic API error on turn ${turn}: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") break;

    if (response.stop_reason === "tool_use") {
      const toolBlocks = response.content.filter((b) => b.type === "tool_use");
      toolCallCount += toolBlocks.length;

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolBlocks.map(async (block) => {
          if (block.type !== "tool_use") {
            return { type: "tool_result" as const, tool_use_id: "", content: "" };
          }
          try { onProgress?.({ worker: workerIndex, toolName: block.name }); } catch { /* ignore */ }
          try {
            const result = await handleTool(block.name, block.input as Record<string, unknown>);
            return { type: "tool_result" as const, tool_use_id: block.id, content: result };
          } catch (err) {
            return {
              type: "tool_result" as const,
              tool_use_id: block.id,
              content: `Error: ${err instanceof Error ? err.message : String(err)}`,
              is_error: true,
            };
          }
        }),
      );

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    console.warn(`[worker ${workerIndex}] unexpected stop_reason=${response.stop_reason}`);
    break;
  }

  console.info(`[worker ${workerIndex}] done turns=${turn} toolCalls=${toolCallCount}`);
  return toolCallCount;
}

export async function runAnalysisLoop(
  since: Date | null,
  onProgress?: (event: ProgressEvent) => void,
): Promise<AnalysisResult> {
  await buildContext(since);

  // List conversations once, outside any agent
  const conversations = await fetchConversations();

  // Chunk into groups for parallel workers
  const chunks: string[][] = [];
  for (let i = 0; i < conversations.length; i += CHUNK_SIZE) {
    chunks.push(conversations.slice(i, i + CHUNK_SIZE).map((c) => c.id));
  }

  onProgress?.({ phase: "workers" });

  // Phase 1: workers read conversations and save raw signals.
  // Run MAX_CONCURRENT at a time to avoid hammering the Anthropic rate limit.
  let toolCallCount = 0;
  for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
    const batch = chunks.slice(i, i + MAX_CONCURRENT);
    console.info(`[loop] batch ${Math.floor(i / MAX_CONCURRENT) + 1}/${Math.ceil(chunks.length / MAX_CONCURRENT)} workers=${batch.length}`);
    const counts = await Promise.all(
      batch.map((ids, j) =>
        runWorker(i + j, ids, onProgress).catch((err) => {
          console.error(`[worker ${i + j}] failed: ${err instanceof Error ? err.stack : String(err)}`);
          return 0;
        })
      )
    );
    toolCallCount += counts.reduce((sum, n) => sum + n, 0);
  }

  // Phase 2: aggregate signals into inefficiencies (pure SQL, no LLM)
  onProgress?.({ phase: "aggregating" });
  const inefficienciesFound = await detectAndSaveInefficiencies();

  // Phase 3: LLM pass over messages to mine automation opportunities
  onProgress?.({ phase: "automations" });
  const automationsFound = await mineAutomations(since);

  return {
    workers: chunks.length,
    toolCallCount,
    messagesSeen,
    inefficienciesFound,
    automationsFound,
    summary: `Analyzed ${conversations.length} conversations across ${chunks.length} parallel workers. Found ${inefficienciesFound} inefficiencies and ${automationsFound} automation opportunities.`,
  };
}
