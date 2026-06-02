"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, ReferenceLine } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SentimentSeries } from "@/lib/api/types";
import { personaColor } from "@/lib/personas";
import { cn } from "@/lib/utils";

export function SentimentChart({ series }: { series: SentimentSeries[] }) {
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());

  const config = Object.fromEntries(
    series.map((s) => [s.team, { label: s.team, color: personaColor(s.persona) }])
  ) satisfies ChartConfig;

  // Pivot per-team point arrays into one row per date label.
  const labels = series[0]?.points.map((p) => p.label) ?? [];
  const data = labels.map((label, i) => {
    const row: Record<string, number | string> = { label };
    for (const s of series) row[s.team] = s.points[i]?.score ?? 0;
    return row;
  });

  function toggle(team: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team);
      else if (next.size < series.length - 1) next.add(team);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {series.map((s) => {
          const off = hidden.has(s.team);
          const color = personaColor(s.persona);
          return (
            <button
              key={s.team}
              type="button"
              onClick={() => toggle(s.team)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                off ? "border-transparent text-muted-foreground/60" : "bg-card hover:bg-muted/60"
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: off ? "var(--muted-foreground)" : color }} />
              {s.team}
              <span className={cn("tabular-nums", s.current >= 0 ? "text-emerald-600" : "text-red-600")}>
                {s.current >= 0 ? "+" : ""}
                {s.current.toFixed(2)}
              </span>
            </button>
          );
        })}
      </div>

      <ChartContainer config={config} className="h-[260px] w-full">
        <LineChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tick={{ fontSize: 11 }} />
          <YAxis domain={[-0.6, 1]} hide />
          <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
          {series
            .filter((s) => !hidden.has(s.team))
            .map((s) => (
              <Line
                key={s.team}
                dataKey={s.team}
                type="monotone"
                stroke={personaColor(s.persona)}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
        </LineChart>
      </ChartContainer>
    </div>
  );
}
