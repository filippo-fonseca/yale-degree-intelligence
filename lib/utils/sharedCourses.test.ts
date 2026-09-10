/**
 * Yale lets at most 2 course credits count toward two majors at once. These
 * tests pin the pure core of that check: which courses are shared, what they
 * total, and when the cap is blown.
 */

import { describe, it, expect } from "vitest";
import {
  findSharedMajorCourses,
  MAJOR_OVERLAP_CAP,
} from "@/lib/utils/sharedCourses";
import type { MajorProgress } from "@/lib/majors";

type OptionOverrides = {
  code: string;
  completed?: boolean;
  inProgress?: boolean;
  skipped?: boolean;
  credits?: number;
};

const option = (over: OptionOverrides) => ({
  name: over.code,
  required: false,
  completed: false,
  inProgress: false,
  credits: 1,
  ...over,
});

/** One requirement bucket entry with the given options. */
const requirement = (name: string, options: OptionOverrides[]) => ({
  name,
  completed: options.length,
  required: options.length,
  satisfied: true,
  options: options.map(option),
});

/**
 * A MajorProgress with only the fields the overlap check reads. The credit
 * totals are inert here, so they stay at zero rather than pretending to be real.
 */
const progress = (over: {
  completedRequirements?: ReturnType<typeof requirement>[];
  inProgressRequirements?: ReturnType<typeof requirement>[];
  remainingRequirements?: ReturnType<typeof requirement>[];
}): MajorProgress => ({
  completedRequirements: over.completedRequirements ?? [],
  inProgressRequirements: over.inProgressRequirements ?? [],
  remainingRequirements: over.remainingRequirements ?? [],
  completedCredits: 0,
  inProgressCredits: 0,
  remainingCredits: 0,
  totalCredits: 0,
  percentage: 0,
  inProgressPercentage: 0,
});

