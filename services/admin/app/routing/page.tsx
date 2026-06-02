import { Route, CheckCheck, Zap } from "lucide-react";
import {
  getCommsGraph,
  getPersonaRoutes,
  getRoutingFeed,
} from "@/lib/api/client";
import { PersonaRoutesPanel } from "@/components/routing/PersonaRoutesPanel";
import { RoutingFeed } from "@/components/routing/RoutingFeed";
import { StatCard } from "@/components/dashboard/StatCard";

export default async function RoutingPage() {
  const [graph, routes, feed] = await Promise.all([
    getCommsGraph(),
    getPersonaRoutes(),
    getRoutingFeed(),
  ]);

  const nameById = (id: string) =>
    graph.nodes.find((n) => n.id === id)?.name ?? "Unknown";
  const names = Object.fromEntries(graph.nodes.map((n) => [n.id, n.name]));

  const accepted = feed.filter((e) => e.status === "accepted");
  const hopsSaved = feed.reduce((s, e) => s + e.hopsSaved, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Routing &amp; Pre-emptive Pairing
        </h2>
        <p className="text-sm text-muted-foreground">
          When someone from a persona reaches out, we predict the real owner and
          route around the middleman. These are the learned persona-pair routes
          and the live suggestions feed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Learned routes"
          value={`${routes.length}`}
          icon={<Route className="h-3.5 w-3.5" />}
          accent="#6366f1"
          previous="persona pairs"
        />
        <StatCard
          label="Suggestions accepted"
          value={`${accepted.length} / ${feed.length}`}
          icon={<CheckCheck className="h-3.5 w-3.5" />}
          accent="#10b981"
          previous="this window"
        />
        <StatCard
          label="Hops saved"
          value={`${hopsSaved}`}
          icon={<Zap className="h-3.5 w-3.5" />}
          accent="#f59e0b"
          deltaPct={9.0}
          previous="vs prev"
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Persona-pair routes</h3>
        <PersonaRoutesPanel routes={routes} names={names} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Live routing feed</h3>
        <div className="max-h-[460px] overflow-y-auto rounded-xl border">
          <RoutingFeed events={feed} nameById={nameById} bare />
        </div>
      </div>
    </div>
  );
}
