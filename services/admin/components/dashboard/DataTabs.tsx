"use client";

import { Waypoints } from "lucide-react";
import type {
  AutomationOpportunity,
  MiddlemanInsight,
  Person,
  PersonaPairRoute,
} from "@/lib/api/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PersonaBadge } from "@/components/persona-badge";
import { OpportunityTable } from "@/components/automations/OpportunityTable";

export function DataTabs({
  automations,
  routes,
  middlemen,
  people,
}: {
  automations: AutomationOpportunity[];
  routes: PersonaPairRoute[];
  middlemen: MiddlemanInsight[];
  people: Person[];
}) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const name = (id: string) => byId.get(id)?.name ?? "Unknown";

  return (
    <Tabs defaultValue="automations">
      <TabsList>
        <TabsTrigger value="automations">Automations</TabsTrigger>
        <TabsTrigger value="routes">Routes</TabsTrigger>
        <TabsTrigger value="middlemen">Middlemen</TabsTrigger>
      </TabsList>

      <TabsContent value="automations" className="mt-4">
        <OpportunityTable opportunities={automations} />
      </TabsContent>

      <TabsContent value="routes" className="mt-4">
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>Real owner</TableHead>
                <TableHead>Via middleman</TableHead>
                <TableHead className="text-right">Occurrences</TableHead>
                <TableHead className="w-[160px]">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((r, i) => (
                <TableRow key={`${r.fromPersona}-${r.toPersonId}-${i}`}>
                  <TableCell>
                    <PersonaBadge persona={r.fromPersona} />
                  </TableCell>
                  <TableCell className="font-medium">{r.toPersonName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {name(r.viaMiddlemanId)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.occurrences}×
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={r.confidence * 100} className="h-1.5" />
                      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                        {(r.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="middlemen" className="mt-4">
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Persona</TableHead>
                <TableHead className="w-[160px]">Betweenness</TableHead>
                <TableHead className="text-right">Pairs bridged</TableHead>
                <TableHead className="text-right">Redundant relays</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {middlemen.map((m) => {
                const p = byId.get(m.personId);
                return (
                  <TableRow key={m.personId}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Waypoints className="h-3.5 w-3.5 text-red-500" />
                        {p?.name ?? "Unknown"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {p ? <PersonaBadge persona={p.persona} /> : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={m.betweenness * 100} className="h-1.5" />
                        <span className="w-9 text-right text-xs tabular-nums text-red-500">
                          {(m.betweenness * 100).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.bridgesPairs}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Badge variant="secondary">{m.redundantRelays}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
