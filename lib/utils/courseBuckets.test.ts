/**
 * The bucketing that feeds every progress calculation.
 *
 * The case these tests exist for: an in-progress course is stored with
 * `status: "in-progress"` and a null grade, which is what both the transcript
 * parser and the manual entry modal write. Keying in-progress off the grade
 * alone dropped those courses out of the credit math on My Major and My
 * Certificates, so the board showed blue chips while the in-progress credits
 * and the "+ In Progress" percentage never moved.
 */

import { describe, it, expect } from "vitest";
import { Course } from "@/lib/types";
import {
  bucketCourses,
  isCompletedCourse,
  isInProgressCourse,
} from "@/lib/utils/courseBuckets";

const course = (over: Partial<Course>): Course => ({
  id: "id",
  code: "S&DS 3120",
  grade: null,
  semester: "Fall",
  year: 2025,
  userId: "u1",
  status: "completed",
  credits: 1,
  ...over,
});

describe("isInProgressCourse", () => {
  it("counts the stored shape both writers produce: status in-progress, null grade", () => {
    expect(
      isInProgressCourse(course({ status: "in-progress", grade: null }))
    ).toBe(true);
  });

  it("still counts the transcript shape that prints the grade as In Progress", () => {
    expect(
      isInProgressCourse(
        course({ status: "in-progress", grade: "In Progress" })
      )
    ).toBe(true);
  });

  it("counts a course whose grade says In Progress even if the status does not", () => {
    expect(
      isInProgressCourse(course({ status: "completed", grade: "In Progress" }))
    ).toBe(true);
  });

  it("ignores a finished course", () => {
    expect(isInProgressCourse(course({ status: "completed", grade: "A" }))).toBe(
      false
    );
  });

  it("ignores a skipped course, which is credit the student never took", () => {
    expect(
      isInProgressCourse(
        course({ status: "in-progress", grade: null, skipped: true })
      )
    ).toBe(false);
  });
});

describe("isCompletedCourse", () => {
  it("takes a graded course", () => {
    expect(isCompletedCourse(course({ status: "completed", grade: "A" }))).toBe(
      true
    );
  });

  it("takes a skipped course, which counts as satisfied", () => {
    expect(
      isCompletedCourse(
        course({ status: "completed", grade: null, skipped: true })
      )
    ).toBe(true);
  });

  it("leaves an in-progress course alone so it lands in one bucket only", () => {
    expect(
      isCompletedCourse(course({ status: "in-progress", grade: null }))
    ).toBe(false);
    expect(
      isCompletedCourse(course({ status: "completed", grade: "In Progress" }))
    ).toBe(false);
  });
});

describe("bucketCourses", () => {
  it("sorts a mixed transcript into three disjoint buckets", () => {
    const buckets = bucketCourses([
      course({ id: "1", code: "CPSC 2010", status: "completed", grade: "A" }),
      course({
        id: "2",
        code: "S&DS 3120",
        status: "in-progress",
        grade: null,
      }),
      course({
        id: "3",
        code: "S&DS 2650",
        status: "in-progress",
        grade: "In Progress",
      }),
      course({
        id: "4",
        code: "MATH 1120",
        status: "completed",
        grade: null,
        skipped: true,
      }),
    ]);

    expect(buckets.completedCourseCodes).toEqual(["CPSC 2010", "MATH 1120"]);
    expect(buckets.inProgressCourseCodes).toEqual(["S&DS 3120", "S&DS 2650"]);
    expect(buckets.skippedCourseCodes).toEqual(["MATH 1120"]);
  });
});
