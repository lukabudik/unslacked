"use client";

import * as React from "react";
import { ArrowUpRight, Clock, Repeat2, Sparkles } from "lucide-react";
import type { AutomationOpportunity } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DuvoProvisionDialog } from "./DuvoProvisionDialog";
import { cn } from "@/lib/utils";

function score(o: AutomationOpportunity) {
  return o.duvoFitScore * o.estHoursPerMonth;
}

export function AutomationCards({
  opportunities,
  max = 3,
  heroFirst = false,
}: {
  opportunities: AutomationOpportunity[];
  max?: number;
  heroFirst?: boolean;
}) {
  const [selected, setSelected] = React.useState<AutomationOpportunity | null>(
    null
  );
  const [open, setOpen] = React.useState(false);

  const sorted = React.useMemo(
    () => [...opportunities].sort((a, b) => score(b) - score(a)).slice(0, max),
    [opportunities, max]
  );

  function provision(o: AutomationOpportunity) {
    setSelected(o);
    setOpen(true);
  }

  return (
    <>
      <div className="space-y-3">
        {sorted.map((o, idx) => {
          const hero = heroFirst && idx === 0;
          return (
            <Card
              key={o.id}
              className={cn(
                hero && "border-emerald-500/40 bg-emerald-500/5"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{o.description}</span>
                      {hero ? (
                        <Badge className="shrink-0 gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                          <Sparkles className="h-3 w-3" />
                          Top pick
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Repeat2 className="h-3.5 w-3.5" />
                        {o.frequency}× / mo
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {o.estHoursPerMonth}h recoverable
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-muted-foreground">Duvo fit</div>
                    <div className="text-lg font-semibold tabular-nums text-emerald-600">
                      {(o.duvoFitScore * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Progress value={o.duvoFitScore * 100} className="h-1.5" />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {o.crossSystem.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant={hero ? "default" : "outline"}
                    className={cn("gap-1", hero && "bg-emerald-600 hover:bg-emerald-700")}
                    onClick={() => provision(o)}
                  >
                    Provision to Duvo
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DuvoProvisionDialog
        opportunity={selected}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
