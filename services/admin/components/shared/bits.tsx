import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { personaColor } from "@/lib/personas";
import { cn } from "@/lib/utils";

/** Person initials chip, colored by persona. */
export function Initials({
  name,
  persona,
  className,
}: {
  name: string;
  persona: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const color = personaColor(persona);
  return (
    <Avatar className={cn("h-7 w-7", className)}>
      <AvatarFallback
        className="text-[10px] font-semibold"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        {initials || "?"}
      </AvatarFallback>
    </Avatar>
  );
}

/** A thin horizontal score bar (0..1) with an optional explicit color. */
export function ScoreBar({
  value,
  color = "#6366f1",
  className,
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

/** Rank-movement indicator: positive gap = punches above title (green up). */
export function RankDelta({ gap }: { gap: number }) {
  const Icon = gap > 0 ? ArrowUp : gap < 0 ? ArrowDown : Minus;
  const cls = gap > 0 ? "text-emerald-600" : gap < 0 ? "text-amber-600" : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", cls)}>
      <Icon className="h-3 w-3" />
      {Math.abs(gap)}
    </span>
  );
}
