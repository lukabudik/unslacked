"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { CommsGraph, Persona } from "@/lib/api/types";
import { personaColor, betweennessColor } from "@/lib/personas";

export type ColorMode = "persona" | "betweenness";
export type ViewMode = "people" | "teams";
export type Scope =
  | { kind: "company" }
  | { kind: "team"; value: string }
  | { kind: "person"; value: string };

interface ForceGraphProps {
  graph: CommsGraph;
  view?: ViewMode;
  colorMode: ColorMode;
  scope?: Scope;
  topicId?: string | null;
  showHulls?: boolean;
  groupByTeam?: boolean;
  strongOnly?: boolean;
  visiblePersonas?: Set<Persona>;
  onNodeClick?: (id: string) => void;
  onLinkClick?: (sourceId: string, targetId: string) => void;
  selectedId?: string | null;
  height?: number;
  interactive?: boolean;
}

type GNode = {
  id: string;
  kind: "person" | "team";
  label: string;
  persona?: Persona;
  betweenness?: number;
  messageVolume?: number;
  clusterId?: string;
  clusterColor?: string;
  matchesOrgChart?: boolean;
  size?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
};

type GLink = {
  source: string | GNode;
  target: string | GNode;
  weight: number;
  messageCount?: number;
};

function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

type ForceLike = {
  strength?: (v: number | ((l: GNode) => number)) => ForceLike;
  distance?: (v: number | ((l: GLink) => number)) => ForceLike;
};
type FGInstance = {
  zoomToFit: (ms?: number, px?: number) => void;
  d3Force: (name: string, force?: unknown) => ForceLike | undefined;
  d3ReheatSimulation: () => void;
};

type FG2DProps = {
  ref?: React.Ref<unknown>;
  width?: number;
  height?: number;
  graphData: { nodes: GNode[]; links: GLink[] };
  cooldownTicks?: number;
  d3VelocityDecay?: number;
  warmupTicks?: number;
  onEngineStop?: () => void;
  enableZoomInteraction?: boolean;
  enablePanInteraction?: boolean;
  enableNodeDrag?: boolean;
  backgroundColor?: string;
  linkColor?: (l: GLink) => string;
  linkWidth?: (l: GLink) => number;
  nodeRelSize?: number;
  nodeVal?: (n: GNode) => number;
  nodeLabel?: (n: GNode) => string;
  onNodeClick?: (n: GNode) => void;
  onLinkClick?: (l: GLink) => void;
  onRenderFramePre?: (ctx: CanvasRenderingContext2D, globalScale: number) => void;
  nodeCanvasObject?: (
    n: GNode,
    ctx: CanvasRenderingContext2D,
    scale: number
  ) => void;
};

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as unknown as React.ComponentType<FG2DProps>;

