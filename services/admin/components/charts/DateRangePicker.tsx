"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type RangePreset = "week" | "month" | "quarter" | "all" | "custom";

interface DateRange {
  from: string;
  to: string;
  preset: RangePreset;
}

interface DateRangePickerProps {
  from: string;
  to: string;
  min: string;
  max: string;
  preset: RangePreset;
  onChange: (next: DateRange) => void;
}

const PRESETS: { value: RangePreset; label: string; days?: number }[] = [
  { value: "week", label: "7d", days: 7 },
  { value: "month", label: "30d", days: 30 },
  { value: "quarter", label: "90d", days: 90 },
  { value: "all", label: "All" },
];

function shiftDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function DateRangePicker({
  from,
  to,
  min,
  max,
  preset,
  onChange,
}: DateRangePickerProps) {
  function applyPreset(p: RangePreset) {
    if (p === "all") {
      onChange({ from: min, to: max, preset: "all" });
      return;
    }
    if (p === "custom") return; // custom is set via date inputs only
    const presetDef = PRESETS.find((x) => x.value === p);
    if (!presetDef?.days) return;
    const newFrom = shiftDate(max, -(presetDef.days - 1));
    onChange({ from: newFrom < min ? min : newFrom, to: max, preset: p });
  }

  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFrom = e.target.value;
    if (!newFrom) return;
    const clampedTo = newFrom > to ? newFrom : to;
    onChange({ from: newFrom, to: clampedTo, preset: "custom" });
  }

  function handleToChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTo = e.target.value;
    if (!newTo) return;
    const clampedFrom = newTo < from ? newTo : from;
    onChange({ from: clampedFrom, to: newTo, preset: "custom" });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Preset buttons */}
      <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => applyPreset(p.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              preset === p.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date inputs for custom range */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <input
          type="date"
          value={from}
          min={min}
          max={to}
          onChange={handleFromChange}
          className={cn(
            "h-7 rounded-md border border-input bg-transparent px-2 text-xs text-foreground",
            "focus:outline-none focus:ring-1 focus:ring-ring",
            "disabled:opacity-50"
          )}
        />
        <span>–</span>
        <input
          type="date"
          value={to}
          min={from}
          max={max}
          onChange={handleToChange}
          className={cn(
            "h-7 rounded-md border border-input bg-transparent px-2 text-xs text-foreground",
            "focus:outline-none focus:ring-1 focus:ring-ring",
            "disabled:opacity-50"
          )}
        />
      </div>
    </div>
  );
}
