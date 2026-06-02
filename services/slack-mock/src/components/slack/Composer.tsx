"use client";

import { useRef } from "react";
import {
  BoldIcon, ItalicIcon, StrikeIcon, CodeIcon, LinkIcon, ListIcon,
  EmojiIcon, AtIcon, PlusIcon, VideoIcon, MicIcon, SendIcon,
} from "./icons";
import { sendMessage } from "@/app/actions";

export function Composer({
  channelId,
  placeholderTarget,
  threadTs,
  variant = "channel",
}: {
  channelId: string;
  placeholderTarget: string;
  /** when set, the composer posts a reply into this thread */
  threadTs?: string;
  /** "channel" = full toolbar w/ wrapper padding; "thread" = tighter footer composer */
  variant?: "channel" | "thread";
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendBtnRef = useRef<HTMLButtonElement>(null);

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

  function onSubmit() {
    // Defer the clear: React serializes the form's FormData synchronously during
    // this submit event. Clearing the value now would blank `text` before it's
    // captured (the action would get an empty body). RAF runs after dispatch.
    requestAnimationFrame(() => {
      if (inputRef.current) inputRef.current.value = "";
      syncSendState();
      inputRef.current?.focus();
    });
  }

  return (
    <div className={variant === "thread" ? "px-3 pb-3 pt-1" : "px-5 pb-5 pt-1"}>
      <form
        ref={formRef}
        action={sendMessage}
        onSubmit={onSubmit}
        className="overflow-hidden rounded-xl border border-[#a9a9a9]/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] focus-within:border-[#1d1c1d]/40"
      >
        <input type="hidden" name="channelId" value={channelId} />
        {threadTs && <input type="hidden" name="threadTs" value={threadTs} />}

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
