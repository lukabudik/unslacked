import { ArrowRight, CornerDownRight } from "lucide-react";
import type { PersonaPairRoute } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PersonaBadge } from "@/components/persona-badge";

export function PersonaRouteCard({
  route,
  viaName,
}: {
  route: PersonaPairRoute;
  viaName: string;
}) {
  const conf = Math.round(route.confidence * 100);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm">
          <PersonaBadge persona={route.fromPersona} />
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{route.toPersonName}</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CornerDownRight className="h-3.5 w-3.5" />
          currently routed via{" "}
          <span className="font-medium text-foreground">{viaName}</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="secondary">{route.occurrences}× seen</Badge>
          <Badge
            variant="outline"
            className={
              conf >= 90
                ? "border-emerald-500/40 text-emerald-600"
                : "border-amber-500/40 text-amber-600"
            }
          >
            {conf}% confidence
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
