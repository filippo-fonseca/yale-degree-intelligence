import { Course } from "@/lib/types";
import { calculateMajorProgress } from "@/lib/majors";
import {
  calculateCertificateProgress,
  certificateRequirements,
} from "@/lib/certificates";
import {
  getCertificateBlockedCodes,
  getCertificateViolations,
  getMajorBlockedCodes,
  filterCertificateManualEntries,
  type ProgramClaimOptions,
} from "@/lib/utils/programClaims";

/**
 * Every requirement option the student has not touched yet, across declared
 * majors and certificates, as pool entries for the simulator. Certificate
 * options come through the policy engine so a course a certificate cannot
 * claim never shows up as something it still needs.
 */
export function buildSimulatorRemainingCourses(
  majors: string[],
  certificates: string[],
  courses: Course[],
  userId: string,
): Course[] {
  const policyOptions: ProgramClaimOptions = {
    majorIds: majors,
    certificateIds: certificates,
  };

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

  const majorBlocked = getMajorBlockedCodes(courses, policyOptions);

  const toPoolCourses = (
    progress: { remainingRequirements: any[] } | null,
    idSuffix: string,
  ): Course[] =>
    progress?.remainingRequirements.flatMap((req: any) =>
      req.options
        .filter(
          (opt: any) => !opt.completed && !opt.inProgress && !opt.skipped,
        )
        .map(
          (opt: any) =>
            ({
              id: `${opt.code}-sim-${idSuffix}`,
              code: opt.code,
              name: opt.name,
              grade: null,
              semester: "TBD",
              year: 0,
              userId,
              status: "not-taken" as const,
              credits: opt.credits,
              skipped: false,
            }) as Course,
        ),
    ) || [];

  const fromMajors = majors.flatMap((major) => {
    const manualRequirements = courses.flatMap((course) =>
      (course.manualRequirementsFulfilled || [])
        .filter((m) => m.major_id === major && !m.certificate_id)
        .map((m) => ({
          code: course.code,
          requirement: m.requirement_title,
          credits: course.credits || 1,
        })),
    );

    const excludedRequirements = courses.flatMap((course) =>
      (course.excludedFromRequirements || [])
        .filter((m) => m.major_id === major && !m.certificate_id)
        .map((m) => ({
          code: course.code,
          requirement: m.requirement_title,
        })),
    );

    const progress = calculateMajorProgress(
      major,
      completedCourseCodes,
      inProgressCourseCodes,
      skippedCourseCodes,
      manualRequirements,
      excludedRequirements,
      majorBlocked,
    );

    return toPoolCourses(progress, major);
  });

  const fromCertificates = certificates.flatMap((certificateId) => {
    if (!certificateRequirements[certificateId]) return [];

    const manualRequirements = courses.flatMap((course) =>
      (course.manualRequirementsFulfilled || [])
        .filter((m) => m.certificate_id === certificateId)
        .map((m) => ({
          code: course.code,
          requirement: m.requirement_title,
          credits: course.credits || 1,
        })),
    );

    const excludedRequirements = courses.flatMap((course) =>
      (course.excludedFromRequirements || [])
        .filter((m) => m.certificate_id === certificateId)
        .map((m) => ({
          code: course.code,
          requirement: m.requirement_title,
        })),
    );

    const violations = getCertificateViolations(
      courses,
      certificateId,
      policyOptions,
    );

    const progress = calculateCertificateProgress(
      certificateId,
      completedCourseCodes,
      inProgressCourseCodes,
      skippedCourseCodes,
      filterCertificateManualEntries(
        manualRequirements,
        certificateId,
        violations,
      ),
      excludedRequirements,
      getCertificateBlockedCodes(courses, certificateId, policyOptions),
    );

    return toPoolCourses(progress, `cert-${certificateId}`);
  });

  return [...fromMajors, ...fromCertificates].filter(
    (course, idx, arr) =>
      arr.findIndex((c) => c.code === course.code) === idx,
  );
}
