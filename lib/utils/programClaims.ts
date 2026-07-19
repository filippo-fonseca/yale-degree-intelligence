/**
 * Helpers for major ↔ certificate course exclusivity.
 *
 * Rule: a course assigned to a certificate cannot count toward major(s),
 * and a course assigned to a major cannot count toward certificate(s).
 * Assignment is tracked via ManualRequirement on course docs
 * (`major_id` vs `certificate_id`).
 */

import { Course, ManualRequirement } from "@/lib/types";
import { getCanonicalCode } from "@/lib/courseCatalog";

export function isMajorManual(m: ManualRequirement): boolean {
  return Boolean(m.major_id) && !m.certificate_id;
}

export function isCertificateManual(m: ManualRequirement): boolean {
  return Boolean(m.certificate_id);
}

export function getCodesClaimedByMajors(courses: Course[]): Set<string> {
  const codes = new Set<string>();
  for (const course of courses) {
    const manuals = course.manualRequirementsFulfilled || [];
    if (manuals.some(isMajorManual)) {
      codes.add(getCanonicalCode(course.code) || course.code);
    }
  }
  return codes;
}

export function getCodesClaimedByCertificates(courses: Course[]): Set<string> {
  const codes = new Set<string>();
  for (const course of courses) {
    const manuals = course.manualRequirementsFulfilled || [];
    if (manuals.some(isCertificateManual)) {
      codes.add(getCanonicalCode(course.code) || course.code);
    }
  }
  return codes;
}

/** Codes that should be blocked from major auto-matching / counting. */
export function getMajorBlockedCodes(courses: Course[]): string[] {
  return Array.from(getCodesClaimedByCertificates(courses));
}

/** Codes that should be blocked from certificate auto-matching / counting. */
export function getCertificateBlockedCodes(courses: Course[]): string[] {
  return Array.from(getCodesClaimedByMajors(courses));
}

export function courseHasCertificateClaim(
  course: Course,
  certificateId?: string
): boolean {
  return (course.manualRequirementsFulfilled || []).some(
    (m) =>
      isCertificateManual(m) &&
      (!certificateId || m.certificate_id === certificateId)
  );
}

export function courseHasMajorClaim(course: Course, majorId?: string): boolean {
  return (course.manualRequirementsFulfilled || []).some(
    (m) =>
      isMajorManual(m) && (!majorId || m.major_id === majorId)
  );
}
