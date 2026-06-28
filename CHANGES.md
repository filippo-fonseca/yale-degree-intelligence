# Stats tab redesign — `feat/better-stats`

## What changed

### `components/StatsView.tsx`

**Stat cards**
- `StatCard` now exactly mirrors the `MajorStatCard` from `MajorProgressView/index.tsx`: dark-gradient surface (`dark:bg-gradient-to-br dark:from-gray-900/60 …`), `shadow-neu`, `border-gray-800/50`, `hover:border-gray-700/60`, `rounded-xl`, `whileHover y:-1`.
- Tooltip overlay uses `FiInfo` icon, matching My Major's info tooltip pattern.
- Color tokens now use full Tailwind semantic pairs (`text-emerald-600 dark:text-emerald-400`, etc.) so both light and dark modes are correct.

**New stat rows**
- First row (4 cards): Cumulative GPA (with GPA delta indicator), Total Credits, Courses Completed, Best Semester (falls back to Avg Credits if no semester data).
- Second row (4 cards, shown when best-semester data is available): Avg Credits/Semester, Departments Explored, Most-Frequent Grade, Semesters Completed.

**Charts**
- `ChartCard` replaces the old `ChartBox`, using the same dark-gradient surface as the stat cards.
- Added a **Department GPA bar chart** (MUI `BarChart`) that shows weighted GPA per subject area — more informative than a plain credit pie alone.
- Credit distribution pie and grade distribution pie are retained; grade pie spans full width (`lg:col-span-2`) for easier reading of a legend.
- All axes, grids, and tooltips share a single `makeLineChartSx` / `makeChartTooltipSlotProps` helper so the style is completely consistent.
- Y-axis min is now clamped to a sensible floor (half-point below the lowest value, never below 0) instead of a hard `Math.floor`, giving cleaner chart ranges.

**Loading skeletons**
- `StatCardSkeleton` and `ChartCardSkeleton` components render animated pulse shimmer cards while the courses array is still empty (i.e., Firebase is loading). The grid layout is preserved so there is no layout shift.

**Empty state**
- `EmptyState` component with a violet graduation-cap icon and a friendly message is shown when the user has courses loaded but none with recorded grades.

**Responsiveness**
- Stat card grids: `grid-cols-2 lg:grid-cols-4`.
- Chart grid: `grid-cols-1 lg:grid-cols-2`, with `lg:col-span-2` for the grade pie.
- Bar chart x-axis labels rotate at 35° when there are more than 6 departments.

**Math preserved**: GPA, credit sums, semester grouping, cumulative trend, department breakdown, `progressToGraduation` — all unchanged.

## Post-redesign fixes

### Fix 1 — Dark-mode chart tooltip legibility (`components/StatsView.tsx` lines 75–130)
`makeChartTooltipSlotProps` now uses a solid `#0f172a` dark surface with
`!important` overrides on `backgroundColor` and `color`, a `& *` selector to
force light text on every descendant, and an additional `popper` slot that
injects styles onto `.MuiChartsTooltip-root` and `.MuiChartsTooltip-paper`.
This prevents MUI's own Paper dark-mode override from winning and leaving the
tooltip white-on-white. Light mode is unchanged.

### Fix 2 — Semesters Completed excludes summer terms (`components/StatsView.tsx` line 600)
The stat card value changed from `sortedSemData.length` (all semesters) to
`nonSummerSems.length` (Fall + Spring only). A muted `sub` line "plus N
summer(s)" appears below the number when the student has summer terms, using
correct singular/plural. The subtext is omitted entirely when there are no
summers.

## Commits

| Hash | Message |
|------|---------|
| `0175436` | `feat(stats): redesign StatsView with MajorStatCard pattern + polished charts` |
| `75fa43b` | `fix(stats): make chart tooltips legible in dark mode` |
| `0b44b6d` | `fix(stats): exclude summers from Semesters Completed count` |
