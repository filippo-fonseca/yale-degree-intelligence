// Credit/D/Fail, in one place.
//
// A course taken Credit/D/Fail is stored with the grade "CR" (the manual entry
// grade list and the transcript parser both write it that way). Yale College is
// explicit about what such a course can do: "No courses taken Credit/D/Fail may
// be used to fulfill a distributional requirement." That covers the areas (Hu,
// So, Sc), the skills (QR, WR), and the language requirement (L1-L5).
//
// It still earns course credit, so credit totals keep counting it. Only the
// distributional engines (allocation, language tracks, the Simulator tally, and
// the milestone chart) read the tags through `countingDistributionals`.
//
// Majors are a different question: each department sets its own Cr/D/F rule in
// the Yale College Programs of Study, so the major engine only flags these
// courses unless a major's data says otherwise (see `creditDFail` in
// lib/majors.ts).

import {
  effectiveDistributionals,
  type DistributionalCourseLike,
} from "@/lib/utils/effectiveDistributionals";

/** True when the grade marks a Credit/D/Fail course. */
export function isCreditDFail(grade?: string | null): boolean {
  return (grade ?? "").trim().toUpperCase() === "CR";
}

/** True when the course was taken Credit/D/Fail. */
export function isCreditDFailCourse(
  course: { grade?: string | null } | null | undefined,
): boolean {
  return isCreditDFail(course?.grade);
}

/**
 * The distributional tags a course may actually count toward: its effective
 * tags, or none at all when it was taken Credit/D/Fail. Display code that wants
 * to show what a course is TAGGED with keeps using `effectiveDistributionals`.
 */
export function countingDistributionals(
  course: (DistributionalCourseLike & { grade?: string | null }) | null | undefined,
): string[] {
  if (!course || isCreditDFailCourse(course)) return [];
  return effectiveDistributionals(course);
}

/** Short reason shown wherever a Cr/D/F course's tags read as not counting. */
export const CREDIT_D_FAIL_DIST_NOTE =
  "Taken Credit/D/Fail, so it does not count toward distributional requirements.";

/** Warning on a major requirement a Cr/D/F course fills, rule unrecorded. */
export const CREDIT_D_FAIL_MAJOR_WARNING =
  "Taken Credit/D/Fail. Many majors do not count Cr/D/F courses; check your major's rules.";

/** Note on a Cr/D/F course a major with a recorded "none" rule refuses. */
export const CREDIT_D_FAIL_MAJOR_REFUSED =
  "Taken Credit/D/Fail. This major does not count Cr/D/F courses.";

/** The major warning for an option's flag, or null when there is nothing to say. */
export function creditDFailMajorNote(
  flag: "unverified" | "refused" | undefined | null,
): string | null {
  if (flag === "refused") return CREDIT_D_FAIL_MAJOR_REFUSED;
  if (flag === "unverified") return CREDIT_D_FAIL_MAJOR_WARNING;
  return null;
}
