import Link from "next/link";
import {
  ArrowRight,
  Bus,
  Clock,
  EyeOff,
  Network,
  Repeat,
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
} from "@/lib/api/client";
import { WorkspaceHeader } from "@/components/dashboard/WorkspaceHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { DataTabs } from "@/components/dashboard/DataTabs";
import { TimelineChart } from "@/components/charts/TimelineChart";
import { PersonaDonut } from "@/components/charts/PersonaDonut";
import { MiddlemenList } from "@/components/charts/MiddlemenList";
import { GraphPreview } from "@/components/graph/GraphPreview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Persona } from "@/lib/api/types";

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

export default async function OverviewPage() {
  const [kpis, graph, middlemen, automations, routes, activity] =
    await Promise.all([
      getKpis(),
      getCommsGraph(),
      getMiddlemen(),
      getAutomations(),
      getPersonaRoutes(),
      getActivityTimeline(),
    ]);

  const volByPersona = new Map<Persona, number>();
  graph.nodes.forEach((n) =>
    volByPersona.set(n.persona, (volByPersona.get(n.persona) ?? 0) + n.messageVolume)
  );
  const personaVolume = [...volByPersona.entries()]
    .map(([persona, volume]) => ({ persona, volume }))
    .sort((a, b) => b.volume - a.volume);

  const lastSep =
    kpis.trendDegreesOfSeparation[kpis.trendDegreesOfSeparation.length - 1];
  const prevSep =
    kpis.trendDegreesOfSeparation[kpis.trendDegreesOfSeparation.length - 2];
  const sepDelta = ((lastSep - prevSep) / prevSep) * 100;

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

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Hours recoverable / mo"
          value={`${kpis.hoursRecoverablePerMonth}h`}
          icon={<Clock className="h-3.5 w-3.5" />}
          accent="#6366f1"
          deltaPct={18.2}
          previous="vs prev mo"
        />
        <StatCard
          label="Relays eliminated"
          value={`${kpis.redundantRelaysEliminated}`}
          icon={<Repeat className="h-3.5 w-3.5" />}
          accent="#10b981"
          deltaPct={12.0}
          previous="Prev 33"
        />
        <StatCard
          label="Avg degrees of sep."
          value={kpis.avgDegreesOfSeparation.toFixed(1)}
          icon={<Waypoints className="h-3.5 w-3.5" />}
          accent="#06b6d4"
          deltaPct={Number(sepDelta.toFixed(1))}
          previous={`Prev ${prevSep.toFixed(1)}`}
          goodDirection="down"
        />
        <StatCard
          label="Cross-fn reach"
          value={`${(kpis.crossFnReachDirectPct * 100).toFixed(0)}%`}
          icon={<Target className="h-3.5 w-3.5" />}
          accent="#8b5cf6"
          deltaPct={6.4}
          previous="Prev 62%"
        />
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
          previous="single points of failure"
        />
      </div>

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
