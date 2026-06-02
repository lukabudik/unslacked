import type { StoreMessage, StoreUser, ReactionGroup, ThreadMetaLite } from "@unslacked/db";
import { Message, type ThreadMeta } from "./Message";
import { dayKey, formatDayDivider, shouldGroup } from "./utils";

/**
 * Pure renderer: given a slice of TOP-LEVEL messages (ascending ts) plus
 * precomputed reactions/threads, render day dividers, consecutive-author
 * grouping, reactions and thread affordances. All pagination/scroll state and
 * the channel intro live in ChannelTimeline.
 */
export function MessageList({
  messages,
  users,
  reactions,
  threads,
  channelId,
}: {
  messages: StoreMessage[];
  users: Record<string, StoreUser>;
  reactions: Record<string, ReactionGroup[]>;
  threads: Record<string, ThreadMetaLite>;
  channelName: string;
  channelId: string;
  isDm: boolean;
}) {
  let lastDay = "";
  let prevTopLevel: StoreMessage | null = null;

  return (
    <div className="flex flex-col pb-3">
      {messages.map((m) => {
        const meta = threads[m.id];
        const thread: ThreadMeta | undefined =
          meta && meta.count > 0
            ? {
                count: meta.count,
                lastReplyTs: meta.lastReplyTs,
                participants: meta.participantIds
                  .map((id) => users[id])
                  .filter(Boolean) as StoreUser[],
              }
            : undefined;

        const dk = dayKey(m.ts);
        const showDivider = dk !== lastDay;
        if (showDivider) {
          lastDay = dk;
          prevTopLevel = null; // never group across a day boundary
        }
        const grouped = shouldGroup(prevTopLevel, m) && !thread; // don't collapse a thread parent header
        prevTopLevel = m;

        return (
          <div key={m.id}>
            {showDivider && <DayDivider label={formatDayDivider(m.ts)} />}
            <Message
              message={m}
              users={users}
              grouped={grouped}
              reactions={reactions[m.id]}
              thread={thread}
              channelId={channelId}
            />
          </div>
        );
      })}
    </div>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="relative my-2 flex items-center px-5">
      <span className="h-px flex-1 bg-[#e2e2e2]" />
      <span className="mx-2 rounded-full border border-[#e2e2e2] bg-white px-3 py-0.5 text-[13px] font-bold text-[#1d1c1d] shadow-sm">
        {label}
      </span>
      <span className="h-px flex-1 bg-[#e2e2e2]" />
    </div>
  );
}
