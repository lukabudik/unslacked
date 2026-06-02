"use client";

import { Palette, Flame, Shapes, Users, Boxes, Filter, Building2, User, Hash } from "lucide-react";
import type { ColorMode, Scope, ViewMode } from "./ForceGraph";
import type { Persona, Person, Topic } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERSONAS, personaColor, betweennessColor } from "@/lib/personas";
import { cn } from "@/lib/utils";

interface GraphControlsProps {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  colorMode: ColorMode;
  onColorModeChange: (m: ColorMode) => void;
  scope: Scope;
  onScopeChange: (s: Scope) => void;
  topicId: string | null;
  onTopicChange: (id: string | null) => void;
  topics: Topic[];
  people: Person[];
  teams: string[];
  showHulls: boolean;
  onShowHullsChange: (v: boolean) => void;
  groupByTeam: boolean;
  onGroupByTeamChange: (v: boolean) => void;
  strongOnly: boolean;
  onStrongOnlyChange: (v: boolean) => void;
  visiblePersonas: Set<Persona>;
  onTogglePersona: (p: Persona) => void;
}

function Segment({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant={active ? "secondary" : "ghost"}
      className="h-7 gap-1.5"
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </Button>
  );
}

export function GraphControls(props: GraphControlsProps) {
  const {
    view,
    onViewChange,
    colorMode,
    onColorModeChange,
    scope,
    onScopeChange,
    topicId,
    onTopicChange,
    topics,
    people,
    teams,
    showHulls,
    onShowHullsChange,
    groupByTeam,
    onGroupByTeamChange,
    strongOnly,
    onStrongOnlyChange,
    visiblePersonas,
    onTogglePersona,
  } = props;
  const isPeople = view === "people";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border p-0.5">
          <Segment active={isPeople} onClick={() => onViewChange("people")} icon={Users}>
            People
          </Segment>
          <Segment active={!isPeople} onClick={() => onViewChange("teams")} icon={Boxes}>
            Teams
          </Segment>
        </div>

        {isPeople ? (
          <>
            {/* scope */}
            <div className="inline-flex rounded-md border p-0.5">
              <Segment
                active={scope.kind === "company"}
                onClick={() => onScopeChange({ kind: "company" })}
                icon={Building2}
              >
                Company
              </Segment>
              <Segment
                active={scope.kind === "team"}
                onClick={() =>
                  onScopeChange({ kind: "team", value: teams[0] ?? "" })
                }
                icon={Boxes}
              >
                Team
              </Segment>
              <Segment
                active={scope.kind === "person"}
                onClick={() =>
                  onScopeChange({ kind: "person", value: people[0]?.id ?? "" })
                }
                icon={User}
              >
                Person
              </Segment>
            </div>

            {scope.kind === "team" ? (
              <Select
                value={scope.value}
                onValueChange={(v) => onScopeChange({ kind: "team", value: v ?? teams[0] })}
              >
                <SelectTrigger size="sm" className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {scope.kind === "person" ? (
              <Select
                value={scope.value}
                onValueChange={(v) =>
                  onScopeChange({ kind: "person", value: v ?? people[0]?.id })
                }
              >
                <SelectTrigger size="sm" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...people]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : null}

            {/* topic */}
            <Select
              value={topicId ?? "all"}
              onValueChange={(v) => onTopicChange(!v || v === "all" ? null : v)}
            >
              <SelectTrigger size="sm" className="w-[170px]">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All topics</SelectItem>
                {topics
                  .filter((t) => t.messageCount > 0)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      #{t.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            Aggregated team-to-team communication. Edge thickness = messages
            exchanged between teams.
          </span>
        )}
      </div>

      {isPeople ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md border p-0.5">
            <Segment
              active={colorMode === "persona"}
              onClick={() => onColorModeChange("persona")}
              icon={Palette}
            >
              By team
            </Segment>
            <Segment
              active={colorMode === "betweenness"}
              onClick={() => onColorModeChange("betweenness")}
              icon={Flame}
            >
              Connector heat
            </Segment>
          </div>
          <Button
            size="sm"
            variant={groupByTeam ? "secondary" : "outline"}
            className="h-7 gap-1.5"
            onClick={() => onGroupByTeamChange(!groupByTeam)}
          >
            <Boxes className="h-3.5 w-3.5" />
            Group by team
          </Button>
          <Button
            size="sm"
            variant={strongOnly ? "secondary" : "outline"}
            className="h-7 gap-1.5"
            onClick={() => onStrongOnlyChange(!strongOnly)}
          >
            <Filter className="h-3.5 w-3.5" />
            Strong links
          </Button>
          <Button
            size="sm"
            variant={showHulls ? "secondary" : "outline"}
            className="h-7 gap-1.5"
            onClick={() => onShowHullsChange(!showHulls)}
          >
            <Shapes className="h-3.5 w-3.5" />
            Hulls
          </Button>

          {colorMode === "betweenness" ? (
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span>Low</span>
              <span
                className="h-2.5 w-24 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${betweennessColor(0)}, ${betweennessColor(
                    0.5
                  )}, ${betweennessColor(1)})`,
                }}
              />
              <span className="font-medium text-red-500">Connector</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {isPeople && colorMode === "persona" ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Teams:</span>
          {PERSONAS.filter((p) => people.some((person) => person.persona === p)).map((p) => {
            const on = visiblePersonas.has(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => onTogglePersona(p)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity",
                  on ? "opacity-100" : "opacity-35 hover:opacity-70"
                )}
                style={{
                  borderColor: `${personaColor(p)}55`,
                  backgroundColor: `${personaColor(p)}14`,
                  color: personaColor(p),
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: personaColor(p) }}
                />
                {p}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
