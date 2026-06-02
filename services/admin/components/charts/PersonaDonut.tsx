"use client";

import * as React from "react";
import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { personaColor } from "@/lib/personas";
import type { Persona } from "@/lib/api/types";

const config = { volume: { label: "Messages" } } satisfies ChartConfig;

export function PersonaDonut({
  data,
}: {
  data: { persona: Persona; volume: number }[];
}) {
  const total = React.useMemo(
    () => data.reduce((s, d) => s + d.volume, 0),
    [data]
  );

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative">
        <ChartContainer config={config} className="h-[180px] w-[180px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={data}
              dataKey="volume"
              nameKey="persona"
              innerRadius={58}
              outerRadius={84}
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.persona} fill={personaColor(d.persona)} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums">
            {(total / 1000).toFixed(1)}k
          </span>
          <span className="text-xs text-muted-foreground">messages</span>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1.5">
        {data.map((d) => (
          <div key={d.persona} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: personaColor(d.persona) }}
            />
            <span className="truncate text-muted-foreground">{d.persona}</span>
            <span className="ml-auto font-medium tabular-nums">
              {Math.round((d.volume / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
