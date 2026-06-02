"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { SidebarChannel } from "./types";
import { HashIcon, LockIcon, ChevronIcon, PlusIcon } from "./icons";

export function Sidebar({
  workspaceName,
  channels,
  dms,
  assistant,
}: {
  workspaceName: string;
  channels: SidebarChannel[];
  dms: SidebarChannel[];
  /** the pinned viewer↔bot DM entry */
  assistant?: { id: string; label: string };
}) {
  const pathname = usePathname();
  const activeId = decodeURIComponent(pathname.split("/c/")[1] ?? "");

  return (
    <nav className="flex h-full w-[260px] shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      {/* workspace header */}
      <div className="flex h-[49px] shrink-0 items-center justify-between border-b border-white/10 px-3.5">
        <button type="button" className="flex items-center gap-1 rounded-md py-1 pr-1 text-left hover:bg-white/10">
          <span className="text-[18px] font-extrabold leading-tight text-white">{workspaceName}</span>
          <ChevronIcon className="size-4 text-white/80" />
        </button>
        <button
          type="button"
          aria-label="New message"
          className="flex size-7 items-center justify-center rounded-md bg-white text-sidebar"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13.5 3.5 16.5 6.5 7 16l-3.5.5L4 13z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 [scrollbar-width:thin]">
        {assistant && (
          <div className="mb-3 px-2">
            <Link
              href={`/c/${assistant.id}`}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2 py-[6px] text-[15px] leading-tight",
                assistant.id === activeId
                  ? "bg-sidebar-primary font-semibold text-white"
                  : "text-sidebar-foreground hover:bg-white/10 hover:text-white",
              )}
            >
              <span className="flex size-[20px] shrink-0 items-center justify-center rounded-[5px] bg-gradient-to-br from-[#7c3aed] to-[#2563eb] text-[12px]">
                ✨
              </span>
              <span className="truncate font-semibold">{assistant.label}</span>
            </Link>
          </div>
        )}

        <Section title="Channels" defaultOpen>
          {channels.map((c) => (
            <SidebarLink key={c.id} channel={c} active={c.id === activeId} />
          ))}
          <AddRow label="Add channels" />
        </Section>

        <Section title="Direct messages" defaultOpen>
          {dms.map((c) => (
            <SidebarLink key={c.id} channel={c} active={c.id === activeId} />
          ))}
          <AddRow label="Invite people" />
        </Section>
      </div>
    </nav>
  );
}

function Section({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <div className="mb-3 px-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-[13px] font-semibold text-sidebar-foreground/80 hover:bg-white/5"
      >
        <ChevronIcon className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
        {title}
      </button>
      {open && <div className="mt-0.5 space-y-px">{children}</div>}
    </div>
  );
}

function SidebarLink({ channel, active }: { channel: SidebarChannel; active: boolean }) {
  const isDm = channel.kind === "im" || channel.kind === "mpim";
  return (
    <Link
      href={`/c/${channel.id}`}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-[5px] text-[15px] leading-tight",
        active
          ? "bg-sidebar-primary font-semibold text-white"
          : "text-sidebar-foreground hover:bg-white/10 hover:text-white",
      )}
    >
      {isDm ? (
        <span className="relative flex size-[18px] shrink-0 items-center justify-center">
          <span
            className={cn(
              "size-2.5 rounded-full border",
              channel.dm?.online
                ? "border-transparent bg-[#2bac76]"
                : active
                  ? "border-white/70 bg-transparent"
                  : "border-sidebar-foreground/70 bg-transparent",
            )}
          />
        </span>
      ) : channel.kind === "private_channel" ? (
        <LockIcon className="size-[18px] shrink-0 opacity-90" />
      ) : (
        <HashIcon className="size-[18px] shrink-0 opacity-90" />
      )}
      <span className="truncate">{channel.label}</span>
      {channel.dm?.statusEmoji && <span className="ml-auto text-[13px]">{channel.dm.statusEmoji}</span>}
    </Link>
  );
}

function AddRow({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-[15px] text-sidebar-foreground/80 hover:bg-white/10 hover:text-white"
    >
      <span className="flex size-[18px] items-center justify-center rounded-[4px] bg-white/10">
        <PlusIcon className="size-3.5" />
      </span>
      {label}
    </button>
  );
}
