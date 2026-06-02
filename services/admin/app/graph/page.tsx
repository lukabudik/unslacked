import { Network, Users, ShieldAlert, Share2 } from "lucide-react";
import {
  getCommsGraph,
  getMiddlemen,
  getTopics,
  getPersonaRoutes,
  getKeyPersonRisks,
  getKpis,
} from "@/lib/api/client";
import { GraphExplorer } from "@/components/graph/GraphExplorer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { PersonaBadge } from "@/components/persona-badge";
import { StatCard } from "@/components/dashboard/StatCard";

// Always read fresh data from the DB so counts stay live.
export const dynamic = "force-dynamic";

export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const [graph, middlemen, topics, personaRoutes, risks, kpis, sp] = await Promise.all([
    getCommsGraph(),
    getMiddlemen(),
    getTopics(),
    getPersonaRoutes(),
    getKeyPersonRisks(),
    getKpis(),
    searchParams,
  ]);

  const teams = graph.clusters.length;
  const topConnector = middlemen[0];
  const topPerson = graph.nodes.find((n) => n.id === topConnector?.personId);
  const focus =
    sp.focus && graph.nodes.some((n) => n.id === sp.focus) ? sp.focus : undefined;

  const connectors = middlemen
    .slice(0, 8)
    .flatMap((m) => {
      const person = graph.nodes.find((n) => n.id === m.personId);
      return person ? [{ ...m, person }] : [];
    });

  const topRisks = risks.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Communication Graph
        </h2>
        <p className="text-sm text-muted-foreground">
          Who routes whom. Betweenness coloring reveals bottlenecks — red glow
          means a person sits on the most shortest paths between others.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="People mapped"
          value={`${graph.nodes.length}`}
          icon={<Users className="h-3.5 w-3.5" />}
          accent="#06b6d4"
          previous={`across ${teams} teams`}
        />
        <StatCard
          label="Top connector"
          value={topPerson?.name ?? "—"}
          icon={<Network className="h-3.5 w-3.5" />}
          accent="#f59e0b"
          previous={
            topConnector
              ? `${(topConnector.betweenness * 100).toFixed(0)}% betweenness · ${topConnector.redundantRelays} redundant relays`
              : undefined
          }
        />
        <StatCard
          label="Key-person risks"
          value={`${kpis.keyPersonRiskCount}`}
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
          accent="#ef4444"
          previous={`${kpis.singlePointsOfFailure} single points of failure`}
          goodDirection="down"
        />
        <StatCard
          label="Avg degrees of separation"
          value={kpis.avgDegreesOfSeparation.toFixed(1)}
          icon={<Share2 className="h-3.5 w-3.5" />}
          accent="#8b5cf6"
          previous={`${kpis.redundantRelaysEliminated} redundant relays eliminated`}
          goodDirection="down"
        />
      </div>

      <GraphExplorer
        graph={graph}
        middlemen={middlemen}
        topics={topics}
        personaRoutes={personaRoutes}
        height={580}
        initialColorMode="betweenness"
        initialFocusPersonId={focus}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Connectors</CardTitle>
            <CardDescription>
              People on the most shortest paths — removing them fragments
              communication. Click a row to focus in the graph above.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <div className="divide-y divide-border">
              {connectors.map(
                ({
                  person,
                  betweenness,
                  bridgesPairs,
                  redundantRelays,
                  topBridgedPersonas,
                }) => (
                  <a
                    key={person.id}
                    href={`?focus=${person.id}`}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{person.name}</span>
                        <PersonaBadge persona={person.persona} />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {bridgesPairs} pairs bridged · {redundantRelays} redundant
                        relays
                      </div>
                      {topBridgedPersonas.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {topBridgedPersonas.map((p) => (
                            <PersonaBadge key={p} persona={p} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      <div className="text-sm font-semibold">
                        {(betweenness * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        betweenness
                      </div>
                    </div>
                  </a>
                )
              )}
              {connectors.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                  No connector data yet — run the analysis worker first.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bus Factor Risks</CardTitle>
            <CardDescription>
              People whose departure would fragment knowledge or the org graph.
              Click a row to focus in the graph above.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <div className="divide-y divide-border">
              {topRisks.map((risk) => (
                <a
                  key={risk.personId}
                  href={`?focus=${risk.personId}`}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{risk.name}</span>
                      <PersonaBadge persona={risk.persona} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {risk.exposure}
                    </div>
                    {risk.soleOwnedTopics.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {risk.soleOwnedTopics.slice(0, 3).map((t) => (
                          <span
                            key={t.id}
                            className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                          >
                            #{t.label}
                          </span>
                        ))}
                        {risk.soleOwnedTopics.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{risk.soleOwnedTopics.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <div className="text-sm font-semibold">
                      {(risk.riskScore * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">risk</div>
                  </div>
                </a>
              ))}
              {topRisks.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                  No key-person risks detected.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Teams in this org:</span>
        {[...new Set(graph.nodes.map((n) => n.persona))].map((p) => (
          <PersonaBadge key={p} persona={p} />
        ))}
      </div>
    </div>
  );
}
