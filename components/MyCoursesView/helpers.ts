import { Course } from "@/lib/types";
import { gradePoints } from "@/lib/constants";

/** Color class for a numeric GPA value (matches StatsView's logic). */
export function getNumericGPAColor(gpa: number): string {
  if (gpa >= 3.7) return "text-emerald-600 dark:text-emerald-300";
  if (gpa >= 3.3) return "text-blue-600 dark:text-blue-300";
  if (gpa >= 2.9) return "text-amber-600 dark:text-amber-300";
  return "text-red-600 dark:text-red-300";
}

const SEMESTER_ORDER = { Spring: 0, Summer: 1, Fall: 2 } as const;

export function sortSemesters(a: string, b: string): number {
  const [semA, yearA] = a.split(" ");
  const [semB, yearB] = b.split(" ");
  const yA = parseInt(yearA, 10);
  const yB = parseInt(yearB, 10);
  if (yA !== yB) return yA - yB;
  return (
    (SEMESTER_ORDER[semA as keyof typeof SEMESTER_ORDER] ?? 99) -
    (SEMESTER_ORDER[semB as keyof typeof SEMESTER_ORDER] ?? 99)
  );
}

export function getDefaultOpenSemesters(
  semesterGroups: [string, Course[]][],
): string[] {
  const inProgressSemesters = semesterGroups
    .filter(([, semCourses]) =>
      semCourses.some((c) => c.status === "in-progress" && !c.skipped),
    )
    .map(([semester]) => semester);

  if (inProgressSemesters.length > 0) {
    return inProgressSemesters;
  }

  const mostRecent = semesterGroups[0]?.[0];
  return mostRecent ? [mostRecent] : [];
}

/**
 * Theme-aware accent scheme for a semester header. Three visually distinct
 * identities:
 *   - in-progress  → violet/purple (matches --accent-purple), its own unmistakable accent
 *   - Fall         → warm rust/orange (autumnal, deliberately NOT yellow)
 *   - Spring       → fresh teal (new-growth), clearly distinct from both
 * `season` is the leading token of the semester key (e.g. "Fall 2026").
 */
export function getSemesterAccent(
  season: string,
  isInProgress: boolean,
): {
  bar: string;
  title: string;
  count: string;
  chip: string;
} {
  if (isInProgress) {
    return {
      bar: "bg-violet-500 dark:bg-violet-400",
      title:
        "text-violet-700 dark:text-violet-200 group-hover:text-violet-800 dark:group-hover:text-violet-100",
      count: "text-violet-400 dark:text-violet-500/70",
      chip: "bg-violet-500/15 border-violet-500/30 text-violet-600 dark:text-violet-300 hover:border-violet-500/50 hover:text-violet-700 dark:hover:text-violet-200",
    };
  }
  if (season === "Spring") {
    return {
      bar: "bg-teal-500 dark:bg-teal-400",
      title:
        "text-teal-700 dark:text-teal-200 group-hover:text-teal-800 dark:group-hover:text-teal-100",
      count: "text-teal-500/70 dark:text-teal-500/60",
      chip: "bg-teal-500/15 border-teal-500/30 text-teal-600 dark:text-teal-300 hover:border-teal-500/50 hover:text-teal-700 dark:hover:text-teal-200",
    };
  }
  // Fall (and any non-Spring, non-in-progress term) → warm rust/orange, never yellow.
  return {
    bar: "bg-orange-600 dark:bg-orange-500",
    title:
      "text-orange-700 dark:text-orange-300 group-hover:text-orange-800 dark:group-hover:text-orange-200",
    count: "text-orange-500/70 dark:text-orange-500/60",
    chip: "bg-orange-600/15 border-orange-600/30 text-orange-700 dark:text-orange-300 hover:border-orange-600/50 hover:text-orange-800 dark:hover:text-orange-200",
  };
}

export function computeStats(courses: Course[]) {
  let totalCourses = 0;
  let completedCount = 0;
  let inProgressCount = 0;
  let earnedCredits = 0;
  let totalGradePoints = 0;
  let gradedCredits = 0;

  for (const c of courses) {
    if (c.skipped) continue;
    totalCourses++;

    if (c.status === "in-progress") {
      inProgressCount++;
      continue;
    }

    if (c.status === "completed") {
      completedCount++;
      if (c.grade && gradePoints[c.grade] !== undefined) {
        const pts = gradePoints[c.grade];
        const cr = c.credits || 1;
        earnedCredits += cr;
        totalGradePoints += pts * cr;
        gradedCredits += cr;
      }
    }
  }

  const gpa = gradedCredits > 0 ? totalGradePoints / gradedCredits : null;

  return { totalCourses, completedCount, inProgressCount, earnedCredits, gpa };
}
