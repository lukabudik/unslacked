import Link from "next/link";
import {
  ArrowRight,
  Bus,
  Clock,
  EyeOff,
  HelpCircle,
  Repeat,
  ShieldAlert,
  Smile,
  Target,
  Waypoints,
} from "lucide-react";

import {
  getActivityTimeline,
  getCommsGraph,
  getKpis,
  getMiddlemen,
} from "@/lib/api/client";
import { WorkspaceHeader } from "@/components/dashboard/WorkspaceHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { TimelineChart } from "@/components/charts/TimelineChart";
import { PersonaDonut } from "@/components/charts/PersonaDonut";
import { MiddlemenList } from "@/components/charts/MiddlemenList";
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
      <div className="flex items-center gap-2">
        <span className="h-3.5 w-1 rounded-full bg-primary/70" aria-hidden />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</div>
    </section>
  );
}

export default async function OverviewPage() {
  const [kpis, graph, middlemen, activity] = await Promise.all([
    getKpis(),
    getCommsGraph(),
    getMiddlemen(),
    getActivityTimeline(),
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
    <div className="space-y-8">
      <WorkspaceHeader people={graph.nodes.length} snapshot={snapshot} />

      {/* Headline efficiency KPIs — real week-over-week trends */}
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

      {/* Featured band — activity timeline + persona/middlemen side panel */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Communication activity</CardTitle>
            <p className="text-sm text-muted-foreground">
              Messages, thread replies, and @-mentions per day. Pick a period or
              toggle a series.
            </p>
          </CardHeader>
          <CardContent>
            <TimelineChart data={activity} />
          </CardContent>
        </Card>

        <div className="grid gap-5">
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
      </div>

      {/* Supporting metrics */}
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
        <StatCard
          label="Key-person risk"
          value={`${kpis.keyPersonRiskCount}`}
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
          accent="#ef4444"
          previous="can't-lose people"
        />
        <StatCard
          label="Single points of failure"
          value={`${kpis.singlePointsOfFailure}`}
          icon={<Bus className="h-3.5 w-3.5" />}
          accent="#f59e0b"
          previous="one-owner topics"
        />
      </Section>

      <Section title="Knowledge & mood">
        <StatCard
          label="Open questions"
          value={`${kpis.openQuestions}`}
          icon={<HelpCircle className="h-3.5 w-3.5" />}
          accent="#06b6d4"
          previous="unanswered / slow"
        />
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
        <StatCard
          label="Tribal knowledge"
          value={`${(kpis.tribalKnowledgePct * 100).toFixed(0)}%`}
          icon={<EyeOff className="h-3.5 w-3.5" />}
          accent="#a855f7"
          previous="Q&A hidden in DMs"
        />
      </Section>
    </div>
  );
}
