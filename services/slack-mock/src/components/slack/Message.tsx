import type { StoreMessage, StoreUser, ReactionGroup } from "@/lib/store";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";
import { RichText } from "./RichText";
import { ReactionBar } from "./ReactionBar";
import { displayName, formatTime } from "./utils";
import { ThreadIcon } from "./icons";

export interface ThreadMeta {
  count: number;
  participants: StoreUser[];
  lastReplyTs: string;
}

export function Message({
  message,
  users,
  grouped,
  reactions,
  thread,
  compact = false,
}: {
  message: StoreMessage;
  users: Record<string, StoreUser>;
  grouped: boolean;
  reactions?: ReactionGroup[];
  thread?: ThreadMeta;
  /** thread-panel style replies render slightly tighter */
  compact?: boolean;
}) {
  const user = users[message.userId];
  const name = displayName(users, message.userId);

  return (
    <div
      className={cn(
        "group relative flex gap-2 px-5 transition-colors hover:bg-[#f8f8f8]",
        grouped ? "py-px" : "mt-2 pt-1",
      )}
    >
      {/* gutter: avatar (first of run) or hover timestamp */}
      <div className="w-9 shrink-0">
        {grouped ? (
          <span className="mt-0.5 hidden text-right text-[10px] leading-5 text-[#9b9b9b] tabular-nums group-hover:block">
            {formatTime(message.ts)}
          </span>
        ) : (
          <UserAvatar user={user} size="md" className="mt-0.5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-extrabold leading-5 text-[#1d1c1d] hover:underline">
              {name}
            </span>
            {user?.isBot && (
              <span className="rounded-[3px] bg-[#e8e8e8] px-1 text-[10px] font-bold uppercase leading-4 tracking-wide text-[#616061]">
                App
              </span>
            )}
            {user?.title && (
              <span className="hidden truncate text-[12px] text-[#616061] sm:inline">{user.title}</span>
            )}
            <span className="text-[12px] leading-5 text-[#9b9b9b]">{formatTime(message.ts)}</span>
          </div>
        )}

        <div className={cn("text-[15px] leading-[1.46] text-[#1d1c1d]", compact && "leading-[1.4]")}>
          <RichText text={message.text} users={users} />
        </div>

        {reactions && <ReactionBar groups={reactions} />}

        {thread && thread.count > 0 && (
          <button
            type="button"
            className="mt-1.5 inline-flex max-w-full items-center gap-2 rounded-lg border border-transparent py-0.5 pr-2 pl-1 text-left transition-colors hover:border-[#ddd] hover:bg-white hover:shadow-sm"
          >
            <span className="flex -space-x-1">
              {thread.participants.slice(0, 4).map((p) => (
                <UserAvatar key={p.id} user={p} size="sm" className="ring-2 ring-white" />
              ))}
            </span>
            <span className="text-[13px] font-bold text-[#1264a3] hover:underline">
              {thread.count} {thread.count === 1 ? "reply" : "replies"}
            </span>
            <span className="hidden items-center gap-1 text-[12px] text-[#616061] group-hover:flex">
              View thread
            </span>
            <ThreadIcon className="size-3.5 text-[#9b9b9b]" />
          </button>
        )}
      </div>

      {/* hover action toolbar */}
      <MessageActions />
    </div>
  );
}

function MessageActions() {
  return (
    <div className="absolute -top-3 right-4 hidden rounded-lg border border-black/10 bg-white shadow-md group-hover:flex">
      {["😀", "👍", "✅"].map((e) => (
        <button
          key={e}
          type="button"
          className="flex size-8 items-center justify-center rounded-md text-[15px] hover:bg-[#f4f4f4]"
        >
          {e}
        </button>
      ))}
      <span className="my-1 w-px bg-black/10" />
      <button
        type="button"
        aria-label="Reply in thread"
        className="flex size-8 items-center justify-center rounded-md text-[#616061] hover:bg-[#f4f4f4]"
      >
        <ThreadIcon className="size-4" />
      </button>
      <button
        type="button"
        aria-label="More actions"
        className="flex size-8 items-center justify-center rounded-md text-[#616061] hover:bg-[#f4f4f4]"
      >
        <svg viewBox="0 0 20 20" className="size-4" fill="currentColor">
          <circle cx="4" cy="10" r="1.4" /><circle cx="10" cy="10" r="1.4" /><circle cx="16" cy="10" r="1.4" />
        </svg>
      </button>
    </div>
  );
}
