import { Moon, AtSign, MessagesSquare } from "lucide-react";
import type { OverloadEntry } from "@/lib/api/types";
import { Initials, ScoreBar } from "@/components/shared/bits";
import { betweennessColor } from "@/lib/personas";

export function OverloadList({ entries }: { entries: OverloadEntry[] }) {
  return (
    <div className="flex flex-col divide-y">
      {entries.map((e, i) => (
        <div key={e.personId} className="flex items-center gap-3 py-2.5">
          <span className="w-4 text-xs font-medium tabular-nums text-muted-foreground">{i + 1}</span>
          <Initials name={e.name} persona={e.persona} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{e.name}</div>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <AtSign className="h-3 w-3" />
                {e.mentionsReceived}
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <MessagesSquare className="h-3 w-3" />
                {e.threadsPulledInto}
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Moon className="h-3 w-3" />
                {(e.afterHoursPct * 100).toFixed(0)}% after-hours
              </span>
            </div>
          </div>
          <div className="flex w-24 shrink-0 flex-col items-end gap-1">
            <span className="text-sm font-semibold tabular-nums" style={{ color: betweennessColor(e.overloadScore) }}>
              {(e.overloadScore * 100).toFixed(0)}
            </span>
            <ScoreBar value={e.overloadScore} color={betweennessColor(e.overloadScore)} className="w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
