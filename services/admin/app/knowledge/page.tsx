import { HelpCircle, Timer, MessageSquareDashed, Repeat2 } from "lucide-react";
import {
  getOpenQuestions,
  getExpertise,
  getRecurringQuestions,
  getKpis,
} from "@/lib/api/client";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpenQuestionsList } from "@/components/knowledge/OpenQuestionsList";
import { ExpertiseList } from "@/components/knowledge/ExpertiseList";
import { RecurringQuestionsList } from "@/components/knowledge/RecurringQuestionsList";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const [questions, expertise, recurring, kpis] = await Promise.all([
    getOpenQuestions(),
    getExpertise(),
    getRecurringQuestions(),
    getKpis(),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Knowledge &amp; Q&amp;A</h2>
        <p className="text-sm text-muted-foreground">
          Where the org gets stuck and who unblocks it. Open questions, the de-facto
          experts answering them, and the repeats worth turning into a bot or a doc.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Open questions"
          value={`${kpis.openQuestions}`}
          icon={<HelpCircle className="h-3.5 w-3.5" />}
          accent="#ef4444"
          previous="unanswered / slow / DM"
        />
        <StatCard
          label="Median time-to-answer"
          value={`${kpis.medianTimeToAnswerHours}h`}
          icon={<Timer className="h-3.5 w-3.5" />}
          accent="#f59e0b"
          goodDirection="down"
          previous="first reply"
        />
        <StatCard
          label="Tribal knowledge"
          value={`${(kpis.tribalKnowledgePct * 100).toFixed(0)}%`}
          icon={<MessageSquareDashed className="h-3.5 w-3.5" />}
          accent="#8b5cf6"
          previous="answered only in DMs"
        />
        <StatCard
          label="Recurring questions"
          value={`${recurring.length}`}
          icon={<Repeat2 className="h-3.5 w-3.5" />}
          accent="#6366f1"
          previous="automation candidates"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Open questions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Questions that never got a clean answer in-channel. Each one is matched to the
              channel&apos;s likeliest owner.
            </p>
          </CardHeader>
          <CardContent>
            <OpenQuestionsList questions={questions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Who knows what</CardTitle>
            <p className="text-sm text-muted-foreground">
              The de-facto answerers, by replies authored.
            </p>
          </CardHeader>
          <CardContent>
            <ExpertiseList entries={expertise} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recurring questions → automate</CardTitle>
          <p className="text-sm text-muted-foreground">
            The same question, asked again and again. Prime FAQ-bot / Duvo-agent material.
          </p>
        </CardHeader>
        <CardContent>
          <RecurringQuestionsList questions={recurring} />
        </CardContent>
      </Card>
    </div>
  );
}
