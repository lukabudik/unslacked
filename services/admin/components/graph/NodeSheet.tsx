"use client";

import { Activity, GitBranch, Hash, Repeat, Waypoints } from "lucide-react";
import type { MiddlemanInsight, Person } from "@/lib/api/types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { PersonaBadge } from "@/components/persona-badge";
import { personaColor } from "@/lib/personas";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Metric({
  label,
  value,
  pct,
}: {
  label: string;
  value: string;
  pct?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      {pct != null ? <Progress value={pct * 100} className="h-1.5" /> : null}
    </div>
  );
}

export function NodeSheet({
  person,
  insight,
  open,
  onOpenChange,
}: {
  person: Person | null;
  insight: MiddlemanInsight | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {person ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarFallback
                    style={{
                      backgroundColor: `${personaColor(person.persona)}22`,
                      color: personaColor(person.persona),
                    }}
                  >
                    {initials(person.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle>{person.name}</SheetTitle>
                  <SheetDescription>
                    {person.title ?? person.seniority} · {person.team}
                  </SheetDescription>
                </div>
              </div>
              <div className="pt-1">
                <PersonaBadge persona={person.persona} />
              </div>
            </SheetHeader>

            <div className="space-y-4 px-4">
              <Metric
                label="Degree centrality"
                value={person.degreeCentrality.toFixed(2)}
                pct={person.degreeCentrality}
              />
              <Metric
                label="Betweenness (middleman)"
                value={`${(person.betweenness * 100).toFixed(0)}%`}
                pct={person.betweenness}
              />
              <Metric
                label="Isolation score"
                value={person.isolationScore.toFixed(2)}
                pct={person.isolationScore}
              />
              <Metric
                label="Message volume"
                value={person.messageVolume.toLocaleString()}
              />
            </div>

            {person.topics && person.topics.length > 0 ? (
              <div className="mt-4 space-y-2 px-4">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  Talks most about
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {person.topics.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-xs"
                    >
                      #{t.label}
                      <span className="text-muted-foreground">{t.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {person.recentMessages && person.recentMessages.length > 0 ? (
              <div className="mt-4 space-y-2 px-4">
                <div className="text-sm font-medium">Recent messages</div>
                <ul className="space-y-2">
                  {person.recentMessages.map((m, i) => (
                    <li key={i} className="rounded-lg border bg-card p-3">
                      <div className="mb-1 text-xs text-muted-foreground">
                        #{m.channel}
                      </div>
                      <p className="text-sm leading-relaxed">{m.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {insight ? (
              <>
                <Separator className="my-4" />
                <div className="space-y-3 px-4">
                  <div className="flex items-center gap-2">
                    <Waypoints className="h-4 w-4 text-red-500" />
                    <h3 className="text-sm font-semibold">Middleman insight</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This person sits on the shortest path between teams that
                    rarely talk directly. Removing or routing around them shortens
                    the org.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <GitBranch className="h-3.5 w-3.5" />
                        Pairs bridged
                      </div>
                      <div className="mt-1 text-xl font-semibold tabular-nums">
                        {insight.bridgesPairs}
                      </div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Repeat className="h-3.5 w-3.5" />
                        Redundant relays
                      </div>
                      <div className="mt-1 text-xl font-semibold tabular-nums">
                        {insight.redundantRelays}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" />
                      Top bridged personas
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {insight.topBridgedPersonas.map((p) => (
                        <PersonaBadge key={p} persona={p} />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
