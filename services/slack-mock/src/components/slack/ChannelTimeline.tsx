"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { StoreMessage, StoreUser, ReactionGroup, ThreadMetaLite, TimelinePage } from "@unslacked/db";
import { MessageList } from "./MessageList";
import { loadOlderMessages } from "@/app/actions";

/**
 * Owns the scrollable conversation area and all client-side pagination state.
 *
 * - Mount / channel change: jump to the bottom (newest) with no visible scroll.
 * - Revalidation (e.g. composer posts → server sends a fresh newest page): the
 *   `initialPage` prop changes identity, we reset accumulated state to it and
 *   re-stick to the bottom, so a freshly posted message appears at the bottom.
 * - Scroll up near the top: fetch the older chunk via `loadOlderMessages`,
 *   prepend (deduped) and preserve the viewport position so it doesn't jump.
 */
export function ChannelTimeline({
  channelId,
  initialPage,
  users,
  channelName,
  isDm,
}: {
  channelId: string;
  initialPage: TimelinePage;
  users: Record<string, StoreUser>;
  channelName: string;
  isDm: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<StoreMessage[]>(initialPage.messages);
  const [reactions, setReactions] = useState<Record<string, ReactionGroup[]>>(initialPage.reactions);
  const [threads, setThreads] = useState<Record<string, ThreadMetaLite>>(initialPage.threads);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [loading, setLoading] = useState(false);

  // Track which initial page is currently materialized in state so we can detect
  // a fresh page arriving from the server (revalidation / channel switch).
  const appliedPageRef = useRef(initialPage);
  // After a prepend, restore scroll position: remember the pre-render scrollHeight.
  const prependAnchorRef = useRef<number | null>(null);
  // After a reset (mount / channel change / revalidate), stick to the bottom.
  const stickToBottomRef = useRef(true);

  // Reset accumulated state whenever a new initial page arrives.
  if (appliedPageRef.current !== initialPage) {
    appliedPageRef.current = initialPage;
    setMessages(initialPage.messages);
    setReactions(initialPage.reactions);
    setThreads(initialPage.threads);
    setHasMore(initialPage.hasMore);
    setLoading(false);
    prependAnchorRef.current = null;
    stickToBottomRef.current = true;
  }

  // Place the viewport: stick to bottom on reset, or preserve position on prepend.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (prependAnchorRef.current !== null) {
      const delta = el.scrollHeight - prependAnchorRef.current;
      el.scrollTop += delta;
      prependAnchorRef.current = null;
      return;
    }

    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      stickToBottomRef.current = false;
    }
  }, [messages]);

  const loadOlder = useCallback(async () => {
    if (loading || !hasMore) return;
    const oldest = messages[0];
    if (!oldest) return;

    setLoading(true);
    try {
      const page = await loadOlderMessages(channelId, oldest.ts);

      // Capture height right before we commit the prepend so the layout effect
      // can offset scrollTop by exactly the inserted height.
      const el = scrollRef.current;
      if (el) prependAnchorRef.current = el.scrollHeight;

      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const older = page.messages.filter((m) => !seen.has(m.id));
        if (older.length === 0) {
          prependAnchorRef.current = null; // nothing inserted, don't offset
          return prev;
        }
        return [...older, ...prev];
      });
      setReactions((prev) => ({ ...page.reactions, ...prev }));
      setThreads((prev) => ({ ...page.threads, ...prev }));
      setHasMore(page.hasMore);
    } finally {
      setLoading(false);
    }
  }, [channelId, hasMore, loading, messages]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < 120 && hasMore && !loading) {
      void loadOlder();
    }
  }, [hasMore, loading, loadOlder]);

  // If the initial page already fits without a scrollbar but more exist, kick a
  // load so the user can reach older history.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (hasMore && !loading && el.scrollHeight <= el.clientHeight) {
      void loadOlder();
    }
  }, [hasMore, loading, loadOlder]);

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      <div className="flex flex-col pt-4">
        {hasMore ? (
          <TopLoader loading={loading} />
        ) : (
          <>
            <ConversationStart channelName={channelName} isDm={isDm} />
            {messages.length > 0 && <BeginningSentinel channelName={channelName} isDm={isDm} />}
          </>
        )}

        <MessageList
          messages={messages}
          users={users}
          reactions={reactions}
          threads={threads}
          channelName={channelName}
          channelId={channelId}
          isDm={isDm}
        />
      </div>
    </div>
  );
}

function TopLoader({ loading }: { loading: boolean }) {
  return (
    <div className="flex h-8 items-center justify-center">
      {loading && (
        <span className="size-4 animate-spin rounded-full border-2 border-[#e2e2e2] border-t-[#9b9b9b]" />
      )}
    </div>
  );
}

function BeginningSentinel({ channelName, isDm }: { channelName: string; isDm: boolean }) {
  return (
    <div className="px-5 pb-1 text-[13px] text-[#9b9b9b]">
      🎉 This is the beginning of {isDm ? channelName : `#${channelName}`}
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
          <h2 className="text-[22px] font-extrabold text-[#1d1c1d]">#{channelName}</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-[#616061]">
            This is the very beginning of the{" "}
            <span className="font-bold text-[#1d1c1d]">#{channelName}</span> channel.
          </p>
        </>
      )}
    </div>
  );
}
