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

### Follow-ups (out of scope for this sprint)

- Rename plans inline (currently requires overwrite flow).
- Per-semester credit limit warning (e.g., > 5 credits).
- Drag handle indicator icon on draggable chips.
- Mobile: collapsed semester view with swipe/tab navigation.
