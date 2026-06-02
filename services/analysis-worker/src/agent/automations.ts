import Anthropic from "@anthropic-ai/sdk";
import {
  getMessagesForMining,
  saveAutomationOpportunity,
  groundTask,
  getResponsibilityOwners,
  type TopicOwner,
} from "@unslacked/db";

const anthropic = new Anthropic();

interface RawOpportunity {
  taskFingerprint: string;
  description: string;
  verb: string;
  object: string;
  source: string;
  keywords: string[];          // distinctive terms to verify the task against the corpus
  distinctAssignees: number;
  requesterPersonas: string[];
  crossSystem: string[];
  duvoFitScore: number;
  estMinutesPerTask: number;   // per-occurrence effort; hours/month derived from REAL frequency
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
  "source": "source system or data (e.g. Salesforce, Excel, HR system, #channel-name), or \\"\\" if unclear",
  "keywords": ["3–6 distinctive lowercase words/phrases that would appear in messages about THIS task — used to verify it against the real message corpus, so make them specific (e.g. \\"payout\\", \\"reconcile\\", \\"invoice\\")"],
  "distinctAssignees": estimated distinct people who do this work as integer,
  "requesterPersonas": ["department names of requesters, e.g. Finance, Engineering"],
  "crossSystem": ["systems/tools mentioned, e.g. Excel, SAP, Slack, GitHub, Notion, Stripe, Jira"],
  "duvoFitScore": 0.0–1.0 (how automatable: 1.0 = fully repetitive structured task, 0.0 = requires human judgement),
  "estMinutesPerTask": estimated minutes one occurrence of this task takes a person, as integer,
  "humanHandoffCount": average number of people the task passes through before completion as integer,
  "duvoAgentBrief": "2–3 sentences describing what the Duvo agent should do, what it reads, what it produces, and where it posts results"
}`;

/** Match a task to its likely domain owner via responsibility_claims. */
function matchOwner(
  opp: RawOpportunity,
  owners: TopicOwner[],
): { topic: string; userId: string } | null {
  const hay = `${opp.verb} ${opp.object} ${(opp.keywords ?? []).join(" ")}`.toLowerCase();
  for (const o of owners) {
    const terms = `${o.topic},${o.keywords}`
      .toLowerCase()
      .split(/[,\s]+/)
      .filter((t) => t.length >= 4);
    if (terms.some((t) => hay.includes(t))) return { topic: o.topic, userId: o.userId };
  }
  return null;
}

export async function mineAutomations(since?: Date | null): Promise<number> {
  const msgs = await getMessagesForMining(200, since);
  if (msgs.length === 0) return 0;

  const corpus = msgs
    .map((m) => `[${m.department} · #${m.channelName}]: ${m.text}`)
    .join("\n");

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
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

  // Owner index for enrichment (from Tom's responsibility_claims).
  const owners = await getResponsibilityOwners();

  let saved = 0;
  for (const opp of opportunities) {
    if (!opp.taskFingerprint || !opp.description || !opp.duvoAgentBrief) continue;
    try {
      // Ground the LLM's proposal against the real corpus: replace guessed
      // frequency / requesters / personas with actual counts where we find matches.
      const terms = [
        ...(Array.isArray(opp.keywords) ? opp.keywords : []),
        ...(opp.object ?? "").split(/\s+/),
      ];
      const ground = await groundTask(terms);
      const grounded = ground.frequency > 0;

      const frequency = grounded ? ground.frequency : 1;
      const distinctRequesters = grounded ? Math.max(1, ground.distinctRequesters) : 1;
      const requesterPersonas =
        grounded && ground.requesterPersonas.length
          ? ground.requesterPersonas
          : Array.isArray(opp.requesterPersonas)
            ? opp.requesterPersonas
            : [];
      const minutes = Math.max(0, Number(opp.estMinutesPerTask) || 0);
      const estHoursPerMonth = Math.round(((frequency * minutes) / 60) * 10) / 10;

      const owner = matchOwner(opp, owners);

      await saveAutomationOpportunity({
        id: crypto.randomUUID(),
        taskFingerprint: opp.taskFingerprint,
        description: opp.description,
        verb: opp.verb ?? "process",
        object: opp.object ?? "",
        source: opp.source && opp.source.trim() ? opp.source.trim() : null,
        frequency,
        distinctRequesters,
        distinctAssignees: Math.max(1, Number(opp.distinctAssignees) || 1),
        requesterPersonas,
        crossSystem: Array.isArray(opp.crossSystem) ? opp.crossSystem : [],
        duvoFitScore: Math.min(1, Math.max(0, Number(opp.duvoFitScore) || 0)),
        estHoursPerMonth,
        humanHandoffCount: Math.max(1, Number(opp.humanHandoffCount) || 1),
        duvoAgentBrief: opp.duvoAgentBrief,
        evidence: ground.evidence,
        topic: owner?.topic ?? null,
        ownerUserId: owner?.userId ?? null,
      });
      saved++;
    } catch (err) {
      console.error("[automations] Failed to save opportunity:", opp.taskFingerprint, err);
    }
  }

  return saved;
}
