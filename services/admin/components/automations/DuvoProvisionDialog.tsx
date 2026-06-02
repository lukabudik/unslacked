"use client";

import * as React from "react";
import { Bot, Check, Clipboard, Sparkles } from "lucide-react";
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
import { Button } from "@/components/ui/button";
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
  const [created, setCreated] = React.useState(false);

  React.useEffect(() => {
    if (opportunity) {
      setBrief(opportunity.duvoAgentBrief);
      setCreated(false);
    }
  }, [opportunity]);

  async function handleCreate() {
    // TODO: real Duvo provisioning — confirm live endpoint with the Duvo team
    // on-site. For now we hand the operator a ready-to-paste agent brief.
    try {
      await navigator.clipboard.writeText(brief);
    } catch {
      // clipboard can fail on insecure contexts; the toast still guides the user
    }
    setCreated(true);
    toast.success("Agent brief ready", {
      description: "Copied to clipboard — paste into Duvo to create the agent.",
    });
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} className="gap-1.5">
            {created ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {created ? "Brief copied" : "Create Duvo Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
