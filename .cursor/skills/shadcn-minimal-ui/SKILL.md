---
name: shadcn-minimal-ui
description: >-
  Build and review screens in the Unslack admin's minimal shadcn/ui design
  language — layered white cards on a soft canvas, Inter type, restrained
  accents, charts via shadcn/recharts. Use when creating or editing any page or
  component under services/admin, designing a new dashboard/table/chart screen,
  or when the user mentions UI, layout, styling, "make it minimal", or shadcn.
---

# Minimal shadcn/ui Design Language

The admin UI is a light, airy, card-layered SaaS dashboard (reference: Fillio-style
SaaS dashboards). White cards float on a soft off-white canvas with hairline
borders, Inter type, generous whitespace, and color used only for data and a
single brand accent. This skill encodes the tokens, the screen recipe, and the
component catalog so new screens look native on the first pass.

## Design principles (the non-negotiables)

1. **Layered surfaces, not boxes.** Soft canvas (`bg-background`) + white cards
   (`bg-card`) + hairline separation. Never put a bordered card on a white page.
2. **Color is data, not decoration.** Neutral chrome. The 8 persona colors and
   chart palette carry meaning; chrome stays grayscale. One brand accent (indigo
   `#6366f1`) for primary actions only.
3. **Typography hierarchy via weight + muted, not size jumps.** Headings
   `font-semibold tracking-tight`. Secondary text `text-muted-foreground`. Numbers
   always `tabular-nums`.
4. **Whitespace is the feature.** Section gap `space-y-6`. Grid gap `gap-4`/`gap-6`.
   Don't crowd; let cards breathe.
5. **Subtle depth.** Prefer hairline borders/rings over heavy shadows. Hover
   states are quiet (`hover:bg-muted/60`).
6. **Status dots over loud badges.** A 1.5px colored dot communicates state more
   calmly than a filled chip.

## Tokens (already wired in `app/globals.css`)

- Font: **Inter** as `--font-sans` (mono = Geist Mono), set in `app/layout.tsx`.
- `--radius: 0.75rem` → cards `rounded-xl`, controls `rounded-lg`.
- Canvas `--background` is a hair off-white (`oklch(0.985 0 0)`); `--card` is pure
  white so cards lift off the page. Dark mode mirrors via `.dark`.
- Charts use `--chart-1..5` (vibrant OKLCH). In chart code reference them as
  `var(--chart-1)` or via `ChartConfig` `color`.
- Never hardcode hex in chrome. Use semantic utilities: `bg-card`,
  `text-muted-foreground`, `border`, `bg-muted`, `text-primary`.

## Persona color system

Eight personas each map to a fixed color in `lib/personas.ts`
(`PERSONA_COLORS`). A persona ALWAYS reads as the same color across graph, charts,
and badges. Use `<PersonaBadge persona={...} />` for labels and `PERSONA_COLORS[p]`
for chart cells. Betweenness "heat" uses `betweennessColor(t)` (slate→amber→red).

## The screen recipe (top → bottom)

Compose pages from this vertical rhythm. Page root is always
`<div className="space-y-6">`.

```
1. Header
   - Dashboard: <WorkspaceHeader /> card (brand mark, live status dot, period
     <Select>, secondary + primary <Button>).
   - Sub-pages: heading block — h2 `text-xl font-semibold tracking-tight` + a
     one-line `text-muted-foreground` description.

2. Stat row
   - grid: `grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4`
   - <StatCard label value icon accent deltaPct previous goodDirection />
   - deltaPct is signed; goodDirection flips green/red (e.g. degrees-of-sep down
     is good).

3. Primary content (cards in a 3-col grid: `grid gap-6 lg:grid-cols-3`)
   - Wide insight `lg:col-span-2` (chart or graph) + a narrow companion card
     (donut, list).

4. Detail (tabbed table)
   - <DataTabs /> inside a card — Tabs for related datasets (Automations / Routes
     / Middlemen). Tables get `rounded-xl border`.
```

## Card pattern

```tsx
<Card>
  <CardHeader className="flex-row items-center justify-between space-y-0">
    <CardTitle>Title</CardTitle>
    {/* optional: a quiet right-aligned link */}
    <Link className="inline-flex items-center gap-1 text-xs font-medium
      text-muted-foreground transition-colors hover:text-foreground">
      Action <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  </CardHeader>
  <CardContent>{/* content */}</CardContent>
</Card>
```

