"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Preset windows over the activity series, relative to the latest day.
export type RangePreset = "week" | "month" | "quarter" | "all";

const PRESET_DAYS: Record<Exclude<RangePreset, "all">, number> = {
  week: 7,
  month: 30,
  quarter: 90,
};

const PRESET_LABEL: Record<RangePreset, string> = {
  week: "Last 7 days",
  month: "Last 30 days",
  quarter: "Last 90 days",
  all: "All time",
};

// First day of the window: max minus (days-1), clamped to the min day.
function windowStart(max: string, days: number, min: string): string {
  const [y, m, d] = max.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  start.setDate(start.getDate() - (days - 1));
  const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(
    start.getDate()
  ).padStart(2, "0")}`;
  return iso < min ? min : iso;
}

export function DateRangePicker({
  to,
  min,
  max,
  preset,
  onChange,
}: {
  from: string;
  to: string;
  min: string;
  max: string;
  preset: RangePreset;
  onChange: (next: { from: string; to: string; preset: RangePreset }) => void;
}) {
  function apply(next: RangePreset) {
    const from = next === "all" ? min : windowStart(max, PRESET_DAYS[next], min);
    onChange({ from, to: max || to, preset: next });
  }

  return (
    <Select value={preset} onValueChange={(v) => apply((v ?? "month") as RangePreset)}>
      <SelectTrigger size="sm" className="w-[140px]">
        <SelectValue placeholder="Period" />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(PRESET_LABEL) as RangePreset[]).map((p) => (
          <SelectItem key={p} value={p}>
            {PRESET_LABEL[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
