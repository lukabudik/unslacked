"use client";

import * as React from "react";
import { Bot, Check, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { AutomationOpportunity } from "@/lib/api/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PersonaBadge } from "@/components/persona-badge";

export function DuvoProvisionDialog({
  opportunity,
  open,
  onOpenChange,
}: {
  opportunity: AutomationOpportunity | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [brief, setBrief] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [agentUrl, setAgentUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (opportunity) {
      setBrief(opportunity.duvoAgentBrief);
      setAgentUrl(null);
    }
  }, [opportunity]);

  async function handleCreate() {
    if (!opportunity) return;
    setLoading(true);
    try {
      const res = await fetch("/api/duvo/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: opportunity.description, brief }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const url: string | undefined = data?.agent?.url ?? (data?.agent?.id
        ? `https://app.duvo.ai/agent/${data.agent.id}`
        : undefined);
      setAgentUrl(url ?? null);
      toast.success("Duvo agent created", {
        description: url ? "Open it in Duvo to review and activate." : "Agent provisioned successfully.",
      });
    } catch (err) {
      toast.error("Failed to create agent", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!opportunity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <DialogTitle>Provision to Duvo</DialogTitle>
          </div>
          <DialogDescription>{opportunity.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Frequency</div>
              <div className="text-lg font-semibold tabular-nums">
                {opportunity.frequency}×<span className="text-xs text-muted-foreground"> /mo</span>
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Est. recoverable</div>
              <div className="text-lg font-semibold tabular-nums">
                {opportunity.estHoursPerMonth}h
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Duvo fit</div>
              <div className="text-lg font-semibold tabular-nums text-emerald-600">
                {(opportunity.duvoFitScore * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Systems involved</Label>
            <div className="flex flex-wrap gap-1.5">
              {opportunity.crossSystem.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Requested by
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {opportunity.requesterPersonas.map((p) => (
                <PersonaBadge key={p} persona={p} />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="duvo-brief" className="flex items-center gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Duvo agent brief (editable)
            </Label>
            <Textarea
              id="duvo-brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={7}
              className="resize-none text-sm leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          {agentUrl ? (
            <a
              href={agentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "default" }) + " gap-1.5"}
            >
              <ExternalLink className="h-4 w-4" />
              Open in Duvo
            </a>
          ) : (
            <Button onClick={handleCreate} disabled={loading} className="gap-1.5">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {loading ? "Creating…" : "Create Duvo Agent"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
