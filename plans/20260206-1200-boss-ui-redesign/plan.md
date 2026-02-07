# Boss UI Redesign (ui-ux-pro-max)

## Overview

Redesign Boss dashboard to align with ui-ux-pro-max: stable hovers (no layout shift), cursor-pointer on interactives, consistent tabs/filter bar, and unified typography.

## Research (ui-ux-pro-max)

- **Product**: SaaS/Executive Dashboard – Data-Dense + Real-Time; high-level KPIs, at-a-glance.
- **Style**: Keep existing Cyberpunk/Retro-Futurism (dark + cyan/magenta); refine for stability and a11y.
- **Typography**: Plus Jakarta Sans (Friendly SaaS) or keep Orbitron/Rajdhani for Boss; kept current for identity.
- **UX**: No scale on hover (layout shift); color/opacity transitions 150–300ms; cursor-pointer; visible focus.

## Phases

### Phase 1: Home tabs

- Replace raw tab buttons with a single segment-control strip (pill or underlined).
- Active: bg + border + glow; inactive: hover bg/opacity only.
- All tabs: `cursor-pointer`, `transition-colors duration-200`, `focus-visible:ring-2 focus-visible:ring-cyan-500/50`.

### Phase 2: ViewSelector cards

- Remove `hover:scale-105` and `active:scale-95` (layout shift).
- Keep `cyber-card` hover (border/glow/translateY(-2px) in design system); or use only opacity/border for zero shift.
- Ensure `cursor-pointer` and focus-visible.

### Phase 3: Boss page consistency

- Unify title/description: use `font-cyber` everywhere (replace `font-mono` in list/detail block).
- Ensure all interactive elements have `cursor-pointer` and focus styles.

### Phase 4: KPI Status & ISO Overview

- DepartmentKpiStatus: remove `hover:scale-[1.02]` and `active:scale-[0.98]` from department cards; use border/glow/opacity.
- Filter bar (KPI + ISO): same treatment as home tabs (segment look, no scale).
- BossIsoOverviewTab: already has filter bar; add focus-visible on selects/buttons.

### Phase 5: Department grid

- Optional: wrap each department in a light `cyber-card` for consistency with other tabs.
- Ensure cursor-pointer and focus-visible on each card/button.

## Files to touch

- `apps/web/src/app/[locale]/dashboard/boss/page.tsx` – tabs, title font
- `apps/web/src/components/boss/view-selector.tsx` – remove scale
- `apps/web/src/components/boss/department-kpi-status.tsx` – card hover
- `apps/web/src/components/boss/department-grid.tsx` – optional card, focus
- `apps/web/src/components/boss/boss-iso-overview-tab.tsx` – focus states

## Out of scope

- No change to cyber design tokens (globals.css) unless needed for focus ring.
- No new pages or routes.
