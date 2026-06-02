import { ShieldAlert, Bus, KeyRound, UserX } from "lucide-react";
import {
  getKeyPersonRisks,
  getTopicOwnership,
  getDeadEndRoutes,
  getKpis,
} from "@/lib/api/client";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskExplorer } from "@/components/resilience/RiskExplorer";
import { ConcentrationHeat } from "@/components/resilience/ConcentrationHeat";
import { DeadEndList } from "@/components/resilience/DeadEndList";

export const dynamic = "force-dynamic";

export default async function ResiliencePage() {
  const [risks, ownership, deadEnds, kpis] = await Promise.all([
    getKeyPersonRisks(),
    getTopicOwnership(),
    getDeadEndRoutes(),
    getKpis(),
  ]);

  const highRisk = risks.filter((r) => r.riskScore >= 0.5).length;
  const staleMentions = deadEnds.reduce((s, d) => s + d.staleMentions, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Risk &amp; Resilience</h2>
        <p className="text-sm text-muted-foreground">
          Who the org can&apos;t afford to lose. Key-person risk blends bridging load with
          sole ownership of knowledge — plus where routing already points at people who
          have left.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Key-person risk"
          value={`${highRisk}`}
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
          accent="#ef4444"
          previous="people scored ≥ 50"
        />
        <StatCard
          label="Single points of failure"
          value={`${kpis.singlePointsOfFailure}`}
          icon={<Bus className="h-3.5 w-3.5" />}
          accent="#f59e0b"
          previous="topics with one owner"
        />
        <StatCard
          label="Knowledge at risk"
          value={`${ownership.filter((t) => t.concentration !== "healthy").length}`}
          icon={<KeyRound className="h-3.5 w-3.5" />}
          accent="#8b5cf6"
          previous="thinly-owned topics"
        />
        <StatCard
          label="Dead-end routes"
          value={`${staleMentions}`}
          icon={<UserX className="h-3.5 w-3.5" />}
          accent="#06b6d4"
          previous="mentions to ex-members"
        />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold">Key-person risk</h3>
        <p className="text-xs text-muted-foreground">
          Select a person to model the blast radius of their departure.
        </p>
        <RiskExplorer risks={risks} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Knowledge concentration</CardTitle>
            <p className="text-sm text-muted-foreground">
              How dominant the top contributor is in each channel. Red = one person carries it.
            </p>
          </CardHeader>
          <CardContent>
            <ConcentrationHeat topics={ownership} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offboarding decay</CardTitle>
            <p className="text-sm text-muted-foreground">
              Deactivated members the org still routes questions to — broken links in the graph.
            </p>
          </CardHeader>
          <CardContent>
            <DeadEndList routes={deadEnds} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
