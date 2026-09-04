import { Course, PublicCourse } from "@/lib/types";

export type ProfileCourse = Course | PublicCourse;

export function isCompletedOrSkipped(course: ProfileCourse): boolean {
  return course.status === "completed" || !!course.skipped;
}

export function getCompletedCoursesCount(courses: ProfileCourse[]): number {
  return courses.filter(isCompletedOrSkipped).length;
}

/**
 * Credits from courses actually taken. Skipped requirements count toward the
 * completed-courses number but are not sat-in-a-classroom credits, so they
 * stay out of this one.
 */
export function getTotalCreditsTaken(courses: ProfileCourse[]): number {
  return courses
    .filter((c) => c.status === "completed" && !c.skipped)
    .reduce((sum, c) => sum + (c.credits || 0), 0);
}

export function getInProgressCount(courses: ProfileCourse[]): number {
  return courses.filter((c) => !c.skipped && c.status === "in-progress").length;
}

export function getSemesterCount(courses: ProfileCourse[]): number {
  const keys = new Set<string>();
  for (const c of courses) {
    if (c.year && c.semester) {
      keys.add(`${c.year}-${c.semester}`);
    }
  }
  return keys.size;
}

const SEMESTER_ORDER: Record<string, number> = {
  Spring: 0,
  Summer: 1,
  Fall: 2,
};

export function sortSemesters(semesters: string[]): string[] {
  return [...semesters].sort(
    (a, b) => (SEMESTER_ORDER[a] ?? 99) - (SEMESTER_ORDER[b] ?? 99),
  );
}

export function getSortedYears(courses: ProfileCourse[]): number[] {
  return Array.from(
    new Set(courses.map((c) => c.year).filter((y): y is number => y != null)),
  ).sort((a, b) => a - b);
}
