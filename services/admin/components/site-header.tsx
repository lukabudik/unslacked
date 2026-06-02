"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CommandPalette,
  CommandSearchButton,
  type PalettePerson,
} from "@/components/command-palette";

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/graph": "Communication Graph",
  "/automations": "Automations",
  "/routing": "Routing",
};

export function SiteHeader({ people }: { people: PalettePerson[] }) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Overview";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/70 px-4 backdrop-blur-md">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <span className="text-sm font-medium tracking-tight">{title}</span>

      <div className="ml-auto flex items-center gap-2">
        <CommandSearchButton />
        <ThemeToggle />
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
            ON
          </AvatarFallback>
        </Avatar>
      </div>

      <CommandPalette people={people} />
    </header>
  );
}
