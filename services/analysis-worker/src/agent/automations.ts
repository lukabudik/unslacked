import Anthropic from "@anthropic-ai/sdk";
import { getMessagesForMining, saveAutomationOpportunity } from "@unslacked/db";

const anthropic = new Anthropic();

interface RawOpportunity {
  taskFingerprint: string;
  description: string;
  verb: string;
  object: string;
  source: string;
  frequency: number;
  distinctRequesters: number;
  distinctAssignees: number;
  requesterPersonas: string[];
  crossSystem: string[];
  duvoFitScore: number;
  estHoursPerMonth: number;
  humanHandoffCount: number;
  duvoAgentBrief: string;
}

const SYSTEM_PROMPT = `You are an automation analyst reviewing Slack messages.
Your job: identify recurring manual tasks that an AI agent (Duvo) could automate.
Focus on tasks that are: repetitive, cross-system, currently done by people manually.
Ignore one-off requests, technical discussions, and conversational messages.`;

const USER_PROMPT = (corpus: string) => `Review these Slack messages and identify 4–8 recurring manual tasks that could be automated.

${corpus}

Return a JSON array (no other text). Each element:
{
  "taskFingerprint": "verb.object.vs.source (lowercase dot-separated, e.g. reconcile.budget.vs.invoices)",
  "description": "Human-readable task title (e.g. Reconcile budget table vs supplier invoices)",
  "verb": "primary action verb (reconcile|pull|update|chase|compile|triage|provision|send|review|export)",
  "object": "what is being acted on",
  "source": "source system or data (e.g. Salesforce, Excel, HR system, #channel-name)",
  "frequency": estimated times this task occurs per month as integer,
  "distinctRequesters": estimated distinct people who request this as integer,
  "distinctAssignees": estimated distinct people who do this work as integer,
  "requesterPersonas": ["department names of requesters, e.g. Finance, Engineering"],
  "crossSystem": ["systems/tools mentioned, e.g. Excel, SAP, Slack, GitHub, Notion, Stripe, Jira"],
  "duvoFitScore": 0.0–1.0 (how automatable: 1.0 = fully repetitive structured task, 0.0 = requires human judgement),
  "estHoursPerMonth": frequency × estimated minutes per task / 60 as float,
  "humanHandoffCount": average number of people the task passes through before completion as integer,
  "duvoAgentBrief": "2–3 sentences describing what the Duvo agent should do, what it reads, what it produces, and where it posts results"
}`;

export async function mineAutomations(): Promise<number> {
  const msgs = await getMessagesForMining(200);
  if (msgs.length === 0) return 0;

  const corpus = msgs
    .map((m) => `[${m.department} · #${m.channelName}]: ${m.text}`)
    .join("\n");

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: USER_PROMPT(corpus) }],
    });
  } catch (err) {
    console.error("[automations] Claude call failed:", err);
    return 0;
  }

  const block = response.content[0];
  if (block.type !== "text") return 0;

  // Strip markdown code fences if the model wrapped the JSON
  const raw = block.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  let opportunities: RawOpportunity[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return 0;
    opportunities = parsed as RawOpportunity[];
  } catch {
    console.error("[automations] Failed to parse JSON response:", raw.slice(0, 200));
    return 0;
  }

  let saved = 0;
  for (const opp of opportunities) {
    if (!opp.taskFingerprint || !opp.description || !opp.duvoAgentBrief) continue;
    try {
      await saveAutomationOpportunity({
        id: crypto.randomUUID(),
        taskFingerprint: opp.taskFingerprint,
        description: opp.description,
        verb: opp.verb ?? "process",
        object: opp.object ?? "",
        source: opp.source ?? "",
        frequency: Math.max(1, Number(opp.frequency) || 1),
        distinctRequesters: Math.max(1, Number(opp.distinctRequesters) || 1),
        distinctAssignees: Math.max(1, Number(opp.distinctAssignees) || 1),
        requesterPersonas: Array.isArray(opp.requesterPersonas) ? opp.requesterPersonas : [],
        crossSystem: Array.isArray(opp.crossSystem) ? opp.crossSystem : [],
        duvoFitScore: Math.min(1, Math.max(0, Number(opp.duvoFitScore) || 0)),
        estHoursPerMonth: Math.max(0, Number(opp.estHoursPerMonth) || 0),
        humanHandoffCount: Math.max(1, Number(opp.humanHandoffCount) || 1),
        duvoAgentBrief: opp.duvoAgentBrief,
      });
      saved++;
    } catch (err) {
      console.error("[automations] Failed to save opportunity:", opp.taskFingerprint, err);
    }
  }

  return saved;
}
