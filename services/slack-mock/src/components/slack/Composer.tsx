"use client";

import { useEffect, useRef, useState } from "react";
import type { StoreUser } from "@unslacked/db";
import {
  BoldIcon, ItalicIcon, StrikeIcon, CodeIcon, LinkIcon, ListIcon,
  EmojiIcon, AtIcon, PlusIcon, VideoIcon, MicIcon, SendIcon,
} from "./icons";
import { askAssistant, postAndCheckRouting } from "@/app/actions";
import { AssistantNudge } from "./AssistantNudge";

type Verdict = { ownerId: string; reason: string; lastText: string };

export function Composer({
  channelId,
  placeholderTarget,
  threadTs,
  variant = "channel",
  mode = "normal",
  users,
}: {
  channelId: string;
  placeholderTarget: string;
  /** when set, the composer posts a reply into this thread */
  threadTs?: string;
  /** "channel" = full toolbar w/ wrapper padding; "thread" = tighter footer composer */
  variant?: "channel" | "thread";
  /** "assistant" = DM the bot (askAssistant); "normal" = post + routing check */
  mode?: "assistant" | "normal";
  /** user map for rendering mention pills inside the routing nudge */
  users?: Record<string, StoreUser>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendBtnRef = useRef<HTMLButtonElement>(null);

  // ephemeral routing nudge — clears on channel switch and on each new send
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  useEffect(() => setVerdict(null), [channelId]);

  function syncSendState() {
    const btn = sendBtnRef.current;
    const val = inputRef.current?.value.trim() ?? "";
    if (!btn) return;
    const enabled = val.length > 0;
    btn.disabled = !enabled;
    btn.className = enabled
      ? "flex size-7 items-center justify-center rounded-md bg-[#007a5a] text-white transition-colors hover:bg-[#148567]"
      : "flex size-7 items-center justify-center rounded-md bg-[#007a5a]/20 text-[#007a5a]/50";
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if ((inputRef.current?.value.trim() ?? "").length === 0) return;
      formRef.current?.requestSubmit();
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = inputRef.current?.value.trim() ?? "";
    if (!text) return;

    // clear + refocus immediately; we already captured the text above
    if (inputRef.current) inputRef.current.value = "";
    syncSendState();
    inputRef.current?.focus();
    // a new send always supersedes any prior nudge
    setVerdict(null);

    if (mode === "assistant") {
      await askAssistant(channelId, text);
      return;
    }

    const result = await postAndCheckRouting(channelId, text, threadTs);
    if (result.misrouted && result.ownerId && result.reason) {
      setVerdict({ ownerId: result.ownerId, reason: result.reason, lastText: text });
    }
  }

  return (
    <div className={variant === "thread" ? "px-3 pb-3 pt-1" : "px-5 pb-5 pt-1"}>
      {verdict && users && (
        <AssistantNudge
          ownerId={verdict.ownerId}
          reason={verdict.reason}
          lastText={verdict.lastText}
          users={users}
          onDismiss={() => setVerdict(null)}
        />
      )}

      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="overflow-hidden rounded-xl border border-[#a9a9a9]/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] focus-within:border-[#1d1c1d]/40"
      >
        {/* formatting toolbar */}
        <div className="flex items-center gap-0.5 border-b border-[#e8e8e8] px-2 py-1.5">
          <ToolbarBtn label="Bold"><BoldIcon className="size-4" /></ToolbarBtn>
          <ToolbarBtn label="Italic"><ItalicIcon className="size-4" /></ToolbarBtn>
          <ToolbarBtn label="Strikethrough"><StrikeIcon className="size-4" /></ToolbarBtn>
          <Divider />
          <ToolbarBtn label="Link"><LinkIcon className="size-4" /></ToolbarBtn>
          <ToolbarBtn label="Ordered list"><ListIcon className="size-4" /></ToolbarBtn>
          <ToolbarBtn label="Code"><CodeIcon className="size-4" /></ToolbarBtn>
        </div>

        {/* real input row */}
        <textarea
          ref={inputRef}
          name="text"
          rows={1}
          autoComplete="off"
          onChange={syncSendState}
          onKeyDown={onKeyDown}
          placeholder={`Message ${placeholderTarget}`}
          className="block max-h-40 min-h-[44px] w-full resize-none border-0 bg-transparent px-3 py-2.5 text-[15px] text-[#1d1c1d] outline-none placeholder:text-[#9b9b9b]"
          aria-label={`Message ${placeholderTarget}`}
        />

        {/* action row */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            <ToolbarBtn label="Add"><PlusIcon className="size-[18px]" /></ToolbarBtn>
            <Divider />
            <ToolbarBtn label="Emoji"><EmojiIcon className="size-[18px]" /></ToolbarBtn>
            <ToolbarBtn label="Mention"><AtIcon className="size-[18px]" /></ToolbarBtn>
            <ToolbarBtn label="Record video"><VideoIcon className="size-[18px]" /></ToolbarBtn>
            <ToolbarBtn label="Record audio"><MicIcon className="size-[18px]" /></ToolbarBtn>
          </div>
          <button
            ref={sendBtnRef}
            type="submit"
            aria-label="Send"
            disabled
            className="flex size-7 items-center justify-center rounded-md bg-[#007a5a]/20 text-[#007a5a]/50"
          >
            <SendIcon className="size-4" />
          </button>
        </div>
      </form>

      {mode === "assistant" && variant === "channel" && (
        <p className="mt-1.5 px-1 text-[12.5px] text-[#9b9b9b]">
          Ask me who owns what — e.g. &ldquo;who handles billing?&rdquo;
        </p>
      )}
    </div>
  );
}

function ToolbarBtn({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-md text-[#616061] hover:bg-[#f4f4f4]"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-4 w-px bg-[#e2e2e2]" />;
}
