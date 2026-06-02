"use client";

import { Repeat2, Users, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { RecurringQuestion } from "@/lib/api/types";
import { Button } from "@/components/ui/button";

export function RecurringQuestionsList({ questions }: { questions: RecurringQuestion[] }) {
  if (!questions.length) {
    return (
      <div className="rounded-lg bg-muted/50 px-3 py-6 text-sm text-muted-foreground">
        No repeated question patterns detected in this window.
      </div>
    );
  }
  return (
    <div className="flex flex-col divide-y">
      {questions.map((q) => (
        <div key={q.id} className="flex items-center gap-3 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Repeat2 className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{q.pattern}</p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Repeat2 className="h-3 w-3" />
                {q.occurrences}× asked
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Users className="h-3 w-3" />
                {q.uniqueAskers} people
              </span>
              <span className="font-mono">#{q.channel}</span>
            </div>
          </div>
          {q.automatable ? (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5"
              onClick={() =>
                toast.success("Routed to Automations", {
                  description: `"${q.pattern}" queued as a Duvo FAQ-bot candidate.`,
                  action: { label: "View", onClick: () => {} },
                })
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              Automate
            </Button>
          ) : (
            <Link
              href="/automations"
              className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Review
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
