"use client";

import * as React from "react";
import { Search } from "lucide-react";
import type { PersonaPairRoute } from "@/lib/api/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PersonaRouteCard } from "./PersonaRouteCard";

const PAGE = 12;

export function PersonaRoutesPanel({
  routes,
  names,
}: {
  routes: PersonaPairRoute[];
  names: Record<string, string>;
}) {
  const [q, setQ] = React.useState("");
  const [limit, setLimit] = React.useState(PAGE);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return routes;
    return routes.filter(
      (r) =>
        r.fromPersona.toLowerCase().includes(s) ||
        r.toPersonName.toLowerCase().includes(s) ||
        (names[r.viaMiddlemanId] ?? "").toLowerCase().includes(s)
    );
  }, [routes, q, names]);

  const visible = filtered.slice(0, limit);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Search routes by team, owner, or connector…"
            className="h-8 pl-8"
          />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {filtered.length} route{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {visible.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r, i) => (
            <PersonaRouteCard
              key={`${r.fromPersona}-${r.toPersonId}-${i}`}
              route={r}
              viaName={names[r.viaMiddlemanId] ?? "Unknown"}
            />
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No routes match “{q}”.
        </p>
      )}

      {limit < filtered.length ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
            Show more ({filtered.length - limit} more)
          </Button>
        </div>
      ) : null}
    </div>
  );
}
