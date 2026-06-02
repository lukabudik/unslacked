import Link from "next/link";
import { getReplies, getReactions } from "@/lib/store";
import type { StoreUser } from "@/lib/store";
import { Message } from "./Message";
import { Composer } from "./Composer";

/**
 * Right-hand thread panel. URL-driven: rendered by the channel page whenever
 * `?thread=<parentMessageId>` is present. getReplies returns the parent first
 * (id === threadTs) followed by every reply, sorted ascending.
 */
export async function ThreadPanel({
  channelId,
  parentId,
  channelLabel,
  isDm,
  users,
}: {
  channelId: string;
  parentId: string;
  channelLabel: string;
  isDm: boolean;
  users: Record<string, StoreUser>;
}) {
  const [thread, reactions] = await Promise.all([
    getReplies(parentId),
    getReactions(channelId),
  ]);

  if (!thread.length) {
    return (
      <ThreadShell channelId={channelId} channelLabel={channelLabel} isDm={isDm}>
        <div className="px-5 py-6 text-[13px] text-[#616061]">This thread no longer exists.</div>
      </ThreadShell>
    );
  }

  const [parent, ...replies] = thread;

  return (
    <ThreadShell channelId={channelId} channelLabel={channelLabel} isDm={isDm}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
        {/* parent message */}
        <Message
          message={parent}
          users={users}
          grouped={false}
          reactions={reactions[parent.id]}
          channelId={channelId}
        />

        {/* replies divider */}
        <div className="my-2 flex items-center gap-2 px-5">
          <span className="text-[13px] font-bold text-[#616061]">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </span>
          <span className="h-px flex-1 bg-[#e2e2e2]" />
        </div>

        {replies.map((r) => (
          <Message
            key={r.id}
            message={r}
            users={users}
            grouped={false}
            reactions={reactions[r.id]}
            channelId={channelId}
            compact
          />
        ))}
      </div>

      {/* thread composer */}
      <Composer
        channelId={channelId}
        threadTs={parentId}
        placeholderTarget="thread"
        variant="thread"
      />
    </ThreadShell>
  );
}

function ThreadShell({
  channelId,
  channelLabel,
  isDm,
  children,
}: {
  channelId: string;
  channelLabel: string;
  isDm: boolean;
  children: React.ReactNode;
}) {
  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-[#e2e2e2] bg-white lg:w-[420px]">
      <header className="flex h-[49px] shrink-0 items-center justify-between border-b border-[#e2e2e2] px-4">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-[18px] font-extrabold text-[#1d1c1d]">Thread</span>
          <span className="truncate text-[13px] text-[#616061]">
            {isDm ? channelLabel : `#${channelLabel}`}
          </span>
        </div>
        <Link
          href={`/c/${channelId}`}
          aria-label="Close thread"
          className="flex size-8 items-center justify-center rounded-md text-[#616061] hover:bg-[#f4f4f4]"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="m5 5 10 10M15 5 5 15" />
          </svg>
        </Link>
      </header>
      {children}
    </aside>
  );
}
