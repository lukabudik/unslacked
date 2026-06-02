import Link from "next/link";
import {
  ArrowRight,
  Bus,
  Clock,
  EyeOff,
  HelpCircle,
  Network,
  Repeat,
  ShieldAlert,
  Smile,
  Target,
  Waypoints,
} from "lucide-react";

import {
  getActivityTimeline,
  getAutomations,
  getCommsGraph,
  getKpis,
  getMiddlemen,
  getPersonaRoutes,
  getShadowRanks,
} from "@/lib/api/client";
import { WorkspaceHeader } from "@/components/dashboard/WorkspaceHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { DataTabs } from "@/components/dashboard/DataTabs";
import { ShadowOrgChart } from "@/components/dashboard/ShadowOrgChart";
import { TimelineChart } from "@/components/charts/TimelineChart";
import { PersonaDonut } from "@/components/charts/PersonaDonut";
import { MiddlemenList } from "@/components/charts/MiddlemenList";
import { GraphPreview } from "@/components/graph/GraphPreview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Persona } from "@/lib/api/types";
import type { ReactNode } from "react";

// Always read fresh data from the DB so counts stay live.
export const dynamic = "force-dynamic";

function CardLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

/** A labeled group of stat cards — gives the dashboard clear visual hierarchy. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</div>
    </section>
  );
}

export default async function OverviewPage() {
  const [kpis, graph, middlemen, automations, routes, activity, shadowRanks] =
    await Promise.all([
      getKpis(),
      getCommsGraph(),
      getMiddlemen(),
      getAutomations(),
      getPersonaRoutes(),
      getActivityTimeline(),
      getShadowRanks(),
    ]);

  const volByPersona = new Map<Persona, number>();
  graph.nodes.forEach((n) =>
    volByPersona.set(n.persona, (volByPersona.get(n.persona) ?? 0) + n.messageVolume)
  );
  const personaVolume = [...volByPersona.entries()]
    .map(([persona, volume]) => ({ persona, volume }))
    .sort((a, b) => b.volume - a.volume);

  // Real week-over-week deltas from the trend series (undefined when <2 weeks).
  const pctDelta = (arr: number[]): number | undefined => {
    if (!arr || arr.length < 2) return undefined;
    const prev = arr[arr.length - 2];
    const last = arr[arr.length - 1];
    if (!prev) return undefined;
    return Number((((last - prev) / Math.abs(prev)) * 100).toFixed(1));
  };
  const sepDelta = pctDelta(kpis.trendDegreesOfSeparation);
  const crossFnDelta = pctDelta(kpis.trendCrossFnReach);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    org: "Nimbus",
    peopleMapped: graph.nodes.length,
    teams: graph.clusters.map((c) => ({ team: c.label, size: c.memberIds.length })),
    kpis,
    topConnectors: middlemen.slice(0, 5).map((m) => ({
      person: graph.nodes.find((n) => n.id === m.personId)?.name,
      betweenness: m.betweenness,
    })),
    messagesByPersona: personaVolume,
  };

  return (
    <div className="space-y-6">
      <WorkspaceHeader people={graph.nodes.length} snapshot={snapshot} />

      {/* Network efficiency — real week-over-week trends */}
      <Section title="Network efficiency">
        <StatCard
          label="Avg degrees of sep."
          value={kpis.avgDegreesOfSeparation.toFixed(1)}
          icon={<Waypoints className="h-3.5 w-3.5" />}
          accent="#06b6d4"
          spark={kpis.trendDegreesOfSeparation}
          deltaPct={sepDelta}
          previous="week over week"
          goodDirection="down"
        />
        <StatCard
          label="Cross-team reach"
          value={`${(kpis.crossFnReachDirectPct * 100).toFixed(0)}%`}
          icon={<Target className="h-3.5 w-3.5" />}
          accent="#8b5cf6"
          spark={kpis.trendCrossFnReach.map((v) => v * 100)}
          deltaPct={crossFnDelta}
          previous="cross-dept comms"
        />
        <StatCard
          label="Hours recoverable / mo"
          value={`${kpis.hoursRecoverablePerMonth}h`}
          icon={<Clock className="h-3.5 w-3.5" />}
          accent="#6366f1"
          previous="if automated"
        />
        <StatCard
          label="Relays eliminated"
          value={`${kpis.redundantRelaysEliminated}`}
          icon={<Repeat className="h-3.5 w-3.5" />}
          accent="#10b981"
          previous="routed via middlemen"
        />
      </Section>

      {/* Structure & risk */}
      <Section title="Structure & risk">
        <StatCard
          label="Shadow teams"
          value={`${kpis.shadowTeamsDetected}`}
          icon={<EyeOff className="h-3.5 w-3.5" />}
          accent="#ef4444"
          previous="off the org chart"
        />
        <StatCard
          label="Bus factor"
          value={`${kpis.busFactor}`}
          icon={<Bus className="h-3.5 w-3.5" />}
          accent="#f59e0b"
          previous="key connectors"
        />
        <Link href="/resilience">
          <StatCard
            label="Key-person risk"
            value={`${kpis.keyPersonRiskCount}`}
            icon={<ShieldAlert className="h-3.5 w-3.5" />}
            accent="#ef4444"
            previous="can't-lose people"
          />
        </Link>
        <Link href="/resilience">
          <StatCard
            label="Single points of failure"
            value={`${kpis.singlePointsOfFailure}`}
            icon={<Bus className="h-3.5 w-3.5" />}
            accent="#f59e0b"
            previous="one-owner topics"
          />
        </Link>
      </Section>

      {/* Knowledge & mood */}
      <Section title="Knowledge & mood">
        <Link href="/knowledge">
          <StatCard
            label="Open questions"
            value={`${kpis.openQuestions}`}
            icon={<HelpCircle className="h-3.5 w-3.5" />}
            accent="#06b6d4"
            previous="unanswered / slow"
          />
        </Link>
        <StatCard
          label="Median time to answer"
          value={`${kpis.medianTimeToAnswerHours}h`}
          icon={<Clock className="h-3.5 w-3.5" />}
          accent="#0ea5e9"
          previous="first reply latency"
        />
        <Link href="/pulse">
          <StatCard
            label="Org sentiment"
            value={`${Math.round(((kpis.orgSentiment + 1) / 2) * 100)}`}
            icon={<Smile className="h-3.5 w-3.5" />}
            accent="#10b981"
            previous="reaction positivity"
          />
        </Link>
        <Link href="/knowledge">
          <StatCard
            label="Tribal knowledge"
            value={`${(kpis.tribalKnowledgePct * 100).toFixed(0)}%`}
            icon={<EyeOff className="h-3.5 w-3.5" />}
            accent="#a855f7"
            previous="Q&A hidden in DMs"
          />
        </Link>
      </Section>

      {/* Timeline + persona donut */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Communication activity</CardTitle>
            <p className="text-sm text-muted-foreground">
              Routing events, new group chats, and automation runs per day.
              Pick a period or toggle a series.
            </p>
          </CardHeader>
          <CardContent>
            <TimelineChart data={activity} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messages by persona</CardTitle>
            <p className="text-sm text-muted-foreground">
              Share of volume across functions.
            </p>
          </CardHeader>
          <CardContent>
            <PersonaDonut data={personaVolume} />
          </CardContent>
        </Card>
      </div>

      {/* Graph preview + middlemen */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Communication graph
            </CardTitle>
            <CardLink href="/graph">Open full graph</CardLink>
          </CardHeader>
          <CardContent>
            <GraphPreview graph={graph} height={320} />
            <p className="mt-2 text-xs text-muted-foreground">
              Red nodes are middlemen everything routes through. Dashed outline
              marks a detected shadow team.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Top middlemen</CardTitle>
            <CardLink href="/graph">Inspect</CardLink>
          </CardHeader>
          <CardContent>
            <MiddlemenList middlemen={middlemen.slice(0, 5)} people={graph.nodes} />
          </CardContent>
        </Card>
      </div>

      {/* Shadow org chart */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Shadow org chart</CardTitle>
            <p className="text-sm text-muted-foreground">
              People whose real influence outranks their title — the informal
              backbone of the org.
            </p>
          </div>
          <CardLink href="/graph">Open graph</CardLink>
        </CardHeader>
        <CardContent>
          <ShadowOrgChart entries={shadowRanks} />
        </CardContent>
      </Card>

      {/* Tabbed data table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Workspace data</CardTitle>
          <CardLink href="/automations">View automations</CardLink>
        </CardHeader>
        <CardContent>
          <DataTabs
            automations={automations}
            routes={routes}
            middlemen={middlemen}
            people={graph.nodes}
          />
        </CardContent>
      </Card>
    </div>
  );
}
