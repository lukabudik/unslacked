import { Smile, Moon, Heart } from "lucide-react";
import { getSentiment, getOverload, getRecognition, getSilos, getKpis } from "@/lib/api/client";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiloMatrix } from "@/components/pulse/SiloMatrix";
import { RecognitionList } from "@/components/pulse/RecognitionList";
import { personaColor } from "@/lib/personas";

export const dynamic = "force-dynamic";

export default async function PulsePage() {
  const [sentiment, overload, recognition, silos, kpis] = await Promise.all([
    getSentiment(),
    getOverload(),
    getRecognition(),
    getSilos(),
    getKpis(),
  ]);

  const avgAfterHours =
    overload.reduce((s, e) => s + e.afterHoursPct, 0) / Math.max(1, overload.length);
  const positivityPct = Math.round(((kpis.orgSentiment + 1) / 2) * 100);
  const teamMood = [...sentiment].sort((a, b) => b.current - a.current);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Org Pulse</h2>
        <p className="text-sm text-muted-foreground">
          The human signal from real workspace data — reaction positivity by team,
          where recognition flows, and which functions stay siloed.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Reaction positivity"
          value={`${positivityPct}`}
          icon={<Smile className="h-3.5 w-3.5" />}
          accent="#10b981"
          previous="0–100, from emoji reactions"
        />
        <StatCard
          label="After-hours load"
          value={`${(avgAfterHours * 100).toFixed(0)}%`}
          icon={<Moon className="h-3.5 w-3.5" />}
          accent="#8b5cf6"
          goodDirection="down"
          previous="of top-load activity"
        />
        <StatCard
          label="Recognition given"
          value={`${recognition.reduce((s, e) => s + e.given, 0)}`}
          icon={<Heart className="h-3.5 w-3.5" />}
          accent="#f43f5e"
          previous="reactions in window"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team mood</CardTitle>
            <p className="text-sm text-muted-foreground">
              Reaction positivity per team — share of positive vs. negative emoji.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {teamMood.map((s) => {
              const pct = Math.round(((s.current + 1) / 2) * 100);
              return (
                <div key={s.team} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-sm">{s.team}</span>
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: personaColor(s.persona) }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                    {pct}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recognition flow</CardTitle>
            <p className="text-sm text-muted-foreground">
              Reactions received vs. given — quiet MVPs and generous teammates.
            </p>
          </CardHeader>
          <CardContent>
            <RecognitionList entries={recognition} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Silo matrix</CardTitle>
          <p className="text-sm text-muted-foreground">Who talks to whom, across teams.</p>
        </CardHeader>
        <CardContent>
          <SiloMatrix cells={silos} />
        </CardContent>
      </Card>
    </div>
  );
}
