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
