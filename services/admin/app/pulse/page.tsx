import { Smile, Moon, Grid3x3, Heart } from "lucide-react";
import {
  getSentiment,
  getOverload,
  getSilos,
  getRecognition,
  getKpis,
} from "@/lib/api/client";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SentimentChart } from "@/components/pulse/SentimentChart";
import { SiloMatrix } from "@/components/pulse/SiloMatrix";
import { OverloadList } from "@/components/pulse/OverloadList";
import { RecognitionList } from "@/components/pulse/RecognitionList";

export const dynamic = "force-dynamic";

export default async function PulsePage() {
  const [sentiment, overload, silos, recognition, kpis] = await Promise.all([
    getSentiment(),
    getOverload(),
    getSilos(),
    getRecognition(),
    getKpis(),
  ]);

  const avgAfterHours =
    overload.reduce((s, e) => s + e.afterHoursPct, 0) / Math.max(1, overload.length);
  const sentimentPct = Math.round(((kpis.orgSentiment + 1) / 2) * 100);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Org Pulse</h2>
        <p className="text-sm text-muted-foreground">
          The human signal underneath the graph — team mood over time, who&apos;s carrying
          too much load, which functions are siloed, and where recognition flows.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Org sentiment"
          value={`${sentimentPct}`}
          icon={<Smile className="h-3.5 w-3.5" />}
          accent="#10b981"
          previous="0–100 mood index"
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
          label="Cross-team links"
          value={`${silos.filter((s) => s.strength >= 0.25).length}`}
          icon={<Grid3x3 className="h-3.5 w-3.5" />}
          accent="#6366f1"
          previous="active dept pairs"
        />
        <StatCard
          label="Recognition given"
          value={`${recognition.reduce((s, e) => s + e.given, 0)}`}
          icon={<Heart className="h-3.5 w-3.5" />}
          accent="#f43f5e"
          previous="reactions in window"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Team sentiment over time</CardTitle>
            <p className="text-sm text-muted-foreground">
              Rolling mood per team, from message tone. Toggle a team to focus.
            </p>
          </CardHeader>
          <CardContent>
            <SentimentChart series={sentiment} />
          </CardContent>
        </Card>

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overload watch</CardTitle>
            <p className="text-sm text-muted-foreground">
              Mentions, threads, and after-hours activity — who&apos;s closest to burnout.
            </p>
          </CardHeader>
          <CardContent>
            <OverloadList entries={overload} />
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
    </div>
  );
}