describe("findSharedMajorCourses", () => {
  it("returns nothing without a second major", () => {
    const result = findSharedMajorCourses(
      ["CPSC_BS"],
      {
        CPSC_BS: progress({
          completedRequirements: [
            requirement("Core", [{ code: "CPSC 2230", completed: true }]),
          ],
        }),
      },
      {},
    );

    expect(result.courses).toEqual([]);
    expect(result.totalCredits).toBe(0);
    expect(result.exceeded).toBe(false);
    expect(result.cap).toBe(MAJOR_OVERLAP_CAP);
  });

  it("counts a course in both majors once, naming the requirement it hits in each", () => {
    const result = findSharedMajorCourses(
      ["CPSC_BS", "ECON_BA"],
      {
        CPSC_BS: progress({
          completedRequirements: [
            requirement("Core", [{ code: "MATH 2220", completed: true }]),
          ],
        }),
        ECON_BA: progress({
          completedRequirements: [
            requirement("Math prerequisite", [
              { code: "MATH 2220", completed: true },
            ]),
          ],
        }),
      },
      {},
    );

    expect(result.courses).toHaveLength(1);
    const [shared] = result.courses;
    expect(shared.code).toBe("MATH 2220");
    expect(shared.majors.map((m) => m.majorId)).toEqual([
      "CPSC_BS",
      "ECON_BA",
    ]);
    expect(shared.majors[0].requirements).toEqual(["Core"]);
    expect(shared.majors[1].requirements).toEqual(["Math prerequisite"]);
    expect(result.totalCredits).toBe(1);
  });

  it("ignores a course that only counts toward one major", () => {
    const result = findSharedMajorCourses(
      ["CPSC_BS", "ECON_BA"],
      {
        CPSC_BS: progress({
          completedRequirements: [
            requirement("Core", [{ code: "CPSC 2230", completed: true }]),
          ],
        }),
        ECON_BA: progress({
          completedRequirements: [
            requirement("Core", [{ code: "ECON 1100", completed: true }]),
          ],
        }),
      },
      {},
    );

    expect(result.courses).toEqual([]);
  });

  it("sums credits across shared courses, preferring creditsByCode", () => {
    const both = (code: string, credits: number) =>
      requirement("Core", [{ code, completed: true, credits }]);

    const result = findSharedMajorCourses(
      ["CPSC_BS", "ECON_BA"],
      {
        CPSC_BS: progress({
          completedRequirements: [
            both("MATH 2220", 1),
            both("MATH 2230", 1),
          ],
        }),
        ECON_BA: progress({
          completedRequirements: [
            both("MATH 2220", 1),
            both("MATH 2230", 1),
          ],
        }),
      },
      { creditsByCode: { "MATH 2230": 1.5 } },
    );

    expect(result.courses).toHaveLength(2);
    expect(result.totalCredits).toBe(2.5);
  });

  it("excludes prerequisite overrides from the total but still lists them", () => {
    const shared = (code: string) =>
      requirement("Core", [{ code, completed: true }]);

    const result = findSharedMajorCourses(
      ["CPSC_BS", "ECON_BA"],
      {
        CPSC_BS: progress({
          completedRequirements: [shared("MATH 1120"), shared("MATH 2220")],
        }),
        ECON_BA: progress({
          completedRequirements: [shared("MATH 1120"), shared("MATH 2220")],
        }),
      },
      { prereqOverrides: ["MATH 1120"] },
    );

    expect(result.courses).toHaveLength(2);
    expect(result.totalCredits).toBe(1);
    expect(result.overriddenCredits).toBe(1);
    // Overrides sort to the bottom so live conflicts read first.
    expect(result.courses.map((c) => c.code)).toEqual([
      "MATH 2220",
      "MATH 1120",
    ]);
    expect(result.courses[1].isPrereqOverride).toBe(true);
  });

  it("flags a course that is only on the plan as planned", () => {
    const planned = (code: string) =>
      requirement("Core", [{ code, inProgress: true }]);

    const result = findSharedMajorCourses(
      ["CPSC_BS", "ECON_BA"],
      {
        CPSC_BS: progress({
          remainingRequirements: [planned("MATH 2220")],
          completedRequirements: [
            requirement("Intro", [{ code: "MATH 1120", completed: true }]),
          ],
        }),
        ECON_BA: progress({
          remainingRequirements: [planned("MATH 2220")],
          completedRequirements: [
            requirement("Intro", [{ code: "MATH 1120", completed: true }]),
          ],
        }),
      },
      {
        includeInProgress: true,
        plannedCodes: ["MATH 2220", "MATH 1120"],
      },
    );

    const byCode = Object.fromEntries(result.courses.map((c) => [c.code, c]));
    expect(byCode["MATH 2220"].planned).toBe(true);
    // Already on the transcript, so being on the plan too does not make it planned.
    expect(byCode["MATH 1120"].planned).toBe(false);
  });

  it("only counts in-progress options when asked to", () => {
    const inProgress = (code: string) =>
      requirement("Core", [{ code, inProgress: true }]);
    const progressByMajor = {
      CPSC_BS: progress({ inProgressRequirements: [inProgress("MATH 2220")] }),
      ECON_BA: progress({ inProgressRequirements: [inProgress("MATH 2220")] }),
    };

    expect(
      findSharedMajorCourses(["CPSC_BS", "ECON_BA"], progressByMajor, {
        includeInProgress: false,
      }).courses,
    ).toEqual([]);

    expect(
      findSharedMajorCourses(["CPSC_BS", "ECON_BA"], progressByMajor, {
        includeInProgress: true,
      }).courses,
    ).toHaveLength(1);
  });

  it("counts a skipped option, which is a requirement the student tested out of", () => {
    const skipped = (code: string) =>
      requirement("Core", [{ code, skipped: true }]);

    const result = findSharedMajorCourses(
      ["CPSC_BS", "ECON_BA"],
      {
        CPSC_BS: progress({ completedRequirements: [skipped("MATH 1120")] }),
        ECON_BA: progress({ completedRequirements: [skipped("MATH 1120")] }),
      },
      {},
    );

    expect(result.courses).toHaveLength(1);
  });

  it("marks exceeded only above 2 credits", () => {
    const shared = (codes: string[]) =>
      progress({
        completedRequirements: codes.map((code) =>
          requirement("Core", [{ code, completed: true }]),
        ),
      });
    const run = (codes: string[]) =>
      findSharedMajorCourses(
        ["CPSC_BS", "ECON_BA"],
        { CPSC_BS: shared(codes), ECON_BA: shared(codes) },
        {},
      );

    expect(run(["MATH 1120", "MATH 2220"]).totalCredits).toBe(2);
    expect(run(["MATH 1120", "MATH 2220"]).exceeded).toBe(false);

    const over = run(["MATH 1120", "MATH 2220", "MATH 2230"]);
    expect(over.totalCredits).toBe(3);
    expect(over.exceeded).toBe(true);
  });

  it("treats a cross-listing as the same shared course", () => {
    // CPSC 2010 and its cross-listed twin resolve to one canonical code, so
    // two majors counting different numbers still register a single overlap.
    const result = findSharedMajorCourses(
      ["CPSC_BS", "ECON_BA"],
      {
        CPSC_BS: progress({
          completedRequirements: [
            requirement("Core", [{ code: "cpsc 2230", completed: true }]),
          ],
        }),
        ECON_BA: progress({
          completedRequirements: [
            requirement("Elective", [{ code: "CPSC 2230", completed: true }]),
          ],
        }),
      },
      {},
    );

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].majors).toHaveLength(2);
  });
});
