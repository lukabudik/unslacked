import type { ReactionGroup } from "@/lib/store";
import { VIEWER_ID } from "@/lib/viewer";
import { cn } from "@/lib/utils";
import { toggleReactionAction } from "@/app/actions";

const QUICK_EMOJI = ["👍", "🎉", "❤️", "😄", "👀", "🙌", "✅", "🔥"];

export function ReactionBar({
  groups,
  channelId,
  messageId,
}: {
  groups: ReactionGroup[];
  channelId: string;
  messageId: string;
}) {
  if (!groups.length) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {groups.map((g) => {
        const mine = g.userIds.includes(VIEWER_ID);
        return (
          <form key={g.emoji} action={toggleReactionAction}>
            <input type="hidden" name="channelId" value={channelId} />
            <input type="hidden" name="messageId" value={messageId} />
            <input type="hidden" name="emoji" value={g.emoji} />
            <button
              type="submit"
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
          </form>
        );
      })}
      <AddReaction channelId={channelId} messageId={messageId} />
    </div>
  );
}

/**
 * The "＋" add-reaction control. CSS-only popover (group-hover/focus-within),
 * each emoji is its own toggle form — no client JS needed.
 */
export function AddReaction({
  channelId,
  messageId,
}: {
  channelId: string;
  messageId: string;
}) {
  return (
    <div className="relative inline-flex">
      <details className="group/add">
        <summary
          aria-label="Add reaction"
          className="flex h-[22px] cursor-pointer list-none items-center gap-0.5 rounded-full border border-black/10 bg-[#f8f8f8] px-1.5 text-[#616061] hover:border-black/20 hover:bg-[#f0f0f0] [&::-webkit-details-marker]:hidden"
        >
          <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="10" cy="10" r="7.25" />
            <path d="M7 8.5h.01M13 8.5h.01M7 12.5c.8.9 1.8 1.4 3 1.4s2.2-.5 3-1.4" strokeLinecap="round" />
          </svg>
          <span className="text-[11px] font-semibold">+</span>
        </summary>
        <div className="absolute bottom-full left-0 z-20 mb-1 flex gap-0.5 rounded-lg border border-black/10 bg-white p-1 shadow-lg">
          {QUICK_EMOJI.map((e) => (
            <form key={e} action={toggleReactionAction}>
              <input type="hidden" name="channelId" value={channelId} />
              <input type="hidden" name="messageId" value={messageId} />
              <input type="hidden" name="emoji" value={e} />
              <button
                type="submit"
                className="flex size-7 items-center justify-center rounded-md text-[15px] hover:bg-[#f4f4f4]"
              >
                {e}
              </button>
            </form>
          ))}
        </div>
      </details>
    </div>
  );
}
