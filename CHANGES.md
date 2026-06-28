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
