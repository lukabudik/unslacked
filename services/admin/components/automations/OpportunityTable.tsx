"use client";

import * as React from "react";
import { ArrowUpRight, Users } from "lucide-react";
import type { AutomationOpportunity } from "@/lib/api/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DuvoProvisionDialog } from "./DuvoProvisionDialog";
import { cn } from "@/lib/utils";

function priority(o: AutomationOpportunity) {
  return o.duvoFitScore * o.estHoursPerMonth;
}

export function OpportunityTable({
  opportunities,
}: {
  opportunities: AutomationOpportunity[];
}) {
  const [selected, setSelected] = React.useState<AutomationOpportunity | null>(
    null
  );
  const [open, setOpen] = React.useState(false);

  const sorted = React.useMemo(
    () => [...opportunities].sort((a, b) => priority(b) - priority(a)),
    [opportunities]
  );

  function provision(o: AutomationOpportunity) {
    setSelected(o);
    setOpen(true);
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[240px]">Task</TableHead>
              <TableHead className="text-right">Freq /mo</TableHead>
              <TableHead className="text-center">People</TableHead>
              <TableHead className="text-right">Est. hrs/mo</TableHead>
              <TableHead>Cross-system</TableHead>
              <TableHead className="w-[140px]">Duvo fit</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((o, i) => {
              // Highlight the highest-priority opportunity (fit × hours), whatever its id.
              const isHero = i === 0;
              return (
                <TableRow key={o.id} className={cn(isHero && "bg-emerald-500/5")}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{o.description}</span>
                      {isHero ? (
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                          Top pick
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {o.verb} · {o.object} ← {o.source}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {o.frequency}×
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {o.distinctRequesters}/{o.distinctAssignees}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {o.estHoursPerMonth}h
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {o.crossSystem.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={o.duvoFitScore * 100} className="h-1.5" />
                      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                        {(o.duvoFitScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={isHero ? "default" : "outline"}
                      className="gap-1"
                      onClick={() => provision(o)}
                    >
                      Provision
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DuvoProvisionDialog
        opportunity={selected}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
