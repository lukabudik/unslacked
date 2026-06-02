"use client";

import * as React from "react";
import { Area, AreaChart } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface KpiTileProps {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  trend?: number[];
  accent?: string; // hex
  delta?: { value: string; positive: boolean };
}

export function KpiTile({
  label,
  value,
  hint,
  icon,
  trend,
  accent = "#6366f1",
  delta,
}: KpiTileProps) {
  const chartData = (trend ?? []).map((v, i) => ({ i, v }));
  const chartConfig = {
    v: { label, color: accent },
  } satisfies ChartConfig;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              {label}
            </span>
            <span className="text-2xl font-semibold tabular-nums leading-none">
              {value}
            </span>
          </div>
          {icon ? (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ backgroundColor: `${accent}1a`, color: accent }}
            >
              {icon}
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            {delta ? (
              <span
                className={cn(
                  "font-medium",
                  delta.positive ? "text-emerald-600" : "text-red-600"
                )}
              >
                {delta.value}
              </span>
            ) : null}
            {hint ? <span className="text-muted-foreground">{hint}</span> : null}
          </div>

          {chartData.length > 1 ? (
            <ChartContainer config={chartConfig} className="h-10 w-24">
              <AreaChart
                data={chartData}
                margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id={`kpi-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={accent}
                  strokeWidth={2}
                  fill={`url(#kpi-${label})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
