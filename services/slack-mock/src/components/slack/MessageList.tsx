import type { StoreMessage, StoreUser, ReactionGroup } from "@/lib/store";
import { Message, type ThreadMeta } from "./Message";
import { dayKey, formatDayDivider, shouldGroup } from "./utils";

export function MessageList({
  messages,
  users,
  reactions,
  channelName,
  isDm,
}: {
  messages: StoreMessage[];
  users: Record<string, StoreUser>;
  reactions: Record<string, ReactionGroup[]>;
  channelName: string;
  isDm: boolean;
}) {
  // Split parents vs replies. A reply has threadTs pointing at its parent id.
  const replyMap = new Map<string, StoreMessage[]>();
  const parents: StoreMessage[] = [];
  for (const m of messages) {
    if (m.threadTs && m.threadTs !== m.id) {
      const arr = replyMap.get(m.threadTs) ?? [];
      arr.push(m);
      replyMap.set(m.threadTs, arr);
    } else {
      parents.push(m);
    }
  }
  // messages already arrive sorted asc by ts.

  let lastDay = "";
  let prevTopLevel: StoreMessage | null = null;

  return (
    <div className="flex flex-col pt-4 pb-3">
      <ConversationStart channelName={channelName} isDm={isDm} />

      {parents.map((m) => {
        const replies = (replyMap.get(m.id) ?? []).sort((a, b) => a.ts.localeCompare(b.ts));
        const thread: ThreadMeta | undefined = replies.length
          ? {
              count: replies.length,
              lastReplyTs: replies[replies.length - 1].ts,
              participants: dedupeUsers(replies.map((r) => users[r.userId]).filter(Boolean) as StoreUser[]),
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
            />
          </div>
        );
      })}
    </div>
  );
}

function dedupeUsers(arr: StoreUser[]): StoreUser[] {
  const seen = new Set<string>();
  const out: StoreUser[] = [];
  for (const u of arr) {
    if (seen.has(u.id)) continue;
    seen.add(u.id);
    out.push(u);
  }
  return out;
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

function ConversationStart({ channelName, isDm }: { channelName: string; isDm: boolean }) {
  return (
    <div className="px-5 pt-4 pb-2">
      {isDm ? (
        <p className="text-[15px] leading-relaxed text-[#616061]">
          This is the very beginning of your direct message history with{" "}
          <span className="font-bold text-[#1d1c1d]">{channelName}</span>.
        </p>
      ) : (
        <>
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-[#f0f0f0] text-2xl">👋</div>
          <h2 className="text-[22px] font-extrabold text-[#1d1c1d]">
            #{channelName}
          </h2>
          <p className="mt-1 text-[15px] leading-relaxed text-[#616061]">
            This is the very beginning of the{" "}
            <span className="font-bold text-[#1d1c1d]">#{channelName}</span> channel.
          </p>
        </>
      )}
    </div>
  );
}
