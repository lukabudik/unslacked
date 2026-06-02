import { Sparkles, Layers, Clock } from "lucide-react";
import { getAutomations } from "@/lib/api/client";
import { OpportunityTable } from "@/components/automations/OpportunityTable";
import { StatCard } from "@/components/dashboard/StatCard";

// Always read fresh data from the DB so counts stay live.
export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const automations = await getAutomations();

  const totalHours = automations.reduce((s, a) => s + a.estHoursPerMonth, 0);
  const avgFit =
    automations.reduce((s, a) => s + a.duvoFitScore, 0) / automations.length;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Automation Opportunities
        </h2>
        <p className="text-sm text-muted-foreground">
          Recurring, cross-system tasks mined from comms — ranked by Duvo fit ×
          hours recoverable. Provision the strong ones straight to a Duvo agent.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Opportunities found"
          value={`${automations.length}`}
          icon={<Layers className="h-3.5 w-3.5" />}
          accent="#6366f1"
          previous="this window"
        />
        <StatCard
          label="Hours recoverable / mo"
          value={`${totalHours}h`}
          icon={<Clock className="h-3.5 w-3.5" />}
          accent="#10b981"
          deltaPct={18.2}
          previous="vs prev mo"
        />
        <StatCard
          label="Avg Duvo fit"
          value={`${(avgFit * 100).toFixed(0)}%`}
          icon={<Sparkles className="h-3.5 w-3.5" />}
          accent="#8b5cf6"
          previous="across opportunities"
        />
      </div>

      <OpportunityTable opportunities={automations} />
    </div>
  );
}
