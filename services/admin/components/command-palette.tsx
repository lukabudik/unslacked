"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Network,
  Workflow,
  Route,
  Search,
  User,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export interface PalettePerson {
  id: string;
  name: string;
  team: string;
}

const PAGES = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Communication Graph", href: "/graph", icon: Network },
  { label: "Automations", href: "/automations", icon: Workflow },
  { label: "Routing", href: "/routing", icon: Route },
];

export function CommandPalette({ people }: { people: PalettePerson[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // expose an opener for the header search button
  React.useEffect(() => {
    const opener = () => setOpen(true);
    window.addEventListener("open-command-palette", opener);
    return () => window.removeEventListener("open-command-palette", opener);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Search people, teams, pages…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {PAGES.map((p) => (
              <CommandItem key={p.href} value={`page ${p.label}`} onSelect={() => go(p.href)}>
                <p.icon />
                {p.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="People">
            {people.map((p) => (
              <CommandItem
                key={p.id}
                value={`person ${p.name} ${p.team}`}
                onSelect={() => go(`/graph?focus=${p.id}`)}
              >
                <User />
                <span>{p.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{p.team}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

// Small helper button used in the header to open the palette.
export function CommandSearchButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
      className="hidden items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 sm:flex"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="pr-8">Search…</span>
      <kbd className="rounded border bg-muted px-1.5 text-[10px] font-medium">⌘K</kbd>
    </button>
  );
}
