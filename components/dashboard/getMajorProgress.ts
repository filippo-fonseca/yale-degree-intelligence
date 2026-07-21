import { Course } from "@/lib/types";
import { calculateMajorProgress } from "@/lib/majors";
import { calculateCertificateProgress } from "@/lib/certificates";
import {
  getCertificateBlockedCodes,
  getCertificateViolations,
  getMajorBlockedCodes,
  filterCertificateManualEntries,
  type ProgramClaimOptions,
} from "@/lib/utils/programClaims";

/** Course-status buckets both progress calculators need. */
function bucketCourses(courses: Course[]) {
  const completedCourseCodes = courses
    .filter(
      (course) =>
        course.status === "completed" &&
        ((course.grade !== null && course.grade !== "In Progress") ||
          course.skipped),
    )
    .map((course) => course.code);

  const inProgressCourseCodes = courses
    .filter((course) => course.grade === "In Progress" && !course.skipped)
    .map((course) => course.code);

  const skippedCourseCodes = courses
    .filter((course) => course.skipped)
    .map((course) => course.code);

  return { completedCourseCodes, inProgressCourseCodes, skippedCourseCodes };
}

export function getMajorProgress(
  selectedMajor: string,
  courses: Course[],
  policyOptions: ProgramClaimOptions,
) {
  if (!selectedMajor) return null;

  const { completedCourseCodes, inProgressCourseCodes, skippedCourseCodes } =
    bucketCourses(courses);

  const manualRequirements = courses.flatMap((course) =>
    (course.manualRequirementsFulfilled || [])
      .filter((m) => m.major_id === selectedMajor && !m.certificate_id)
      .map((m) => ({
        code: course.code,
        requirement: m.requirement_title,
        credits: course.credits || 1,
      })),
  );

  const excludedRequirements = courses.flatMap((course) =>
    (course.excludedFromRequirements || [])
      .filter((m) => m.major_id === selectedMajor && !m.certificate_id)
      .map((m) => ({
        code: course.code,
        requirement: m.requirement_title,
      })),
  );

  return calculateMajorProgress(
    selectedMajor,
    completedCourseCodes,
    inProgressCourseCodes,
    skippedCourseCodes,
    manualRequirements,
    excludedRequirements,
    getMajorBlockedCodes(courses, policyOptions),
  );
}

export function getCertificateProgress(
  selectedCertificate: string,
  courses: Course[],
  policyOptions: ProgramClaimOptions,
) {
  if (!selectedCertificate) return null;

  const { completedCourseCodes, inProgressCourseCodes, skippedCourseCodes } =
    bucketCourses(courses);

  const manualRequirements = courses.flatMap((course) =>
    (course.manualRequirementsFulfilled || [])
      .filter((m) => m.certificate_id === selectedCertificate)
      .map((m) => ({
        code: course.code,
        requirement: m.requirement_title,
        credits: course.credits || 1,
      })),
  );

  const excludedRequirements = courses.flatMap((course) =>
    (course.excludedFromRequirements || [])
      .filter((m) => m.certificate_id === selectedCertificate)
      .map((m) => ({
        code: course.code,
        requirement: m.requirement_title,
      })),
  );

  // Manual fulfillments bypass the blocked-code filter inside the
  // calculation, so a conflicting manual has to be dropped here or it would
  // always win. The certificate side loses; the major keeps the course.
  const violations = getCertificateViolations(
    courses,
    selectedCertificate,
    policyOptions,
  );

  return calculateCertificateProgress(
    selectedCertificate,
    completedCourseCodes,
    inProgressCourseCodes,
    skippedCourseCodes,
    filterCertificateManualEntries(
      manualRequirements,
      selectedCertificate,
      violations,
    ),
    excludedRequirements,
    getCertificateBlockedCodes(courses, selectedCertificate, policyOptions),
  );
}
