/**
 * The course-status buckets every progress calculation takes as input.
 *
 * There is one subtlety worth stating once, here, instead of rediscovering it
 * at each call site: a course the student is currently taking is identified by
 * its STORED STATUS, not by its grade. Every writer in the app stores an
 * in-progress course with `status: "in-progress"` and a null grade. The
 * transcript parser does it in one branch (`components/dashboard/useCoursesData.ts`)
 * and the manual entry modal does it too, converting its "In Progress" grade
 * option to null on save. Only the parser's other branch, for transcripts that
 * print "In Progress" where a letter grade would go, ever stores the literal
 * string, so a grade-only check silently misses most in-progress courses.
 */

import { Course } from "@/lib/types";

export type CourseBuckets = {
  completedCourseCodes: string[];
  inProgressCourseCodes: string[];
  skippedCourseCodes: string[];
};

/** True when the student is taking this course right now. */
export function isInProgressCourse(course: Course): boolean {
  return (
    (course.status === "in-progress" || course.grade === "In Progress") &&
    !course.skipped
  );
}

/** True when the course is finished and carries credit. */
export function isCompletedCourse(course: Course): boolean {
  return (
    course.status === "completed" &&
    ((course.grade !== null && course.grade !== "In Progress") ||
      Boolean(course.skipped))
  );
}

export function bucketCourses(courses: Course[]): CourseBuckets {
  return {
    completedCourseCodes: courses
      .filter(isCompletedCourse)
      .map((course) => course.code),
    inProgressCourseCodes: courses
      .filter(isInProgressCourse)
      .map((course) => course.code),
    skippedCourseCodes: courses
      .filter((course) => course.skipped)
      .map((course) => course.code),
  };
}
