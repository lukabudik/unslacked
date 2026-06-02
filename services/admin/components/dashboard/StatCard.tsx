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
}

export function StatCard({
  label,
  value,
  icon,
  deltaPct,
  previous,
  accent = "#6366f1",
  goodDirection = "up",
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
      </CardContent>
    </Card>
  );
}
