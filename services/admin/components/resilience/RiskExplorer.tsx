"use client";

import * as React from "react";
import { AlertTriangle, Bus, Network, Crown } from "lucide-react";
import type { KeyPersonRisk } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { PersonaBadge } from "@/components/persona-badge";
import { Initials, ScoreBar } from "@/components/shared/bits";
import { betweennessColor } from "@/lib/personas";
import { cn } from "@/lib/utils";

export function RiskExplorer({ risks }: { risks: KeyPersonRisk[] }) {
  const [selectedId, setSelectedId] = React.useState(risks[0]?.personId);
  const selected = risks.find((r) => r.personId === selectedId) ?? risks[0];

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Leaderboard */}
      <Card className="lg:col-span-3">
        <CardContent className="p-2">
          <div className="flex flex-col">
            {risks.map((r, i) => {
              const active = r.personId === selected?.personId;
              return (
                <button
                  key={r.personId}
                  onClick={() => setSelectedId(r.personId)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    active ? "bg-muted" : "hover:bg-muted/60"
                  )}
                >
                  <span className="w-4 text-xs font-medium tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <Initials name={r.name} persona={r.persona} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{r.name}</span>
                      {r.busFactorContribution ? (
                        <Bus className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.title ?? r.persona} · {r.exposure}
                    </div>
                  </div>
                  <div className="flex w-24 shrink-0 flex-col items-end gap-1">
                    <span
                      className="text-sm font-semibold tabular-nums"
                      style={{ color: betweennessColor(r.riskScore) }}
                    >
                      {(r.riskScore * 100).toFixed(0)}
                    </span>
                    <ScoreBar value={r.riskScore} color={betweennessColor(r.riskScore)} className="w-20" />
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detail / "if they leave" */}
      <Card className="lg:col-span-2">
        <CardContent className="space-y-4 p-5">
          {selected ? (
            <>
              <div className="flex items-center gap-3">
                <Initials name={selected.name} persona={selected.persona} className="h-10 w-10" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{selected.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {selected.title ?? selected.persona}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  If they leave
                </div>
                <p className="mt-1 text-sm text-foreground">
                  {selected.soleOwnedTopics.length
                    ? `${selected.soleOwnedTopics.length} knowledge ${
                        selected.soleOwnedTopics.length > 1 ? "areas lose" : "area loses"
                      } their only owner${
                        selected.busFactorContribution ? ", and the org graph fragments" : ""
                      }.`
                    : "Broadly connected — coverage is resilient, but they carry high relay load."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Metric icon={<Network className="h-3.5 w-3.5" />} label="Betweenness" value={`${(selected.betweenness * 100).toFixed(0)}%`} />
                <Metric icon={<Crown className="h-3.5 w-3.5" />} label="Answer share" value={`${(selected.answerShare * 100).toFixed(0)}%`} />
              </div>

              {selected.soleOwnedTopics.length ? (
                <div>
                  <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Sole-owned knowledge areas
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.soleOwnedTopics.map((t) => (
                      <span
                        key={t.id}
                        className="rounded-md bg-muted px-2 py-1 font-mono text-xs"
                      >
                        #{t.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-2 pt-1">
                <PersonaBadge persona={selected.persona} />
                {selected.busFactorContribution ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-950/30">
                    <Bus className="h-3 w-3" /> Single point of failure
                  </span>
                ) : null}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
