import type { ExpertiseEntry } from "@/lib/api/types";
import { Initials } from "@/components/shared/bits";

export function ExpertiseList({ entries }: { entries: ExpertiseEntry[] }) {
  const max = Math.max(1, ...entries.map((e) => e.answers));
  return (
    <div className="flex flex-col divide-y">
      {entries.slice(0, 10).map((e) => (
        <div key={e.personId} className="flex items-center gap-3 py-2.5">
          <Initials name={e.name} persona={e.persona} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{e.name}</div>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {e.domains.slice(0, 3).map((d) => (
                <span key={d.id} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  #{d.label}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold tabular-nums">{e.answers}</div>
            <div className="text-[10px] text-muted-foreground">
              answers · {e.uniqueAskers} helped
            </div>
          </div>
          <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(e.answers / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
