"use client";

import * as React from "react";
import { HelpCircle, Clock, MessageSquareDashed, ArrowRight } from "lucide-react";
import type { OpenQuestion } from "@/lib/api/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Initials } from "@/components/shared/bits";

const STATUS = {
  unanswered: { label: "Unanswered", color: "#ef4444", icon: HelpCircle },
  slow: { label: "Slow answer", color: "#f59e0b", icon: Clock },
  tribal: { label: "DM-only", color: "#8b5cf6", icon: MessageSquareDashed },
} as const;

type Filter = "all" | keyof typeof STATUS;

function age(h: number): string {
  if (h < 1) return "just now";
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function OpenQuestionsList({ questions }: { questions: OpenQuestion[] }) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const shown = questions.filter((q) => filter === "all" || q.status === filter);

  return (
    <div className="space-y-3">
      <Tabs value={filter} onValueChange={(v) => setFilter((v ?? "all") as Filter)}>
        <TabsList>
          <TabsTrigger value="all">All {questions.length}</TabsTrigger>
          <TabsTrigger value="unanswered">
            Unanswered {questions.filter((q) => q.status === "unanswered").length}
          </TabsTrigger>
          <TabsTrigger value="slow">
            Slow {questions.filter((q) => q.status === "slow").length}
          </TabsTrigger>
          <TabsTrigger value="tribal">
            DM-only {questions.filter((q) => q.status === "tribal").length}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex max-h-[460px] flex-col divide-y overflow-y-auto rounded-xl border">
        {shown.slice(0, 40).map((q) => {
          const meta = STATUS[q.status];
          const Icon = meta.icon;
          return (
            <div key={q.id} className="flex items-start gap-3 px-3 py-3 hover:bg-muted/40">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">{q.text}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <Initials name={q.askedByName} persona={q.persona} className="h-4 w-4" />
                  <span>{q.askedByName}</span>
                  <span className="font-mono">#{q.channel}</span>
                  <span>·</span>
                  <span className="tabular-nums">{age(q.ageHours)} old</span>
                  {q.likeliestOwnerName ? (
                    <span className="inline-flex items-center gap-1 text-foreground">
                      <ArrowRight className="h-3 w-3" />
                      likely owner: {q.likeliestOwnerName}
                    </span>
                  ) : null}
                </div>
              </div>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
              >
                {meta.label}
              </span>
            </div>
          );
        })}
        {!shown.length ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            Nothing here — all caught up.
          </div>
        ) : null}
      </div>
    </div>
  );
}
