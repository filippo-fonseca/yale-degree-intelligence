import { Course } from "@/lib/types";
import { calculateMajorProgress } from "@/lib/majors";

export function getMajorProgress(
  selectedMajor: string,
  courses: Course[],
) {
  if (!selectedMajor) return null;

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

  const manualRequirements = courses.flatMap((course) =>
    (course.manualRequirementsFulfilled || [])
      .filter((m) => m.major_id === selectedMajor)
      .map((m) => ({
        code: course.code,
        requirement: m.requirement_title,
        credits: course.credits || 1,
      })),
  );

  const excludedRequirements = courses.flatMap((course) =>
    (course.excludedFromRequirements || [])
      .filter((m) => m.major_id === selectedMajor)
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
  );
}
