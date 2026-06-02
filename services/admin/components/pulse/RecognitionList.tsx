import { Heart, ThumbsUp } from "lucide-react";
import type { RecognitionEntry } from "@/lib/api/types";
import { Initials } from "@/components/shared/bits";

export function RecognitionList({ entries }: { entries: RecognitionEntry[] }) {
  const max = Math.max(1, ...entries.map((e) => e.received));
  return (
    <div className="flex flex-col divide-y">
      {entries.map((e) => (
        <div key={e.personId} className="flex items-center gap-3 py-2.5">
          <Initials name={e.name} persona={e.persona} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{e.name}</div>
            <div className="mt-1 h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-rose-400" style={{ width: `${(e.received / max) * 100}%` }} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums">
            <span className="inline-flex items-center gap-1 font-medium text-rose-500">
              <Heart className="h-3.5 w-3.5" />
              {e.received}
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <ThumbsUp className="h-3.5 w-3.5" />
              {e.given}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
