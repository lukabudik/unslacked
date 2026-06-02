import * as mock from "./mock";
import * as realdb from "./db";
import type {
  ActivityPoint,
  AutomationOpportunity,
  CommsGraph,
  MiddlemanInsight,
  OrgKpis,
  PersonaPairRoute,
  RoutingEvent,
  Topic,
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
