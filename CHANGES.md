# Distributionals tab redesign — feat/better-distributionals

## Summary

Complete visual overhaul of `components/DistributionalProgress.tsx` to match the design language of the recently-polished "My Major" tab.

## What changed

### `components/DistributionalProgress.tsx`

**Summary header**
- Added a 4-column stat card grid (`DistStatCard`) mirroring `MajorStatCard` from `MajorProgressView/index.tsx`.
- Cards show: Requirements Met (x/5), In Progress count, Not Started count, Language status.
- Cards use identical surface tokens: `rounded-xl shadow-neu dark:bg-gradient-to-br dark:from-gray-900/60 ...`.

**Overall progress bar**
- Violet-to-fuchsia gradient bar (matches My Major tab) tracking how many of the 5 area+skill requirements are met.

**Requirement cards (`DistReqCard`)**
- Replaced ad-hoc `COLOR_CLASSES` map with `STATUS_CLASSES` from `requirementStatus.ts` for card surfaces and title/badge/description text.
- Distributional code pill now uses `getDistPillStyle` from `lib/constants.ts` for color parity with pills used elsewhere in the app (Hu=purple, So=sky, Sc=emerald, QR=red, WR=orange, L1-L5=teal).
- `framer-motion` `whileHover={{ y: -2 }}` lift on each card.

**Board / Heat map view switcher**
- Added Board (list) and Heat map toggle matching the My Major view switcher style.
- `DistHeatMap` component uses `getHeatCellClasses` + `getReqStatus` + `getReqRatio` from `requirementStatus.ts` for full parity with `HeatMapView.tsx`.
- `AnimatePresence` fade + slide transitions between views.

**Empty state**
- Polished centered empty state with icon when no distributionals are tagged, replacing the plain inline note.

**Loading skeleton**
- `SkeletonCard` component with `animate-pulse` for future lazy-loading use.

**Language section**
- Status-aware card surface: inherits `STATUS_CLASSES` based on completion (completed/partial/notStarted).
- Logic and UI unchanged; only styling elevated.

**Dark mode / light mode**
- All surfaces verified for both modes using Tailwind dark: variants matching the rest of the app.

## Follow-up changes (2026-06-27)

### Change 1 — Stat card rename
- `DistStatCard` labeled "Requirements Met" now reads "Total Requirements Completed". Label text only; no logic changed.

### Change 2 — Distributional breakdown pie chart (`DistPieChart`)
- New `DistPieChart` component added above the board/heat-map section.
- Counts each distributional tag (Hu, So, Sc, QR, WR) and groups L1–L5 into a single "Language (L)" slice.
- Rendered with `@mui/x-charts` `PieChart` (donut variant); slice colors match the per-distributional palette (Hu=purple, So=sky, Sc=emerald, QR=red, WR=orange, Language=teal).
- Dark-mode-legible tooltip reuses the `makeChartTooltipSlotProps` pattern from `StatsView.tsx`.
- Card surface matches existing design language (`rounded-xl shadow-neu` dark gradient).
- Shows a centered empty-state message when the student has zero distributional tags.
- `useTheme` from `@/context/ThemeContext` used for `isDark` detection.
- `PieChart` imported from `@mui/x-charts/PieChart`.

## Files touched

| File | Change |
|---|---|
| `components/DistributionalProgress.tsx` | Full redesign — 635 ins / 326 del |
| `CHANGES.md` | Created (this file) |

## TypeScript

`npx tsc --noEmit` exits clean (0 errors introduced).
