import type { StoreUser } from "@unslacked/db";
import { UserAvatar } from "./UserAvatar";
import { cn } from "@/lib/utils";

/**
 * The thin far-left rail Slack shows: workspace tile, primary nav, and the
 * current user's avatar pinned to the bottom. Purely decorative in the mock.
 */
export function IconRail({ viewer, workspaceName }: { viewer: StoreUser | undefined; workspaceName: string }) {
  const tile = workspaceName.slice(0, 1).toUpperCase();
  return (
    <div className="flex w-[68px] shrink-0 flex-col items-center gap-2 bg-[#350d36] py-2.5 text-white/70">
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-xl bg-white text-[17px] font-extrabold text-[#3f0e40]"
        aria-label={workspaceName}
      >
        {tile}
      </button>

      <div className="mt-1.5 flex flex-col items-center gap-1.5">
        <RailItem label="Home" active>
          <svg viewBox="0 0 24 24" className="size-6" fill="currentColor"><path d="M5 10v8a2 2 0 0 0 2 2h2v-5h6v5h2a2 2 0 0 0 2-2v-8l-8-6z" /></svg>
        </RailItem>
        <RailItem label="DMs">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /></svg>
        </RailItem>
        <RailItem label="Activity">
          <svg viewBox="0 0 24 24" className="size-6" fill="currentColor"><path d="M12 3a6 6 0 0 0-6 6c0 4-1.5 5-2 6h16c-.5-1-2-2-2-6a6 6 0 0 0-6-6zm0 18a2.5 2.5 0 0 0 2.4-2h-4.8A2.5 2.5 0 0 0 12 21z" /></svg>
        </RailItem>
        <RailItem label="Later">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
        </RailItem>
      </div>

      <div className="mt-auto flex flex-col items-center gap-2">
        <button type="button" aria-label="More" className="flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/15">
          <svg viewBox="0 0 20 20" className="size-5" fill="currentColor"><circle cx="5" cy="10" r="1.6" /><circle cx="10" cy="10" r="1.6" /><circle cx="15" cy="10" r="1.6" /></svg>
        </button>
        <span className="relative">
          <UserAvatar user={viewer} size="lg" />
          <span className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-[3px] border-[#350d36] bg-[#2bac76]" />
        </span>
      </div>
    </div>
  );
}

function RailItem({ children, label, active }: { children: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button type="button" className="flex w-14 flex-col items-center gap-0.5 rounded-lg py-1 hover:text-white">
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-xl transition-colors",
          active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10",
        )}
      >
        {children}
      </span>
      <span className={cn("text-[11px] font-semibold", active ? "text-white" : "text-white/75")}>{label}</span>
    </button>
  );
}
