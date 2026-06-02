import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  deltaPct?: number; // signed, e.g. 12.8 or -4.2
  previous?: string; // e.g. "Prev 2.7"
  accent?: string; // hex, for the icon chip
  goodDirection?: "up" | "down"; // which direction is "good" (green)
  spark?: number[]; // optional inline sparkline series (real trend)
}

/** Minimal inline sparkline — normalized polyline, no axes. */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 100;
  const h = 22;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-5 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  icon,
  deltaPct,
  previous,
  accent = "#6366f1",
  goodDirection = "up",
  spark,
}: StatCardProps) {
  const hasDelta = deltaPct != null;
  const isUp = (deltaPct ?? 0) >= 0;
  const positive =
    goodDirection === "up" ? isUp : !isUp;

  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-center gap-2">
          {icon ? (
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ backgroundColor: `${accent}14`, color: accent }}
            >
              {icon}
            </span>
          ) : null}
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        </div>

        <div className="mt-2.5 text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </div>

        <div className="mt-1.5 flex items-center gap-2 text-xs">
          {hasDelta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                positive ? "text-emerald-600" : "text-red-600"
              )}
            >
              {isUp ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(deltaPct as number).toFixed(1)}%
            </span>
          ) : null}
          {previous ? (
            <span className="text-muted-foreground">{previous}</span>
          ) : null}
        </div>

        {spark && spark.length > 1 ? <Sparkline data={spark} color={accent} /> : null}
      </CardContent>
    </Card>
  );
}
