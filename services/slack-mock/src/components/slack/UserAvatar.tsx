import { cn } from "@/lib/utils";
import type { StoreUser } from "@unslacked/db";
import { initials } from "./utils";

const SIZES = {
  xs: "size-5 text-[9px] rounded",
  sm: "size-6 text-[10px] rounded-[4px]",
  md: "size-9 text-[13px] rounded-lg",
  lg: "size-10 text-sm rounded-lg",
} as const;

export function UserAvatar({
  user,
  size = "md",
  className,
}: {
  user: StoreUser | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const color = user?.avatarColor ?? "#4a154b";
  const label = user ? initials(user.realName || user.name) : "?";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center font-bold leading-none text-white shadow-sm",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
