import type { Persona } from "./api/types";

// In this org, the "persona" dimension IS the real department (sourced from the
// `users.department` column). Colors are fixed per department so a department
// always reads as the same color across the graph, charts, and badges.
export const PERSONA_COLORS: Record<string, string> = {
  Engineering: "#06b6d4", // cyan
  Leadership: "#ef4444", // red
  Product: "#ec4899", // pink
  Operations: "#8b5cf6", // violet
  Sales: "#6366f1", // indigo
  Data: "#0ea5e9", // sky
  Support: "#f59e0b", // amber
  People: "#14b8a6", // teal
  Marketing: "#f43f5e", // rose
  Design: "#a855f7", // purple
  Finance: "#10b981", // emerald
};

export const PERSONAS: Persona[] = Object.keys(PERSONA_COLORS);

// Always resolve to a color, falling back to slate for anything unmapped.
export function personaColor(p: string): string {
  return PERSONA_COLORS[p] ?? "#64748b";
}

// Betweenness heat: muted (low) → hot red (high middleman score). t is 0..1.
export function betweennessColor(t: number): string {
  const x = Math.max(0, Math.min(1, t));
  const stops = [
    { p: 0, c: [100, 116, 139] }, // slate-500
    { p: 0.5, c: [245, 158, 11] }, // amber-500
    { p: 1, c: [239, 68, 68] }, // red-500
  ];
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (x >= stops[i].p && x <= stops[i + 1].p) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const span = hi.p - lo.p || 1;
  const f = (x - lo.p) / span;
  const ch = (i: number) => Math.round(lo.c[i] + (hi.c[i] - lo.c[i]) * f);
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
}
