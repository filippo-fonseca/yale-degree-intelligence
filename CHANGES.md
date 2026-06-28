# My Courses View — Redesign Changes

## Branch: `feat/better-my-courses`

## Summary

Extracted the upload-tab UI from `app/page.tsx` (was ~680 inline lines) into a proper
`components/MyCoursesView/` component tree. Added a summary stats header, search/filter/sort
controls, loading skeletons, status-themed course cards, and a polished onboarding state —
all matching the design language of the recently-polished "My Major" tab.

---

## Files changed

### New: `components/MyCoursesView/StatCard.tsx`
Reusable stat card component matching `MajorStatCard` exactly (same neumorphic surface,
`whileHover={{ y: -1 }}`, tooltip pattern). Used for the 5-card summary header.

### New: `components/MyCoursesView/CourseCard.tsx`
Redesigned course card using `STATUS_CLASSES`-inspired status theming (emerald for
completed, blue for in-progress, gray for skipped). Includes:
- Status + grade badge, credits display
- Trash button (non-skipped courses only)
- Inline distributional assignment editor with AnimatePresence expand/collapse
- `whileHover={{ y: -1 }}` motion

### New: `components/MyCoursesView/CoursesLoadingSkeleton.tsx`
Animated pulse skeleton that mimics the layout of the loaded state (stat cards,
controls bar, semester blocks with course card placeholders).

### New: `components/MyCoursesView/OnboardingState.tsx`
Polished empty/onboarding state matching the existing design. Extracted intact from
`app/page.tsx` with no behavior changes; now accepts props cleanly.

### New: `components/MyCoursesView/index.tsx`
Main `MyCoursesView` component. Props accepted:
- `courses`, `hasData`, `coursesLoading`, `user`, `isBrandNew`
- `onManualAdd`, `onReupload`, `onUploadSuccess`, `onDeleteCourse`, `onToggleDistributional`

Features added:
1. **Summary header**: 5 stat cards (total courses, completed, in-progress, credits earned,
   cumulative GPA). GPA uses a numeric color scale matching StatsView's logic.
2. **Search + filter + sort bar**: text search by code/name, status filter dropdown,
   semester filter dropdown, sort by semester/code/grade/credits with asc/desc toggle.
   Active filter summary with "Clear filters" affordance.
3. **Course list**: grouped by semester (when no active filters) with collapsible sections
   and in-progress semester badge. Flat grid when search/filter is active.
4. **Skipped courses section**: rendered after semester groups.
5. **CourseModal** wired with `allowSkip={false}` and `onToggleDistributional` that syncs
   modal state immediately.
6. **ConfirmDeleteModal** handled internally; `onDeleteCourse` prop receives the actual
   delete operation (Firestore deleteDoc + fetchCourses).
7. Loading skeleton and onboarding state as early returns.

### Modified: `app/page.tsx`
- Added `import MyCoursesView from "@/components/MyCoursesView"`.
- Replaced the entire 680-line inline upload-tab block with `<MyCoursesView ... />`.
- Removed the now-internal `ConfirmDeleteModal` from the upload block.
- `onDeleteCourse` prop performs the Firestore delete directly (no longer sets page-level
  `confirmDelete` state — page state for that remains but is now unused dead state that
  can be cleaned up in a follow-up).

---

## Design language applied
- Stat card surface: `p-3 rounded-xl bg-white dark:bg-gradient-to-br dark:from-gray-900/60 ...`
  `backdrop-blur-md border border-gray-200 dark:border-gray-800/50 shadow-neu`
- Course card status theming mirrors `STATUS_CLASSES` (emerald/blue/gray)
- Controls bar uses same neumorphic surface as the progress bar section in MajorProgressView
- All interactive elements use `framer-motion` hover/tap animations
- Dark mode tested throughout; light mode unchanged from existing design

---

## Known follow-ups / non-issues
- `confirmDelete`, `openDeleteConfirm`, `closeDeleteConfirm`, and `handleDeleteInProgress`
  in `app/page.tsx` are now unreferenced dead code. They can be removed in a follow-up
  cleanup PR without any behavior impact.
- `getLetterGradeColor` (imported as `getGPAColor` from `lib/utils/utils`) is not used
  in the main render path of `MyCoursesView/index.tsx` — only in `SkippedSection`. If
  the skipped section is refactored to `CourseCard`, this import can be removed.
- `tsc --noEmit` passes with zero errors (confirmed after each commit).


# Simulator Redesign — Change Log

## Branch: `feat/better-simulator`

---

### `components/Simulator/Simulator.tsx` — full redesign

**What changed**

1. **Summary stat header** — four `SimStatCard` components (mirrors the `MajorStatCard` pattern in `MajorProgressView/index.tsx` exactly: `p-3 rounded-xl shadow-neu dark:bg-gradient-to-br dark:from-gray-900/60` surface, `text-xs text-gray-400 dark:text-gray-500` label, `text-lg font-medium` value). Stats shown: Planned Courses, Planned Credits, Future Semesters, Saved Plans (with active plan name as a subtitle).

2. **Loading skeletons** — `SkeletonStatCard` and `SkeletonSemester` pulse components gate the stat grid and semester grid behind `plansLoaded` state, so there's no layout jump on first load.

3. **Polished semester columns** — semester cards now have a colored header band keyed to term: amber tint for Fall, sky tint for Spring, muted gray for past semesters. Past semesters are rendered at reduced opacity with a `(past)` label. Drop zone renders inline (bottom of a filled column) for clear drop affordance. Course chips use emerald/blue/violet to match status-themed colors from `requirementStatus.ts`.

