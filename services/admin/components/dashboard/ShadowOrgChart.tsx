import type { ShadowRankEntry } from "@/lib/api/types";
import { Initials, RankDelta } from "@/components/shared/bits";

const SENIORITY_LABEL: Record<ShadowRankEntry["seniority"], string> = {
  Exec: "Exec",
  Manager: "Manager",
  Lead: "Lead",
  IC: "IC",
};

export function ShadowOrgChart({ entries }: { entries: ShadowRankEntry[] }) {
  const movers = entries.filter((e) => e.gap > 0).slice(0, 6);
  const shown = movers.length ? movers : entries.slice(0, 6);

  return (
    <div className="flex flex-col divide-y">
      {shown.map((e) => (
        <div key={e.personId} className="flex items-center gap-3 py-2.5">
          <Initials name={e.name} persona={e.persona} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{e.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {e.title ?? SENIORITY_LABEL[e.seniority]}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs">
            <div className="text-right">
              <div className="font-semibold tabular-nums">#{e.influenceRank}</div>
              <div className="text-[10px] text-muted-foreground">influence</div>
            </div>
            <div className="text-right text-muted-foreground">
              <div className="tabular-nums">#{e.formalRank}</div>
              <div className="text-[10px]">title</div>
            </div>
            <RankDelta gap={e.gap} />
          </div>
        </div>
      ))}
    </div>
  );
}
