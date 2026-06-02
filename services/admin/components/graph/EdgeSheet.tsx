"use client";

import { ArrowLeftRight, Hash, MessageSquare } from "lucide-react";
import type { CommsEdge, Person } from "@/lib/api/types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PersonaBadge } from "@/components/persona-badge";

function timeAgo(iso: string) {
  const m = Math.round((Date.now() - +new Date(iso)) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function EdgeSheet({
  edge,
  source,
  target,
  open,
  onOpenChange,
}: {
  edge: CommsEdge | null;
  source: Person | null;
  target: Person | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {edge && source && target ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-base">
                {source.name}
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                {target.name}
              </SheetTitle>
              <SheetDescription>
                {edge.messageCount} interactions · last {timeAgo(edge.lastContactAt)}
              </SheetDescription>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <PersonaBadge persona={source.persona} />
                <span className="text-muted-foreground">↔</span>
                <PersonaBadge persona={target.persona} />
              </div>
            </SheetHeader>

            <div className="space-y-4 px-4">
              {edge.topics && edge.topics.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    Where they talk
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {edge.topics.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-xs"
                      >
                        #{t.label}
                        <span className="text-muted-foreground">{t.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Why they connect
                </div>
                {edge.samples && edge.samples.length > 0 ? (
                  <ul className="space-y-2">
                    {edge.samples.map((s, i) => (
                      <li key={i} className="rounded-lg border bg-card p-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {s.from ?? "Someone"}
                          </span>
                          <span>
                            #{s.channel} · {timeAgo(s.at)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{s.text}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No message samples captured for this connection.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
