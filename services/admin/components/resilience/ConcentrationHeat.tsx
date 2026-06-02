import type { TopicOwnership } from "@/lib/api/types";
import { Initials, ScoreBar } from "@/components/shared/bits";

const CONC = {
  single: { label: "Single owner", color: "#ef4444" },
  thin: { label: "Thin", color: "#f59e0b" },
  healthy: { label: "Healthy", color: "#10b981" },
} as const;

export function ConcentrationHeat({ topics }: { topics: TopicOwnership[] }) {
  return (
    <div className="flex flex-col divide-y">
      {topics.slice(0, 10).map((t) => {
        const meta = CONC[t.concentration];
        return (
          <div key={t.topicId} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-sm">#{t.topicLabel}</span>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                  {meta.label}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <ScoreBar value={t.ownerShare} color={meta.color} className="max-w-[160px]" />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {(t.ownerShare * 100).toFixed(0)}% · {t.contributors} ppl
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Initials name={t.ownerName} persona={t.persona} className="h-6 w-6" />
              <span className="hidden text-xs text-muted-foreground sm:inline">{t.ownerName}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
