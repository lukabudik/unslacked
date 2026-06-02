import type { MiddlemanInsight, Person } from "@/lib/api/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PersonaBadge } from "@/components/persona-badge";
import { personaColor } from "@/lib/personas";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MiddlemenList({
  middlemen,
  people,
}: {
  middlemen: MiddlemanInsight[];
  people: Person[];
}) {
  const byId = new Map(people.map((p) => [p.id, p]));
  return (
    <div className="space-y-1">
      {middlemen.map((m) => {
        const p = byId.get(m.personId);
        if (!p) return null;
        const color = personaColor(p.persona);
        return (
          <div
            key={m.personId}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback
                className="text-xs font-medium"
                style={{ backgroundColor: `${color}1f`, color }}
              >
                {initials(p.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">{p.name}</span>
                <PersonaBadge persona={p.persona} />
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                bridges {m.bridgesPairs} pairs · {m.redundantRelays} redundant relays
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold tabular-nums text-red-500">
                {(m.betweenness * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                betweenness
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
