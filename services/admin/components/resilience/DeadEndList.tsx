import { UserX, AtSign } from "lucide-react";
import type { DeadEndRoute } from "@/lib/api/types";
import { Initials } from "@/components/shared/bits";
import { PersonaBadge } from "@/components/persona-badge";

function ago(iso: string): string {
  const days = Math.round((Date.now() - +new Date(iso)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export function DeadEndList({ routes }: { routes: DeadEndRoute[] }) {
  if (!routes.length) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-6 text-sm text-muted-foreground">
        <UserX className="h-4 w-4" />
        No dead-end routes — every routing target is an active member.
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {routes.map((r) => (
        <div key={r.userId} className="rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Initials name={r.name} persona={r.persona} />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background">
                <UserX className="h-3 w-3 text-red-500" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{r.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                Deactivated · last seen {ago(r.lastSeenAt)}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-red-600">
              <AtSign className="h-3.5 w-3.5" />
              {r.staleMentions}
              <span className="font-normal text-muted-foreground">stale mentions</span>
            </span>
            <PersonaBadge persona={r.persona} />
          </div>
          {r.groups.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {r.groups.map((g) => (
                <span key={g} className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  @{g}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
