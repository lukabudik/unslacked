"use client";

import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WorkspaceHeader({
  org = "Nimbus",
  people,
  snapshot,
}: {
  org?: string;
  people: number;
  snapshot?: unknown;
}) {
  function exportSnapshot() {
    const blob = new Blob([JSON.stringify(snapshot ?? {}, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unslack-${org.toLowerCase()}-snapshot.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Snapshot exported", {
      description: "Org snapshot downloaded as JSON.",
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground">
            {org.slice(0, 1)}
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{org}</h1>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live · {people} people mapped from Slack
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportSnapshot}>
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Link
            href="/automations"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            <Plus className="h-3.5 w-3.5" />
            New agent
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
