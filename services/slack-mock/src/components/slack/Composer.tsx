import {
  BoldIcon, ItalicIcon, StrikeIcon, CodeIcon, LinkIcon, ListIcon,
  EmojiIcon, AtIcon, PlusIcon, VideoIcon, MicIcon, SendIcon,
} from "./icons";

export function Composer({ placeholderTarget }: { placeholderTarget: string }) {
  return (
    <div className="px-5 pb-5 pt-1">
      <div className="overflow-hidden rounded-xl border border-[#a9a9a9]/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] focus-within:border-[#1d1c1d]/40">
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

        {/* fake input row */}
        <div
          className="min-h-[44px] px-3 py-2.5 text-[15px] text-[#9b9b9b] select-none"
          role="textbox"
          aria-label={`Message ${placeholderTarget}`}
        >
          Message {placeholderTarget}
        </div>

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
            type="button"
            aria-label="Send"
            disabled
            className="flex size-7 items-center justify-center rounded-md bg-[#007a5a]/20 text-[#007a5a]/50"
          >
            <SendIcon className="size-4" />
          </button>
        </div>
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-[#9b9b9b]">
        This is a read-only mock — the composer doesn&apos;t send messages.
      </p>
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
