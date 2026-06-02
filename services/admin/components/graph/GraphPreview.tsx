"use client";

import type { CommsGraph } from "@/lib/api/types";
import { ForceGraph } from "./ForceGraph";

export function GraphPreview({
  graph,
  height = 340,
}: {
  graph: CommsGraph;
  height?: number;
}) {
  return (
    <ForceGraph
      graph={graph}
      colorMode="betweenness"
      showHulls
      interactive={false}
      height={height}
    />
  );
}