4. **Course pool** — recolored violet (was pink) to feel distinct from completion-status colors. Added course count badge. Hover on chips lifts slightly (`y: -1`) matching the rest of the design system.

5. **Plan management UX** — toolbar buttons compacted to icon + label, cleaner spacing. "Load Plan" renamed to "My Plans". Active plan highlights with "Loaded" badge inside the plans modal. Plan selector modal (initial load) has cleaner dividers and button copy branches on whether plans exist.

6. **Empty state** — explicit empty state with a calendar icon and guidance text when no semesters exist.

7. **Dark/light mode** — all new surfaces use the established `dark:bg-transparent dark:bg-gradient-to-br ...` pattern throughout.

8. **Mobile** — stat grid collapses to 2-column; toolbar wraps cleanly with `flex-wrap`.

**What was NOT changed**

- All Firebase reads/writes (`savedPlans` on `users/{uid}`) are unchanged.
- All props, state, drag/drop logic, preview progress computation, manual assignment flow, and modal wiring are identical.
- `Plan` / `Semester` types and `lib/simulatorPlans.ts` are untouched.
- `SimulatorRequirementsBreakdown`, `ManualCourseLookupModal`, `SimulatorManualAssignModal` are untouched.

---

### Post-redesign fixes (same branch)

**Fix 1 — Dark-mode semester header color** (`components/Simulator/Simulator.tsx`, semester header `className`)

The Fall-amber and Spring-sky header bands used `dark:bg-amber-950/15` and `dark:border-amber-900/20` (resp. sky equivalents), which were nearly invisible in dark mode. Bumped both to `/30` opacity (`dark:bg-amber-950/30 dark:border-amber-800/30`, `dark:bg-sky-950/30 dark:border-sky-800/30`) to match the subtle tinted-gradient pattern used by `requirementStatus.ts` STATUS_CLASSES. Light mode is unchanged.

**Fix 2 — "Unsaved changes" shown on load** (`components/Simulator/Simulator.tsx`, `planEverLoadedRef` + initial-build effect guard + `loadPlanData`)

Root cause: the initial-build `useEffect` (deps `[graduationYear, remainingCourses, completedCourses]`) was unconditionally writing `initialSemestersRef.current` with the bare completed-courses layout on every parent re-render, even after a plan was already loaded. This made the change-detection effect always see a difference, showing the "unsaved" badge immediately on load.

Fix: added `planEverLoadedRef` (a `useRef(false)` set to `true` inside `loadPlanData`). The initial-build effect now only writes the snapshot if `!planEverLoadedRef.current`. Once a plan is loaded, `loadPlanData` exclusively owns the clean snapshot, and saving clears it via `setHasChanges(false)`.

---

### Follow-ups (out of scope for this sprint)

- Rename plans inline (currently requires overwrite flow).
- Per-semester credit limit warning (e.g., > 5 credits).
- Drag handle indicator icon on draggable chips.
- Mobile: collapsed semester view with swipe/tab navigation.


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


# Friends Tab — Redesign Changes

Branch: `feat/better-friends`

## Summary

Full visual redesign of `components/FriendsTab/FriendsTab.tsx` to match the
design language established in the "My Major" tab (`MajorProgressView`).
All Firebase wiring, data flow, props, and callbacks are preserved exactly.

---

## Changes

### Design tokens applied consistently
- Cards use `p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-gray-800/50 shadow-neu`
- Labels use `text-xs text-gray-400 dark:text-gray-500`
- Values use `text-lg font-medium` with semantic color tokens

### New: `FriendStatCard` component
Three at-a-glance stat cards at the top of the main view (Friends count,
Pending incoming, Pending outgoing), matching the `MajorStatCard` pattern
exactly, including tooltip support and `whileHover={{ y: -1 }}` motion.

### New: `SectionHeading` helper
Consistent `text-xs font-semibold uppercase tracking-wider` section labels
with icon, label, and count badge (count uses a pill matching system tokens).

### Improved empty state
When friends list is empty: dashed-border card with centered icon, heading,
description, and an "Add your first friend" CTA button with framer-motion.
Previously was a bare single-line text string.

### Improved loading skeletons
Three-zone skeleton layout:
1. Stat card row (3 placeholders matching the real cards)
2. Request panels (two columns matching real request cards)
3. Friend card column (3 friend-row shapes)

Previously only had two request skeletons and friend-row skeletons.

### Friend cards
- `whileHover={{ y: -1 }}` lift + staggered `animate` entrance (40ms per card)
- `exit` animation on removal (`y: -4, scale: 0.98`)
- Major names rendered in `text-pink-500 dark:text-pink-400` accent
- `min-w-0` + `truncate` on all text to prevent overflow

### Add Friend modal
- `autoFocus` on search input
- Pink search icon inside input (left-padded)
- Tighter sub-heading ("Search by name, email, or major")
- Result rows: `min-w-0` truncation, staggered `initial/animate` on results
- Close button styled with `hover:bg-red-500/10` feedback

### Request panels
- Incoming: green accent border hover + `FiCheck`/`FiX` buttons with
  `emerald-500/15` and `red-500/10` backgrounds
- Sent: blue accent + "Pending" sub-label, cancel button with red hover
- Both panels: `layout` + `initial`/`animate`/`exit` motion on individual rows

### Dropdowns (MoreOptions + FriendActions)
- `rounded-xl` menus with `scale: 0.97` entrance animation
- `border-t` separator between "View Profile" and "Remove Friend"
- Correct hover colors in both light/dark

### Opt-in enable prompt
- Surface tokens updated to match the rest of the design system
- "What's shared" card uses `shadow-neu` and proper dark gradient

### TypeScript
`tsc --noEmit` exits clean (no new errors introduced).
