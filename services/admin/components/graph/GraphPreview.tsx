"use client";

import type { CommsGraph } from "@/lib/api/types";
import { ForceGraph } from "./ForceGraph";

type RoutingEdge = { router: string; target: string; count: number; redundantRelays: number };

export function GraphPreview({
  graph,
  routingEdges = [],
  height = 340,
}: {
  graph: CommsGraph;
  routingEdges?: RoutingEdge[];
  height?: number;
}) {
  return (
    <ForceGraph
      graph={graph}
      colorMode="betweenness"
      showHulls
      interactive={false}
      height={height}
      routingEdges={routingEdges}
    />
  );
}
