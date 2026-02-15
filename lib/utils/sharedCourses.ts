import { Course } from "@/lib/types";
import { calculateMajorProgress, MAJORS } from "@/lib/majors";

interface UserProfile {
  majors: string[];
  graduationYear: number;
  updatedAt: Date;
}

interface SharedCourse {
  code: string;
  credits: number;
  majors: { majorId: string; majorName: string; requirements: string[] }[];
}

interface SharedCoursesResult {
  courses: SharedCourse[];
  totalCredits: number;
}

/**
 * Calculate shared courses between majors (for double/triple majors)
 */
export function getSharedCourses(
  userProfile: UserProfile | null,
  courses: Course[]
): SharedCoursesResult {
  if (!userProfile || userProfile.majors.length <= 1) {
    return { courses: [], totalCredits: 0 };
  }

  // Get progress for all majors
  const allMajorsProgress: Record<
    string,
    { completedCourses: Set<string>; courseReqMap: Map<string, string[]> }
  > = {};

  for (const major of userProfile.majors) {
    const completedCourseCodes = courses
      .filter(
        (course) =>
          course.status === "completed" &&
          ((course.grade !== null && course.grade !== "In Progress") ||
            course.skipped)
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
        .filter((m) => m.major_id === major)
        .map((m) => ({
          code: course.code,
          requirement: m.requirement_title,
          credits: course.credits || 1,
        }))
    );

    const excludedRequirements = courses.flatMap((course) =>
      (course.excludedFromRequirements || [])
        .filter((m) => m.major_id === major)
        .map((m) => ({
          code: course.code,
          requirement: m.requirement_title,
        }))
    );

    const progress = calculateMajorProgress(
      major,
      completedCourseCodes,
      inProgressCourseCodes,
      skippedCourseCodes,
      manualRequirements,
      excludedRequirements
    );

    // Extract completed courses and their requirements
    const completedCourses = new Set<string>();
    const courseReqMap = new Map<string, string[]>();

    for (const req of progress.completedRequirements) {
      for (const opt of req.options) {
        if (opt.completed || opt.skipped) {
          completedCourses.add(opt.code);
          const existing = courseReqMap.get(opt.code) || [];
          courseReqMap.set(opt.code, [...existing, req.name]);
        }
      }
    }

    allMajorsProgress[major] = { completedCourses, courseReqMap };
  }

  // Find courses that appear in completed requirements of multiple majors
  const sharedCourses: SharedCourse[] = [];

  const allCodes = new Set<string>();
  Object.values(allMajorsProgress).forEach(({ completedCourses }) => {
    completedCourses.forEach((code) => allCodes.add(code));
  });

  for (const code of Array.from(allCodes)) {
    const majorsWithCourse = userProfile.majors.filter((major) =>
      allMajorsProgress[major].completedCourses.has(code)
    );

    if (majorsWithCourse.length > 1) {
      const courseData = courses.find((c) => c.code === code);
      sharedCourses.push({
        code,
        credits: courseData?.credits || 1,
        majors: majorsWithCourse.map((majorId) => ({
          majorId,
          majorName: MAJORS[majorId] || majorId,
          requirements:
            allMajorsProgress[majorId].courseReqMap.get(code) || [],
        })),
      });
    }
  }

  const totalCredits = sharedCourses.reduce((sum, c) => sum + c.credits, 0);
  return { courses: sharedCourses, totalCredits };
}
