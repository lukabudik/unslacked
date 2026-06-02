"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { forceCollide, forceX, forceY } from "d3-force";
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
  routingEdges?: Array<{ router: string; target: string; count: number; redundantRelays: number }>;
}

type GNode = {
  id: string;
  kind: "person" | "team";
  label: string;
  persona?: Persona;
  betweenness?: number;
  degreeCentrality?: number;
  messageVolume?: number;
  isolationScore?: number;
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
  screen2GraphCoords: (x: number, y: number) => { x: number; y: number };
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

function pointToSegmentDist(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

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
  routingEdges = [],
}: ForceGraphProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  // callback ref → state so the force-config effect runs once the dynamically
  // imported ForceGraph2D instance is actually mounted (not before).
  const [fg, setFg] = React.useState<FGInstance | null>(null);
  const setFgRef = React.useCallback((inst: unknown) => {
    setFg((inst as FGInstance) ?? null);
  }, []);
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

  // Anchor points for each cluster on an ellipse that matches the canvas aspect
  // ratio, so wide canvases spread clusters across the full width instead of
  // shrinking everything to fit the height.
  const centers = React.useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    const eW = Math.max(160, width * 0.42);
    const eH = Math.max(120, height * 0.38);
    graph.clusters.forEach((c, i) => {
      const a = (i / graph.clusters.length) * Math.PI * 2 - Math.PI / 2;
      m.set(c.id, { x: Math.cos(a) * eW, y: Math.sin(a) * eH });
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
        e.weight >= 0.05 &&
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
    else graph.nodes.forEach((n) => show(n.id) && !topicId && (n.isolationScore ?? 0) < 1 && keep.add(n.id));

    const nodes: GNode[] = graph.nodes
      .filter((n) => keep.has(n.id))
      .map((n) => ({
        id: n.id,
        kind: "person",
        label: n.name,
        persona: n.persona,
        betweenness: n.betweenness,
        degreeCentrality: n.degreeCentrality,
        messageVolume: n.messageVolume,
        isolationScore: n.isolationScore,
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

  // routing edges filtered to only nodes currently visible in the graph
  const visibleRoutingEdges = React.useMemo(() => {
    if (routingEdges.length === 0 || view !== "people") return [];
    const nodeIds = new Set(data.nodes.map((n) => n.id));
    return routingEdges.filter((e) => nodeIds.has(e.router) && nodeIds.has(e.target));
  }, [routingEdges, data.nodes, view]);

  const routerIds = React.useMemo(
    () => new Set(visibleRoutingEdges.map((e) => e.router)),
    [visibleRoutingEdges]
  );

  const maxVol = React.useMemo(
    () => Math.max(1, ...graph.nodes.map((n) => n.messageVolume)),
    [graph]
  );

  const radius = React.useCallback(
    (n: GNode) => {
      if (n.kind === "team") return 16 + Math.sqrt(n.size ?? 1) * 5;
      // betweenness mode: size by structural importance so connectors dominate visually
      if (colorMode === "betweenness") return 5 + (n.betweenness ?? 0) * 22;
      return 4 + Math.sqrt((n.messageVolume ?? 0) / maxVol) * 11;
    },
    [maxVol, colorMode]
  );

  // click handler: hit-test amber routing edges; ignore if the click landed on a node
  const handleCanvasClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!fg || visibleRoutingEdges.length === 0) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gp = fg.screen2GraphCoords(e.clientX - rect.left, e.clientY - rect.top);
      const nodeById = new Map(data.nodes.map((n) => [n.id, n]));
      // let the library handle node clicks
      for (const n of data.nodes) {
        if (n.x == null || n.y == null) continue;
        if (Math.hypot(gp.x - n.x, gp.y - n.y) < radius(n) + 4) return;
      }
      for (const re of visibleRoutingEdges) {
        const from = nodeById.get(re.router);
        const to = nodeById.get(re.target);
        if (!from || from.x == null || from.y == null || !to || to.x == null || to.y == null) continue;
        if (pointToSegmentDist(gp.x, gp.y, from.x, from.y, to.x, to.y) < 6) {
          onNodeClick?.(re.router);
          return;
        }
      }
    },
    [fg, visibleRoutingEdges, data.nodes, radius, onNodeClick],
  );

  // Tune the simulation for spacing + clear team separation. forceCollide stops
  // nodes from piling up; forceX/forceY pull each node toward its team's anchor.
  React.useEffect(() => {
    if (!fg) return;
    const collide = forceCollide<GNode>()
      .radius((n) => radius(n) + (view === "teams" ? 16 : 9))
      .iterations(3);
    if (view === "teams") {
      fg.d3Force("charge")?.strength?.(-1400);
      fg.d3Force("link")?.distance?.(240);
      fg.d3Force("link")?.strength?.(0.5);
      fg.d3Force("collide", collide);
      fg.d3Force("x", forceX<GNode>(0).strength(0.04));
      fg.d3Force("y", forceY<GNode>(0).strength(0.04));
    } else {
      fg.d3Force("charge")?.strength?.(-260);
      // weak links so team anchoring wins over the dense cross-team edges
      fg.d3Force("link")?.distance?.((l: GLink) => 24 + (1 - l.weight) * 50);
      fg.d3Force("link")?.strength?.(groupByTeam ? 0.04 : 0.6);
      fg.d3Force("collide", collide);
      const s = groupByTeam ? 0.62 : 0.04;
      fg.d3Force("x", forceX<GNode>((n) => centers.get(n.clusterId ?? "")?.x ?? 0).strength(s));
      fg.d3Force("y", forceY<GNode>((n) => centers.get(n.clusterId ?? "")?.y ?? 0).strength(s));
    }
    fg.d3ReheatSimulation();
    const t = setTimeout(() => fg.zoomToFit(500, 70), 600);
    return () => clearTimeout(t);
  }, [fg, view, groupByTeam, centers, data, radius]);

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
      onClick={handleCanvasClick}
      className="w-full overflow-hidden rounded-lg"
      style={{
        height,
        backgroundColor: "var(--card)",
        backgroundImage:
          "radial-gradient(circle, color-mix(in oklch, var(--foreground) 13%, transparent) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
        backgroundPosition: "-9px -9px",
      }}
    >
      <ForceGraph2D
        ref={setFgRef as never}
        width={width}
        height={height}
        graphData={data}
        cooldownTicks={interactive ? 220 : 140}
        warmupTicks={30}
        d3VelocityDecay={0.3}
        onEngineStop={() => fg?.zoomToFit(500, 70)}
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
          // dim communication edges when routing overlay is active so arrows read clearly
          const a = (0.12 + l.weight * 0.28) * (visibleRoutingEdges.length > 0 ? 0.35 : 1);
          return `rgba(120,120,135,${a})`;
        }}
        linkWidth={(l: GLink) =>
          view === "teams" ? 0.6 + l.weight * 6 : 0.4 + l.weight * 2.4
        }
        nodeRelSize={1}
        nodeVal={(n: GNode) => radius(n) ** 2}
        nodeLabel={(n: GNode) =>
          n.kind === "team"
            ? `${n.label} · ${n.size} people`
            : `${n.label} · ${n.persona} · betweenness ${((n.betweenness ?? 0) * 100).toFixed(0)}% · degree ${((n.degreeCentrality ?? 0) * 100).toFixed(0)}%`
        }
        onNodeClick={(n: GNode) => onNodeClick?.(n.id)}
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

          // routing handoff arrows: router → target
          // red-orange = confirmed inefficiency (redundantRelays > 0), amber = neutral routing
          if (visibleRoutingEdges.length > 0) {
            const nodeById = new Map<string, GNode>();
            for (const n of data.nodes) {
              if (n.x != null && n.y != null) nodeById.set(n.id, n);
            }
            const maxCount = Math.max(1, ...visibleRoutingEdges.map((e) => e.count));
            for (const re of visibleRoutingEdges) {
              const from = nodeById.get(re.router);
              const to = nodeById.get(re.target);
              if (!from || !to || from.x == null || from.y == null || to.x == null || to.y == null) continue;
              const t = re.count / maxCount;
              const inefficient = re.redundantRelays > 0;
              // inefficient: vivid red-orange at full opacity; neutral: dim amber
              const color = inefficient ? "239,68,68" : "245,158,11";
              const alpha = inefficient ? 0.75 + t * 0.2 : 0.3 + t * 0.25;
              const lineW = inefficient ? (2 + t * 2.5) / scale : (0.8 + t * 1.2) / scale;
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len < 1) continue;
              const ux = dx / len;
              const uy = dy / len;
              const x1 = from.x + ux * (radius(from) + 1);
              const y1 = from.y + uy * (radius(from) + 1);
              const x2 = to.x - ux * (radius(to) + 2);
              const y2 = to.y - uy * (radius(to) + 2);
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.strokeStyle = `rgba(${color},${alpha})`;
              ctx.lineWidth = lineW;
              ctx.stroke();
              // arrowhead at target
              const arrowSize = (inefficient ? 6 + t * 4 : 4 + t * 2) / scale;
              ctx.beginPath();
              ctx.moveTo(x2, y2);
              ctx.lineTo(x2 - ux * arrowSize - uy * arrowSize * 0.5, y2 - uy * arrowSize + ux * arrowSize * 0.5);
              ctx.lineTo(x2 - ux * arrowSize + uy * arrowSize * 0.5, y2 - uy * arrowSize - ux * arrowSize * 0.5);
              ctx.closePath();
              ctx.fillStyle = `rgba(${color},${alpha})`;
              ctx.fill();
            }
          }
        }}
        nodeCanvasObject={(n: GNode, ctx: CanvasRenderingContext2D, scale: number) => {
          const r = radius(n);
          const color = nodeColor(n);
          const betweenness = n.betweenness ?? 0;
          // graduated halo: visible from 0.15, grows in radius and opacity with score
          const isMiddleman =
            n.kind === "person" && colorMode === "betweenness" && betweenness >= 0.15;
          const isSelected = selectedId === n.id;
          const dimmed = highlight ? !highlight.nodes.has(n.id) : false;
          ctx.globalAlpha = dimmed ? 0.2 : 1;

          if (isMiddleman) {
            const haloR = r + 3 + betweenness * 10;
            const haloA = (0.07 + betweenness * 0.20).toFixed(2);
            ctx.beginPath();
            ctx.arc(n.x!, n.y!, haloR, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(239,68,68,${haloA})`;
            ctx.fill();
          }

          // ring for nodes that appear as a router in handoff edges
          // red = confirmed inefficiency, amber = neutral routing
          if (!dimmed && routerIds.has(n.id)) {
            const isInefficient = visibleRoutingEdges.some(
              (e) => e.router === n.id && e.redundantRelays > 0
            );
            ctx.beginPath();
            ctx.arc(n.x!, n.y!, r + 5, 0, 2 * Math.PI);
            ctx.lineWidth = (isInefficient ? 2.2 : 1.6) / scale;
            ctx.strokeStyle = isInefficient
              ? "rgba(239,68,68,0.85)"
              : "rgba(245,158,11,0.7)";
            ctx.stroke();
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

          // always label high-betweenness nodes so connectors are identifiable without zooming
          if ((r > 9 || betweenness >= 0.3 || isSelected) && scale > 0.6) {
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
