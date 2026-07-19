import { Course } from "@/lib/types";
import { calculateMajorProgress } from "@/lib/majors";

export function buildSimulatorRemainingCourses(
  majors: string[],
  courses: Course[],
  userId: string,
): Course[] {
  return majors
    .flatMap((major) => {
      const completedCourseCodes = courses
        .filter(
          (course) =>
            course.status === "completed" &&
            ((course.grade !== null && course.grade !== "In Progress") ||
              course.skipped),
        )
        .map((course) => course.code);

      const inProgressCourseCodes = courses
        .filter(
          (course) => course.grade === "In Progress" && !course.skipped,
        )
        .map((course) => course.code);

      const skippedCourseCodes = courses
        .filter((course) => course.skipped)
        .map((course) => course.code);

      const manualRequirements = courses.flatMap((course) =>
        (course.manualRequirementsFulfilled || [])
          .filter((m) => m.major_id === major)
          .map((m) => ({
            code: course.code,
            requirement: m.requirement_title,
            credits: course.credits || 1,
          })),
      );

      const excludedRequirements = courses.flatMap((course) =>
        (course.excludedFromRequirements || [])
          .filter((m) => m.major_id === major)
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
      );

      return (
        progress?.remainingRequirements.flatMap((req) =>
          req.options
            .filter(
              (opt) => !opt.completed && !opt.inProgress && !opt.skipped,
            )
            .map(
              (opt) =>
                ({
                  id: `${opt.code}-sim-${major}`,
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
        ) || []
      );
    })
    .filter(
      (course, idx, arr) =>
        arr.findIndex((c) => c.code === course.code) === idx,
    );
}
