"use client";

import * as React from "react";
import type {
  CommsEdge,
  CommsGraph,
  MiddlemanInsight,
  Persona,
  PersonaPairRoute,
  Topic,
} from "@/lib/api/types";
import { ForceGraph, type ColorMode, type Scope, type ViewMode } from "./ForceGraph";
import { GraphControls } from "./GraphControls";
import { NodeSheet } from "./NodeSheet";
import { EdgeSheet } from "./EdgeSheet";
import { Card, CardContent } from "@/components/ui/card";
import { PERSONAS } from "@/lib/personas";

export function GraphExplorer({
  graph,
  middlemen,
  topics,
  personaRoutes = [],
  height = 560,
  initialColorMode = "persona",
  initialFocusPersonId,
}: {
  graph: CommsGraph;
  middlemen: MiddlemanInsight[];
  topics: Topic[];
  personaRoutes?: PersonaPairRoute[];
  height?: number;
  initialColorMode?: ColorMode;
  initialFocusPersonId?: string;
}) {
  const [view, setView] = React.useState<ViewMode>("people");
  const [colorMode, setColorMode] = React.useState<ColorMode>(initialColorMode);
  const [scope, setScope] = React.useState<Scope>(
    initialFocusPersonId
      ? { kind: "person", value: initialFocusPersonId }
      : { kind: "company" }
  );
  const [topicId, setTopicId] = React.useState<string | null>(null);
  const [groupByTeam, setGroupByTeam] = React.useState(true);
  const [strongOnly, setStrongOnly] = React.useState(false);
  const [showHulls, setShowHulls] = React.useState(true);
  const [visiblePersonas, setVisiblePersonas] = React.useState<Set<Persona>>(
    new Set(PERSONAS)
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialFocusPersonId ?? null
  );
  const [selectedEdge, setSelectedEdge] = React.useState<CommsEdge | null>(null);

  const teams = React.useMemo(
    () => graph.clusters.map((c) => c.label),
    [graph]
  );

  const clusterLabelById = React.useMemo(
    () => new Map(graph.clusters.map((c) => [c.id, c.label])),
    [graph]
  );

  // aggregate persona-level routes into per-person handoff edges (middleman → target)
  // redundantRelays comes from MiddlemanInsight: > 0 means confirmed routing inefficiency
  const routingEdges = React.useMemo(() => {
    const redundantByPerson = new Map(middlemen.map((m) => [m.personId, m.redundantRelays]));
    const map = new Map<string, number>();
    personaRoutes.forEach((r) => {
      const key = `${r.viaMiddlemanId}|${r.toPersonId}`;
      map.set(key, (map.get(key) ?? 0) + r.occurrences);
    });
    return [...map.entries()].map(([key, count]) => {
      const [router, target] = key.split("|");
      return { router, target, count, redundantRelays: redundantByPerson.get(router) ?? 0 };
    });
  }, [personaRoutes, middlemen]);

  const handleNodeClick = (id: string) => {
    const teamLabel = clusterLabelById.get(id);
    if (teamLabel) {
      // a team bubble was clicked → drill into that team's people
      setView("people");
      setScope({ kind: "team", value: teamLabel });
    } else {
      setSelectedId(id);
    }
  };

  const handleLinkClick = (a: string, b: string) => {
    const edge = graph.edges.find(
      (e) =>
        (e.source === a && e.target === b) || (e.source === b && e.target === a)
    );
    if (edge) setSelectedEdge(edge);
  };

  const edgeSource = React.useMemo(
    () => graph.nodes.find((n) => n.id === selectedEdge?.source) ?? null,
    [graph, selectedEdge]
  );
  const edgeTarget = React.useMemo(
    () => graph.nodes.find((n) => n.id === selectedEdge?.target) ?? null,
    [graph, selectedEdge]
  );

  const togglePersona = (p: Persona) =>
    setVisiblePersonas((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size > 1) next.delete(p);
      } else next.add(p);
      return next;
    });

  const selectedPerson = React.useMemo(
    () => graph.nodes.find((n) => n.id === selectedId) ?? null,
    [graph, selectedId]
  );
  const selectedInsight = React.useMemo(
    () => middlemen.find((m) => m.personId === selectedId) ?? null,
    [middlemen, selectedId]
  );

  return (
    <div className="space-y-3">
      <GraphControls
        view={view}
        onViewChange={setView}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        scope={scope}
        onScopeChange={setScope}
        topicId={topicId}
        onTopicChange={setTopicId}
        topics={topics}
        people={graph.nodes}
        teams={teams}
        showHulls={showHulls}
        onShowHullsChange={setShowHulls}
        groupByTeam={groupByTeam}
        onGroupByTeamChange={setGroupByTeam}
        strongOnly={strongOnly}
        onStrongOnlyChange={setStrongOnly}
        visiblePersonas={visiblePersonas}
        onTogglePersona={togglePersona}
      />
      <Card>
        <CardContent className="p-2">
          <ForceGraph
            graph={graph}
            view={view}
            colorMode={colorMode}
            scope={scope}
            topicId={topicId}
            showHulls={showHulls}
            groupByTeam={groupByTeam}
            strongOnly={strongOnly}
            visiblePersonas={visiblePersonas}
            selectedId={selectedId}
            onNodeClick={handleNodeClick}
            onLinkClick={handleLinkClick}
            height={height}
            routingEdges={routingEdges}
          />
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Red arrows = confirmed routing inefficiency (removable hops). Amber = neutral handoffs. Click an arrow to inspect the router.
      </p>
      <NodeSheet
        person={selectedPerson}
        insight={selectedInsight}
        open={selectedId != null}
        onOpenChange={(v) => !v && setSelectedId(null)}
      />
      <EdgeSheet
        edge={selectedEdge}
        source={edgeSource}
        target={edgeTarget}
        open={selectedEdge != null}
        onOpenChange={(v) => !v && setSelectedEdge(null)}
      />
    </div>
  );
}
