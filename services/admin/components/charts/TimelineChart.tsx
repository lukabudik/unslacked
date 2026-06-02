"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ActivityPoint } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { DateRangePicker, type RangePreset } from "./DateRangePicker";

const SERIES = [
  { key: "messages", label: "Messages", color: "var(--chart-1)" },
  { key: "threadReplies", label: "Thread replies", color: "var(--chart-2)" },
  { key: "mentions", label: "@-mentions", color: "var(--chart-4)" },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

const config = Object.fromEntries(
  SERIES.map((s) => [s.key, { label: s.label, color: s.color }])
) satisfies ChartConfig;

function presetStart(maxDate: string, days: number, minDate: string): string {
  const [y, m, d] = maxDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  start.setDate(start.getDate() - (days - 1));
  const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  return iso < minDate ? minDate : iso;
}

export function TimelineChart({ data }: { data: ActivityPoint[] }) {
  const [hidden, setHidden] = React.useState<Set<SeriesKey>>(new Set());
  const [preset, setPreset] = React.useState<RangePreset>("month");

  const minDate = data[0]?.date ?? "";
  const maxDate = data[data.length - 1]?.date ?? "";
  const [from, setFrom] = React.useState(() => presetStart(maxDate, 30, minDate));
  const [to, setTo] = React.useState(maxDate);

  React.useEffect(() => {
    setFrom(presetStart(maxDate, 30, minDate));
    setTo(maxDate);
    setPreset("month");
  }, [minDate, maxDate]);

  const filtered = React.useMemo(
    () => data.filter((d) => d.date >= from && d.date <= to),
    [data, from, to]
  );

  function toggle(key: SeriesKey) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < SERIES.length - 1) next.add(key);
      return next;
    });
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {SERIES.map((s) => {
            const off = hidden.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                  off
                    ? "border-transparent text-muted-foreground/60 hover:text-muted-foreground"
                    : "bg-card hover:bg-muted/60"
                )}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: off ? "var(--muted-foreground)" : s.color }}
                />
                {s.label}
              </button>
            );
          })}
        </div>

        <DateRangePicker
          from={from}
          to={to}
          min={minDate}
          max={maxDate}
          preset={preset}
          onChange={(next) => {
            setFrom(next.from);
            setTo(next.to);
            setPreset(next.preset);
          }}
        />
      </div>

      <ChartContainer config={config} className="h-[300px] w-full">
        <AreaChart data={filtered} margin={{ left: 4, right: 8, top: 8 }}>
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.28} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tick={{ fontSize: 11 }}
          />
          <YAxis hide />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
          {SERIES.filter((s) => !hidden.has(s.key)).map((s) => (
            <Area
              key={s.key}
              dataKey={s.key}
              type="monotone"
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#fill-${s.key})`}
              stackId="a"
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
