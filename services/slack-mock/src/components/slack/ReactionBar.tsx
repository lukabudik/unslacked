import type { ReactionGroup } from "@/lib/store";
import { VIEWER_ID } from "@/lib/viewer";
import { cn } from "@/lib/utils";

export function ReactionBar({ groups }: { groups: ReactionGroup[] }) {
  if (!groups.length) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {groups.map((g) => {
        const mine = g.userIds.includes(VIEWER_ID);
        return (
          <button
            key={g.emoji}
            type="button"
            className={cn(
              "flex h-[22px] items-center gap-1 rounded-full border px-2 text-xs leading-none transition-colors",
              mine
                ? "border-[#1d9bd1] bg-[#e8f5fb] text-[#1264a3]"
                : "border-black/10 bg-[#f8f8f8] text-[#454447] hover:border-black/20 hover:bg-[#f0f0f0]",
            )}
          >
            <span className="text-[13px]">{g.emoji}</span>
            <span className="font-semibold tabular-nums">{g.count}</span>
          </button>
        );
      })}
      <button
        type="button"
        aria-label="Add reaction"
        className="flex h-[22px] items-center gap-0.5 rounded-full border border-black/10 bg-[#f8f8f8] px-1.5 text-[#616061] hover:border-black/20 hover:bg-[#f0f0f0]"
      >
        <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="10" cy="10" r="7.25" />
          <path d="M7 8.5h.01M13 8.5h.01M7 12.5c.8.9 1.8 1.4 3 1.4s2.2-.5 3-1.4" strokeLinecap="round" />
        </svg>
        <span className="text-[11px] font-semibold">+</span>
      </button>
    </div>
  );
}
