import type { StoreChannel, StoreUser } from "@unslacked/db";
import { UserAvatar } from "./UserAvatar";
import { HashIcon, LockIcon, StarIcon, HeadphonesIcon, UsersIcon, ChevronIcon } from "./icons";
import { channelLabel, dmCounterpart, isOnline } from "./utils";
import { cn } from "@/lib/utils";

export function ChannelHeader({
  channel,
  users,
}: {
  channel: StoreChannel;
  users: Record<string, StoreUser>;
}) {
  const isDm = channel.kind === "im";
  const isPrivate = channel.kind === "private_channel" || channel.kind === "mpim";
  const label = channelLabel(channel, users);
  const counterpart = dmCounterpart(channel, users);
  const memberUsers = channel.members.map((id) => users[id]).filter(Boolean) as StoreUser[];

  return (
    <header className="flex h-[49px] shrink-0 items-center justify-between border-b border-[#e2e2e2] bg-white px-4">
      <button type="button" className="-ml-1 flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-[#f4f4f4]">
        {isDm ? (
          <span className="relative">
            <UserAvatar user={counterpart ?? undefined} size="sm" />
            {counterpart && isOnline(counterpart.id) && (
              <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white bg-[#2bac76]" />
            )}
          </span>
        ) : isPrivate ? (
          <LockIcon className="size-[18px] text-[#1d1c1d]" />
        ) : (
          <HashIcon className="size-[18px] text-[#1d1c1d]" />
        )}
        <span className="truncate text-[18px] font-extrabold text-[#1d1c1d]">{label}</span>
        {counterpart?.statusEmoji && <span className="text-[15px]">{counterpart.statusEmoji}</span>}
        <ChevronIcon className="size-4 text-[#616061]" />
      </button>

      <div className="flex items-center gap-1.5">
        {!isDm && memberUsers.length > 0 && (
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-[#e2e2e2] py-1 pr-2 pl-1 hover:bg-[#f4f4f4]"
          >
            <span className="flex -space-x-1.5">
              {memberUsers.slice(0, 4).map((u) => (
                <UserAvatar key={u.id} user={u} size="sm" className="ring-2 ring-white" />
              ))}
            </span>
            <span className="ml-0.5 flex items-center gap-1 text-[13px] font-semibold text-[#1d1c1d]">
              <UsersIcon className="size-3.5 text-[#616061]" />
              {memberUsers.length}
            </span>
          </button>
        )}
        <HeaderIconBtn label="Huddle"><HeadphonesIcon className="size-[18px]" /></HeaderIconBtn>
        <HeaderIconBtn label="Star"><StarIcon className="size-[18px]" /></HeaderIconBtn>
      </div>
    </header>
  );
}

export function ChannelTopicBar({ topic, isDm }: { topic: string | null; isDm: boolean }) {
  if (isDm || !topic) return null;
  return (
    <div className="flex items-center gap-1 border-b border-[#e2e2e2] bg-white px-4 py-1.5">
      <span className={cn("truncate text-[13px] text-[#616061]")}>{topic}</span>
    </div>
  );
}

function HeaderIconBtn({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-md text-[#616061] hover:bg-[#f4f4f4]"
    >
      {children}
    </button>
  );
}
