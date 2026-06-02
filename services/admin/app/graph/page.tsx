import { getCommsGraph, getMiddlemen, getTopics } from "@/lib/api/client";
import { GraphExplorer } from "@/components/graph/GraphExplorer";
import { Card, CardContent } from "@/components/ui/card";
import { PersonaBadge } from "@/components/persona-badge";

// Always read fresh data from the DB so counts stay live.
export const dynamic = "force-dynamic";

export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const [graph, middlemen, topics, sp] = await Promise.all([
    getCommsGraph(),
    getMiddlemen(),
    getTopics(),
    searchParams,
  ]);

  const teams = graph.clusters.length;
  const topConnector = middlemen[0];
  const topPerson = graph.nodes.find((n) => n.id === topConnector?.personId);
  const focus =
    sp.focus && graph.nodes.some((n) => n.id === sp.focus) ? sp.focus : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Communication Graph
        </h2>
        <p className="text-sm text-muted-foreground">
          Who talks to whom, colored by team. Scope to the whole company, a single
          team, or one person; filter by topic (channel) to see who discusses what.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">People mapped</div>
            <div className="text-2xl font-semibold tabular-nums">
              {graph.nodes.length}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              across {teams} teams
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Top connector</div>
            <div className="truncate text-2xl font-semibold">
              {topPerson?.name ?? "—"}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {topConnector
                ? `${(topConnector.betweenness * 100).toFixed(0)}% betweenness · ${topPerson?.team}`
                : ""}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Topics (channels)</div>
            <div className="text-2xl font-semibold tabular-nums">
              {topics.filter((t) => t.messageCount > 0).length}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {topics.filter((t) => t.crossFunctional).length} cross-functional
            </div>
          </CardContent>
        </Card>
      </div>

      <GraphExplorer
        graph={graph}
        middlemen={middlemen}
        topics={topics}
        height={580}
        initialFocusPersonId={focus}
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Teams in this org:</span>
        {[...new Set(graph.nodes.map((n) => n.persona))].map((p) => (
          <PersonaBadge key={p} persona={p} />
        ))}
      </div>
    </div>
  );
}
