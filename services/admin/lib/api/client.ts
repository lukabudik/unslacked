import * as mock from "./mock";
import * as realdb from "./db";
import type {
  ActivityPoint,
  AutomationOpportunity,
  CommsGraph,
  DeadEndRoute,
  ExpertiseEntry,
  KeyPersonRisk,
  MiddlemanInsight,
  OpenQuestion,
  OrgKpis,
  OverloadEntry,
  PersonaPairRoute,
  RecognitionEntry,
  RecurringQuestion,
  RoutingEvent,
  SentimentSeries,
  ShadowRankEntry,
  SiloCell,
  Topic,
  TopicOwnership,
} from "./types";

// Data source selection:
//   - NEXT_PUBLIC_USE_MOCK=true                → always mock (deterministic faker)
//   - otherwise, if DATABASE_URL is set        → live Neon Postgres via Drizzle
//   - otherwise                                → mock fallback
// This file is the ONLY data entrypoint for components. The DB mapping lives in
// lib/api/db.ts; types in lib/api/types.ts stay stable across sources.
const FORCE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const HAS_DB = !!process.env.DATABASE_URL;
const USE_DB = !FORCE_MOCK && HAS_DB;

export async function getCommsGraph(): Promise<CommsGraph> {
  return USE_DB ? realdb.commsGraph() : mock.commsGraph();
}

export async function getMiddlemen(): Promise<MiddlemanInsight[]> {
  return USE_DB ? realdb.middlemen() : mock.middlemen();
}

export async function getPersonaRoutes(): Promise<PersonaPairRoute[]> {
  return USE_DB ? realdb.personaRoutes() : mock.personaRoutes();
}

export async function getRoutingFeed(): Promise<RoutingEvent[]> {
  return USE_DB ? realdb.routingFeed() : mock.routingFeed();
}

export async function getAutomations(): Promise<AutomationOpportunity[]> {
  return USE_DB ? realdb.automations() : mock.automations();
}

export async function getKpis(): Promise<OrgKpis> {
  return USE_DB ? realdb.kpis() : mock.kpis();
}

export async function getActivityTimeline(): Promise<ActivityPoint[]> {
  return USE_DB ? realdb.activityTimeline() : mock.activityTimeline();
}

export async function getTopics(): Promise<Topic[]> {
  return USE_DB ? realdb.topicsCatalog() : mock.topics();
}

// ── Resilience / Knowledge / Pulse ──────────────────────────
export async function getKeyPersonRisks(): Promise<KeyPersonRisk[]> {
  return USE_DB ? realdb.keyPersonRisks() : mock.keyPersonRisks();
}

export async function getTopicOwnership(): Promise<TopicOwnership[]> {
  return USE_DB ? realdb.topicOwnership() : mock.topicOwnership();
}

export async function getDeadEndRoutes(): Promise<DeadEndRoute[]> {
  return USE_DB ? realdb.deadEndRoutes() : mock.deadEndRoutes();
}

export async function getOpenQuestions(): Promise<OpenQuestion[]> {
  return USE_DB ? realdb.openQuestions() : mock.openQuestions();
}

export async function getExpertise(): Promise<ExpertiseEntry[]> {
  return USE_DB ? realdb.expertise() : mock.expertise();
}

export async function getRecurringQuestions(): Promise<RecurringQuestion[]> {
  return USE_DB ? realdb.recurringQuestions() : mock.recurringQuestions();
}

export async function getSentiment(): Promise<SentimentSeries[]> {
  return USE_DB ? realdb.sentiment() : mock.sentiment();
}

export async function getOverload(): Promise<OverloadEntry[]> {
  return USE_DB ? realdb.overload() : mock.overload();
}

export async function getSilos(): Promise<SiloCell[]> {
  return USE_DB ? realdb.silos() : mock.silos();
}

export async function getRecognition(): Promise<RecognitionEntry[]> {
  return USE_DB ? realdb.recognition() : mock.recognition();
}

export async function getShadowRanks(): Promise<ShadowRankEntry[]> {
  return USE_DB ? realdb.shadowRanks() : mock.shadowRanks();
}
