import * as React from "react";
import type { SiloCell } from "@/lib/api/types";

// Indigo heat: 0 → faint, 1 → solid brand. Returns an rgba.
function heat(t: number): string {
  const a = 0.06 + Math.max(0, Math.min(1, t)) * 0.84;
  return `rgba(99, 102, 241, ${a.toFixed(3)})`;
}

export function SiloMatrix({ cells }: { cells: SiloCell[] }) {
  const teams = [...new Set(cells.map((c) => c.from))];
  const lookup = new Map(cells.map((c) => [`${c.from}|${c.to}`, c.strength]));
  const abbr = (t: string) => t.slice(0, 3).toUpperCase();

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-1"
        style={{ gridTemplateColumns: `auto repeat(${teams.length}, minmax(2.25rem, 1fr))` }}
      >
        {/* header row */}
        <div />
        {teams.map((t) => (
          <div key={`h-${t}`} className="pb-1 text-center text-[10px] font-medium text-muted-foreground">
            {abbr(t)}
          </div>
        ))}

        {teams.map((from) => (
          <React.Fragment key={`row-${from}`}>
            <div className="flex items-center pr-2 text-[11px] font-medium text-muted-foreground">
              {from}
            </div>
            {teams.map((to) => {
              if (from === to) {
                return (
                  <div
                    key={`${from}-${to}`}
                    className="flex aspect-square items-center justify-center rounded bg-muted/40 text-[10px] text-muted-foreground/50"
                  >
                    —
                  </div>
                );
              }
              const s = lookup.get(`${from}|${to}`) ?? 0;
              return (
                <div
                  key={`${from}-${to}`}
                  title={`${from} ↔ ${to}: ${(s * 100).toFixed(0)}% of peak cross-team flow`}
                  className="flex aspect-square items-center justify-center rounded text-[10px] font-medium tabular-nums"
                  style={{ backgroundColor: heat(s), color: s > 0.55 ? "white" : "var(--muted-foreground)" }}
                >
                  {s >= 0.08 ? (s * 100).toFixed(0) : ""}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Darker = more cross-team communication. Faint rows/columns are siloed teams.
      </p>
    </div>
  );
}