- For a title + subtitle, wrap them in a `<div className="space-y-1">` and add the
  subtitle as `<p className="text-sm text-muted-foreground">`.
- `<Card size="sm">` for dense stat cards.

## Charts (shadcn + recharts)

Always wrap recharts in `<ChartContainer config={...}>` and use
`<ChartTooltip content={<ChartTooltipContent />} />`. Patterns in repo:

- **Trend / period compare** → `TimelineChart` (AreaChart, current solid vs
  previous dashed, gradient fills, `XAxis` only, `YAxis hide`).
- **Composition** → `PersonaDonut` (PieChart `innerRadius`, center total overlay,
  legend grid with % per slice).
- **Ranking** → `PersonaVolumeChart` (horizontal BarChart, one `Cell` per persona
  color).
- **Network** → `react-force-graph-2d` only (recharts can't do force-directed).
  This is the sole justified non-shadcn viz. See `components/graph/ForceGraph.tsx`.

Disable animations on data viz (`isAnimationActive={false}`) for a calm, instant feel.

## Component catalog (reuse before building)

| Need | Component |
|------|-----------|
| Page workspace header | `components/dashboard/WorkspaceHeader.tsx` |
| KPI / metric tile | `components/dashboard/StatCard.tsx` |
| Tabbed data tables | `components/dashboard/DataTabs.tsx` |
| Persona label | `components/persona-badge.tsx` |
| Trend chart | `components/charts/TimelineChart.tsx` |
| Donut composition | `components/charts/PersonaDonut.tsx` |
| Ranking bars | `components/charts/PersonaVolumeChart.tsx` |
| People/middlemen list | `components/charts/MiddlemenList.tsx` |
| Network graph | `components/graph/ForceGraph.tsx` (+ `GraphPreview`, `GraphControls`, `NodeSheet`) |
| Detail panel | shadcn `Sheet` |
| Provision flow | `components/automations/DuvoProvisionDialog.tsx` |

## Layout shell

- Sidebar is a collapsible **icon rail** (`<Sidebar collapsible="icon">`,
  `SidebarProvider defaultOpen={false}`), grouped (`SidebarGroupLabel` "Main" /
  "General"). Active item via `isActive`. This shadcn build uses base-ui — pass
  `render={<Link href=... />}` (NOT `asChild`) on `SidebarMenuButton`.
- Header (`site-header.tsx`) is a slim sticky strip: trigger + page title + a
  search affordance + theme toggle + avatar. Translucent `bg-background/70
  backdrop-blur-md`.

## shadcn base-ui gotchas in this project

- `SidebarMenuButton`/menu items use `render={<Link/>}`, not `asChild`.
- `TooltipProvider` prop is `delay`, not `delayDuration`.
- `Select`'s `onValueChange` yields `string | null` — coerce: `(v) => set(v ?? default)`.
- `SelectTrigger` and `Button` accept a `size` prop (`sm`/`default`/...).

## Process for a new screen

```
- [ ] Confirm the data comes from lib/api/client.ts (never import mock directly)
- [ ] Pick the screen recipe sections that apply (header → stats → content → table)
- [ ] Reuse the component catalog; only build new when nothing fits
- [ ] Chrome stays neutral; color only for persona/chart/heat data
- [ ] space-y-6 page, gap-4/gap-6 grids, tabular-nums on every number
- [ ] Run `pnpm build` (catches base-ui type gotchas) then verify in browser
```

## Data source & functional controls

- Data is **live** from Neon Postgres via Drizzle (`lib/db/`, `lib/api/db.ts`),
  selected in `lib/api/client.ts`: real DB when `DATABASE_URL` is set and
  `NEXT_PUBLIC_USE_MOCK !== "true"`, else deterministic mock. The graph, metrics
  (real Brandes betweenness), and topics (Slack channels) are derived in
  `db.ts`. `persona` == the real `users.department`.
- **Every control must do something.** No decorative buttons, dead links, or
  fake search. If you add a control, wire it (navigation, filter, download,
  toggle) or remove it. Examples in repo: header search → ⌘K command palette
  (`command-palette.tsx`); Export → JSON download; graph scope/topic/time →
  real filters.

## Anti-patterns

- Bordered cards on a white page (kills the layered look).
- Hardcoded hex in chrome, or rainbow chrome.
- Heavy drop shadows, thick borders, or dense, gap-less grids.
- Size-only hierarchy (bump weight + muted instead).
- New one-off chart libs — use shadcn/recharts; force graph is the only exception.
```
