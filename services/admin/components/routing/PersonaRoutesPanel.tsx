"use client";

import * as React from "react";
import { ArrowRight, ChevronLeft, ChevronRight, CornerDownRight, Search } from "lucide-react";
import type { PersonaPairRoute } from "@/lib/api/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PersonaBadge } from "@/components/persona-badge";

const PAGE_SIZE = 25;

export function PersonaRoutesPanel({
  routes,
  names,
}: {
  routes: PersonaPairRoute[];
  names: Record<string, string>;
}) {
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(0);

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

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const start = current * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search routes by team, owner, or connector…"
            className="h-8 pl-8"
          />
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {filtered.length.toLocaleString()} route{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>Real owner</TableHead>
              <TableHead>Via connector</TableHead>
              <TableHead className="text-right">Seen</TableHead>
              <TableHead className="w-[150px]">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((r, i) => (
                <TableRow key={`${r.fromPersona}-${r.toPersonId}-${start + i}`}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <PersonaBadge persona={r.fromPersona} />
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{r.toPersonName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CornerDownRight className="h-3.5 w-3.5" />
                      {names[r.viaMiddlemanId] ?? "Unknown"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.occurrences}×
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={r.confidence * 100} className="h-1.5" />
                      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                        {(r.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No routes match “{q}”.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">
            {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1"
              disabled={current === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <span className="px-1 tabular-nums">
              {current + 1} / {pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1"
              disabled={current >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
