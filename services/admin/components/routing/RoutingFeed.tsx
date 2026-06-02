import { ArrowRight, Check, Clock, X } from "lucide-react";
import type { RoutingEvent } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS = {
  accepted: { label: "Accepted", icon: Check, cls: "border-emerald-500/40 text-emerald-600" },
  suggested: { label: "Suggested", icon: Clock, cls: "border-amber-500/40 text-amber-600" },
  dismissed: { label: "Dismissed", icon: X, cls: "border-muted-foreground/30 text-muted-foreground" },
} as const;

function timeAgo(iso: string) {
  const diff = Date.now() - +new Date(iso);
  const m = Math.round(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function RoutingFeed({
  events,
  nameById,
  bare = false,
}: {
  events: RoutingEvent[];
  nameById: (id: string) => string;
  bare?: boolean;
}) {
  return (
    <div className={cn("divide-y", !bare && "rounded-lg border")}>
      {events.map((e) => {
        const s = STATUS[e.status];
        const Icon = s.icon;
        return (
          <div key={e.id} className="flex items-center gap-3 p-3 text-sm">
            <Badge variant="outline" className={cn("gap-1 shrink-0", s.cls)}>
              <Icon className="h-3 w-3" />
              {s.label}
            </Badge>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-medium">{nameById(e.requesterId)}</span>
                <span className="text-muted-foreground">asked for</span>
                <span className="truncate text-muted-foreground line-through decoration-muted-foreground/40">
                  {nameById(e.intendedRecipientId)}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium text-emerald-600">
                  {nameById(e.suggestedRecipientId)}
                </span>
              </div>
            </div>
            {e.hopsSaved > 0 ? (
              <span className="shrink-0 text-xs font-medium text-emerald-600">
                −{e.hopsSaved} hop{e.hopsSaved > 1 ? "s" : ""}
              </span>
            ) : null}
            <span className="shrink-0 text-xs text-muted-foreground">
              {timeAgo(e.at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