function convexHull(points: Array<[number, number]>): Array<[number, number]> {
  if (points.length < 3) return points;
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Array<[number, number]> = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: Array<[number, number]> = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// d3 force that pulls each node toward its cluster's anchor point so teams
// occupy distinct regions instead of collapsing into one blob.
function makeClusterForce(
  centers: Map<string, { x: number; y: number }>,
  strength: number
) {
  let nodes: GNode[] = [];
  const force = (alpha: number) => {
    for (const n of nodes) {
      if (!n.clusterId || n.x == null || n.y == null) continue;
      const c = centers.get(n.clusterId);
      if (!c) continue;
      n.vx = (n.vx ?? 0) + (c.x - n.x) * strength * alpha;
      n.vy = (n.vy ?? 0) + (c.y - n.y) * strength * alpha;
    }
  };
  (force as unknown as { initialize: (n: GNode[]) => void }).initialize = (n) => {
    nodes = n;
  };
  return force;
}

export function ForceGraph({
  graph,
  view = "people",
  colorMode,
  scope = { kind: "company" },
  topicId = null,
  showHulls = false,
  groupByTeam = true,
  strongOnly = false,
  visiblePersonas,
  onNodeClick,
  onLinkClick,
  selectedId,
  height = 520,
  interactive = true,
}: ForceGraphProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const fgRef = React.useRef<FGInstance | null>(null);
  const [width, setWidth] = React.useState(800);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const clusterById = React.useMemo(() => {
    const m = new Map<string, { id: string; matchesOrgChart: boolean }>();
    graph.clusters.forEach((c) =>
      c.memberIds.forEach((id) => m.set(id, { id: c.id, matchesOrgChart: c.matchesOrgChart }))
    );
    return m;
  }, [graph]);

  // Anchor points for each cluster, arranged on a circle around the origin.
  const centers = React.useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    const R = Math.max(140, Math.min(width, height) * 0.36);
    graph.clusters.forEach((c, i) => {
      const a = (i / graph.clusters.length) * Math.PI * 2 - Math.PI / 2;
      m.set(c.id, { x: Math.cos(a) * R, y: Math.sin(a) * R });
    });
    return m;
  }, [graph, width, height]);

  const data = React.useMemo(() => {
    if (view === "teams") {
      const nodes: GNode[] = graph.clusters.map((c) => ({
        id: c.id,
        kind: "team",
        label: c.label,
        clusterId: c.id,
        clusterColor: personaColor(c.label),
        matchesOrgChart: c.matchesOrgChart,
        size: c.memberIds.length,
      }));
      const pair = new Map<string, { mc: number }>();
      graph.edges.forEach((e) => {
        const sc = clusterById.get(e.source)?.id;
        const tc = clusterById.get(e.target)?.id;
        if (!sc || !tc || sc === tc) return;
        const key = sc < tc ? `${sc}|${tc}` : `${tc}|${sc}`;
        const cur = pair.get(key) ?? { mc: 0 };
        cur.mc += e.messageCount;
        pair.set(key, cur);
      });
      const maxMc = Math.max(1, ...[...pair.values()].map((v) => v.mc));
      const links: GLink[] = [...pair.entries()].map(([key, v]) => {
        const [s, t] = key.split("|");
        return { source: s, target: t, weight: v.mc / maxMc, messageCount: v.mc };
      });
      return { nodes, links };
    }

    // people view (with scope + topic + filters)
    const personById = new Map(graph.nodes.map((n) => [n.id, n]));
    const show = (id: string) => {
      const p = personById.get(id);
      return !!p && (!visiblePersonas || visiblePersonas.has(p.persona));
    };

    let links = graph.edges.filter(
      (e) =>
        show(e.source) &&
        show(e.target) &&
        (!strongOnly || e.weight >= 0.5) &&
        (!topicId || (e.topics ?? []).some((t) => t.id === topicId))
    );

    if (scope.kind === "person") {
      links = links.filter((e) => e.source === scope.value || e.target === scope.value);
    } else if (scope.kind === "team") {
      links = links.filter(
        (e) =>
          personById.get(e.source)?.team === scope.value ||
          personById.get(e.target)?.team === scope.value
      );
    }

    const keep = new Set<string>();
    links.forEach((e) => {
      keep.add(e.source);
      keep.add(e.target);
    });
    // ensure focal nodes appear even if isolated under the current filters
    if (scope.kind === "person") keep.add(scope.value);
    else if (scope.kind === "team")
      graph.nodes.forEach((n) => n.team === scope.value && show(n.id) && keep.add(n.id));
    else graph.nodes.forEach((n) => show(n.id) && !topicId && keep.add(n.id));

    const nodes: GNode[] = graph.nodes
      .filter((n) => keep.has(n.id))
      .map((n) => ({
        id: n.id,
        kind: "person",
        label: n.name,
        persona: n.persona,
        betweenness: n.betweenness,
        messageVolume: n.messageVolume,
        clusterId: clusterById.get(n.id)?.id,
        clusterColor: personaColor(n.persona),
        matchesOrgChart: clusterById.get(n.id)?.matchesOrgChart,
      }));

    const mappedLinks: GLink[] = links.map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
      messageCount: e.messageCount,
    }));
    return { nodes, links: mappedLinks };
  }, [graph, view, clusterById, strongOnly, visiblePersonas, scope, topicId]);

  // when a node is selected, highlight it + its direct contacts, fade the rest
  const highlight = React.useMemo(() => {
    if (!selectedId || view !== "people") return null;
    const nodes = new Set<string>([selectedId]);
    const links = new Set<string>();
    data.links.forEach((l) => {
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      if (s === selectedId || t === selectedId) {
        nodes.add(s);
        nodes.add(t);
        links.add(`${s}|${t}`);
      }
    });
    return { nodes, links };
  }, [selectedId, data, view]);

  const maxVol = React.useMemo(
    () => Math.max(1, ...graph.nodes.map((n) => n.messageVolume)),
    [graph]
  );

  const radius = React.useCallback(
    (n: GNode) => {
      if (n.kind === "team") return 16 + Math.sqrt(n.size ?? 1) * 5;
      return 4 + Math.sqrt((n.messageVolume ?? 0) / maxVol) * 11;
    },
    [maxVol]
  );

  // Tune the simulation for spacing + team separation.
  React.useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    if (view === "teams") {
      fg.d3Force("charge")?.strength?.(-900);
      fg.d3Force("link")?.distance?.(190);
      fg.d3Force("cluster", makeClusterForce(centers, 0));
    } else {
      fg.d3Force("charge")?.strength?.(-220);
      fg.d3Force("link")?.distance?.((l: GLink) => 36 + (1 - l.weight) * 90);
      fg.d3Force("cluster", makeClusterForce(centers, groupByTeam ? 0.22 : 0));
    }
    fg.d3ReheatSimulation();
    const t = setTimeout(() => fg.zoomToFit(500, 60), 400);
    return () => clearTimeout(t);
  }, [view, groupByTeam, centers, data]);

  const clusterLabel = React.useMemo(
    () => new Map(graph.clusters.map((c) => [c.id, c.label])),
    [graph]
  );

  const nodeColor = React.useCallback(
    (n: GNode) => {
      if (n.kind === "team") return n.clusterColor ?? "#64748b";
      return colorMode === "persona"
        ? personaColor(n.persona as Persona)
        : betweennessColor(n.betweenness ?? 0);
    },
    [colorMode]
  );

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-lg bg-muted/20"
      style={{ height }}
    >
      <ForceGraph2D
        ref={fgRef as never}
        width={width}
        height={height}
        graphData={data}
        cooldownTicks={interactive ? 200 : 120}
        warmupTicks={20}
        d3VelocityDecay={0.32}
        onEngineStop={() => fgRef.current?.zoomToFit(500, 60)}
        enableZoomInteraction={interactive}
        enablePanInteraction={interactive}
        enableNodeDrag={interactive}
        backgroundColor="rgba(0,0,0,0)"
        linkColor={(l: GLink) => {
          if (view === "teams") return "rgba(120,120,135,0.35)";
          const s = typeof l.source === "string" ? l.source : l.source.id;
          const t = typeof l.target === "string" ? l.target : l.target.id;
          if (highlight) {
            const on = highlight.links.has(`${s}|${t}`) || highlight.links.has(`${t}|${s}`);
            return on
              ? `rgba(99,102,241,${0.35 + l.weight * 0.4})`
              : "rgba(120,120,135,0.05)";
          }
          return `rgba(120,120,135,${0.12 + l.weight * 0.28})`;
        }}
        linkWidth={(l: GLink) =>
          view === "teams" ? 0.6 + l.weight * 6 : 0.4 + l.weight * 2.4
        }
        nodeRelSize={1}
        nodeVal={(n: GNode) => radius(n) ** 2}
        nodeLabel={(n: GNode) =>
          n.kind === "team"
            ? `${n.label} · ${n.size} people`
            : `${n.label} · ${n.persona} · betweenness ${((n.betweenness ?? 0) * 100).toFixed(0)}%`
        }
        onNodeClick={(n: GNode) => onNodeClick?.(n.id)}
        onLinkClick={(l: GLink) => {
          if (view !== "people") return;
          const s = typeof l.source === "string" ? l.source : l.source.id;
          const t = typeof l.target === "string" ? l.target : l.target.id;
          onLinkClick?.(s, t);
        }}
        onRenderFramePre={(ctx: CanvasRenderingContext2D, scale: number) => {
          if (view !== "people") return;
          // cluster hulls + team labels at centroids
          const byCluster = new Map<string, Array<[number, number]>>();
          for (const n of data.nodes) {
            if (!n.clusterId || n.x == null || n.y == null) continue;
            if (!byCluster.has(n.clusterId)) byCluster.set(n.clusterId, []);
            byCluster.get(n.clusterId)!.push([n.x, n.y]);
          }
          byCluster.forEach((pts, cid) => {
            const label = clusterLabel.get(cid) ?? "";
            const deptColor = personaColor(label);
            if (showHulls && pts.length >= 3) {
              const hull = convexHull(pts);
              ctx.beginPath();
              hull.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
              ctx.closePath();
              ctx.fillStyle = hexA(deptColor, 0.08);
              ctx.fill();
              ctx.strokeStyle = hexA(deptColor, 0.35);
              ctx.lineWidth = 1 / scale;
              ctx.stroke();
            }
            // team label at centroid
            const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
            const minY = Math.min(...pts.map((p) => p[1]));
            const fontSize = Math.max(10, 12 / scale);
            ctx.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui`;
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillStyle = hexA(deptColor, 0.9);
            ctx.fillText(label.toUpperCase(), cx, minY - 10 / scale);
          });
        }}
        nodeCanvasObject={(n: GNode, ctx: CanvasRenderingContext2D, scale: number) => {
          const r = radius(n);
          const color = nodeColor(n);
          const isMiddleman =
            n.kind === "person" && colorMode === "betweenness" && (n.betweenness ?? 0) >= 0.5;
          const isSelected = selectedId === n.id;
          const dimmed = highlight ? !highlight.nodes.has(n.id) : false;
          ctx.globalAlpha = dimmed ? 0.2 : 1;

          if (isMiddleman) {
            ctx.beginPath();
            ctx.arc(n.x!, n.y!, r + 4, 0, 2 * Math.PI);
            ctx.fillStyle = "rgba(239,68,68,0.16)";
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();

          if (isSelected) {
            ctx.lineWidth = 2 / scale;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();
            ctx.lineWidth = 3.5 / scale;
            ctx.strokeStyle = color;
            ctx.stroke();
          } else {
            ctx.lineWidth = 1.2 / scale;
            ctx.strokeStyle = "rgba(255,255,255,0.85)";
            ctx.stroke();
          }

          if (n.kind === "team") {
            // team label + count inside/below
            const fontSize = Math.max(10, 12 / scale);
            ctx.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = "rgba(30,30,40,0.92)";
            ctx.fillText(n.label, n.x!, n.y! + r + 3);
            ctx.globalAlpha = 1;
            return;
          }

          if ((r > 9 || isMiddleman || isSelected) && scale > 1) {
            const first = n.label.split(" ")[0];
            const fontSize = Math.max(8.5, 10.5 / scale);
            ctx.font = `${fontSize}px Inter, ui-sans-serif, system-ui`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = "rgba(90,90,105,0.95)";
            ctx.fillText(first, n.x!, n.y! + r + 2);
          }
          ctx.globalAlpha = 1;
        }}
      />
    </div>
  );
}
