import type { Course } from "@/lib/types";
import type { ManualRequirementEntry } from "@/lib/majors";

/**
 * The stored shape of a simulator plan, lifted out of Simulator.tsx so the
 * plan chrome (selector, plans modal) can be typed without importing the
 * 2,500-line component back into its own children.
 *
 * This is the document shape written to `users/<uid>.savedPlans`. Do not
 * change it without a migration.
 */
export interface Semester {
  id: string;
  name: string; // e.g. "Fall 2026"
  courses: Course[];
}

export type Plan = {
  name: string;
  semesters: Semester[];
  manualRequirements?: ManualRequirementEntry[];
  createdAt: string; // ISO
  isDefault?: boolean;
  showDistributionals?: boolean;
  showGrades?: boolean;
};

/** Courses a plan schedules but the student has not taken yet. */
export function plannedCourseCount(plan: Plan): number {
  return plan.semesters.reduce(
    (acc, sem) =>
      acc + sem.courses.filter((c) => c.status === "not-taken").length,
    0,
  );
}
