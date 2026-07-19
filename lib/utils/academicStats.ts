import { Course } from "@/lib/types";
import { gradePoints } from "@/lib/constants";
import { computeGPA, GPAEntry } from "@/lib/gpa";

/** Completed course with a valid grade and positive credits — counts toward GPA. */
export function isGPAEligibleCourse(course: Course): boolean {
  return (
    !course.skipped &&
    course.status !== "in-progress" &&
    course.grade != null &&
    course.grade in gradePoints &&
    typeof course.credits === "number" &&
    course.credits > 0
  );
}

export function getGPAEligibleCourses(courses: Course[]): Course[] {
  return courses.filter(isGPAEligibleCourse);
}

export function getInProgressCount(courses: Course[]): number {
  return courses.filter((c) => !c.skipped && c.status === "in-progress").length;
}

export function toGPAEntry(course: Course): GPAEntry {
  return { grade: course.grade, credits: course.credits };
}

export interface AcademicStatsSummary {
  gpa: string;
  totalCredits: number;
  completedCourses: number;
  inProgressCourses: number;
  distribution: Record<string, number>;
}

/** Shared stats computation for page.tsx calculateStats and similar callers. */
export function computeAcademicStatsSummary(
  courses: Course[],
): AcademicStatsSummary | null {
  if (courses.length === 0) return null;

  const eligible = getGPAEligibleCourses(courses);
  const inProgressCourses = getInProgressCount(courses);
  const gpaResult = computeGPA(eligible.map(toGPAEntry));

  const distribution: Record<string, number> = {};
  for (const c of eligible) {
    distribution[c.grade!] = (distribution[c.grade!] || 0) + 1;
  }

  return {
    gpa: gpaResult.gpa != null ? gpaResult.gpa.toFixed(2) : "0.00",
    totalCredits: gpaResult.gradedCredits,
    completedCourses: eligible.length,
    inProgressCourses,
    distribution,
  };
}

/** Semantic colors for grade distribution charts (A green, B amber, C orange, D/F red). */
export function gradeDistributionColor(grade: string): string {
  if (grade.startsWith("A")) return "#10B981";
  if (grade.startsWith("B")) return "#F59E0B";
  if (grade.startsWith("C")) return "#F97316";
  return "#EF4444";
}

/** Safe Y-axis minimum for GPA charts — avoids Infinity when values are empty. */
export function safeGpaChartYMin(values: number[]): number {
  if (values.length === 0) return 0;
  const min = Math.min(...values);
  if (!Number.isFinite(min)) return 0;
  return Math.max(0, Math.floor(min * 2) / 2);
}
