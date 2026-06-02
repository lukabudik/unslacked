"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { personaColor } from "@/lib/personas";
import type { Persona } from "@/lib/api/types";

const config = { volume: { label: "Messages" } } satisfies ChartConfig;

export function PersonaVolumeChart({
  data,
}: {
  data: { persona: Persona; volume: number }[];
}) {
  return (
    <ChartContainer config={config} className="h-[240px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="persona"
          tickLine={false}
          axisLine={false}
          width={84}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="volume" radius={4} barSize={18}>
          {data.map((d) => (
            <Cell key={d.persona} fill={personaColor(d.persona)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
