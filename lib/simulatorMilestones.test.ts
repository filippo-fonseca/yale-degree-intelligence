/**
 * The Simulator's distributional feed. Two bugs are pinned here: a planned
 * course tagged for two requirements used to count toward both, and a
 * half-credit planned course used to count as a whole one.
 */

import { describe, it, expect } from "vitest";
import type { Course } from "@/lib/types";
import {
  buildDistributionalTallyInputs,
  buildMilestoneCourseInputs,
  collectPlannedPlacements,
  planCourseCredits,
  type PlanSemesterLike,
} from "@/lib/simulatorMilestones";
import { tallyDistributionals } from "@/lib/distributionalTally";

let seq = 0;

/** `TEST` codes are deliberately absent from the catalog. */
function course(partial: Partial<Course>): Course {
  seq += 1;
  return {
    id: partial.id ?? `id-${seq}`,
    code: partial.code ?? `TEST ${100 + seq}`,
    grade: partial.grade ?? null,
    semester: partial.semester ?? "",
    year: partial.year ?? 0,
    userId: "",
    status: partial.status ?? "not-taken",
    credits: partial.credits ?? 1,
    distributionals: partial.distributionals,
    skipped: partial.skipped,
  };
}

function term(name: string, courses: Course[]): PlanSemesterLike {
  return { name, courses };
}

function countOf(inputs: ReturnType<typeof buildDistributionalTallyInputs>) {
  return tallyDistributionals(inputs).counts;
}

const auto = { auto: true, overrides: {} as Record<string, string> };

describe("planCourseCredits", () => {
  it("prefers the stored credit value", () => {
    expect(planCourseCredits(course({ credits: 0.5 }))).toBe(0.5);
  });

  it("falls back to one credit for an unknown, uncredited course", () => {
    expect(planCourseCredits(course({ credits: 0 }))).toBe(1);
  });
});

describe("collectPlannedPlacements", () => {
  it("keeps only untaken canvas courses and remembers their term", () => {
    const placements = collectPlannedPlacements([
      term("Fall 2026", [
        course({ code: "TEST 1", status: "not-taken" }),
        course({ code: "TEST 2", status: "completed" }),
      ]),
      term("Spring 2027", [course({ code: "TEST 3", status: "not-taken" })]),
    ]);
    expect(placements.map((p) => [p.course.code, p.term])).toEqual([
      ["TEST 1", "Fall 2026"],
      ["TEST 3", "Spring 2027"],
    ]);
  });

  it("drops a canvas course whose code is already on the transcript", () => {
    const placements = collectPlannedPlacements(
      [term("Fall 2026", [course({ code: "TEST 1", status: "not-taken" })])],
      ["TEST 1"],
    );
    expect(placements).toEqual([]);
  });

  it("keeps the first placement when a code appears twice", () => {
    const placements = collectPlannedPlacements([
      term("Fall 2026", [course({ code: "TEST 1", status: "not-taken" })]),
      term("Spring 2027", [course({ code: "TEST 1", status: "not-taken" })]),
    ]);
    expect(placements).toHaveLength(1);
    expect(placements[0].term).toBe("Fall 2026");
  });
});

describe("buildDistributionalTallyInputs", () => {
  it("single-counts a planned course tagged for two requirements", () => {
    const counts = countOf(
      buildDistributionalTallyInputs({
        taken: [],
        semesters: [
          term("Fall 2026", [
            course({
              code: "TEST 1",
              status: "not-taken",
              distributionals: ["Hu", "WR"],
            }),
          ]),
        ],
        ...auto,
      }),
    );
    expect((counts.Hu ?? 0) + (counts.WR ?? 0)).toBe(1);
  });

  it("counts a half-credit planned course as half a credit", () => {
    const counts = countOf(
      buildDistributionalTallyInputs({
        taken: [],
        semesters: [
          term("Fall 2026", [
            course({
              code: "TEST 1",
              status: "not-taken",
              credits: 0.5,
              distributionals: ["QR"],
            }),
          ]),
        ],
        ...auto,
      }),
    );
    expect(counts.QR).toBe(0.5);
  });

  it("counts transcript and planned coursework together", () => {
    const counts = countOf(
      buildDistributionalTallyInputs({
        taken: [
          course({
            code: "TEST 1",
            status: "completed",
            grade: "A",
            distributionals: ["Sc"],
          }),
        ],
        semesters: [
          term("Fall 2026", [
            course({
              code: "TEST 2",
              status: "not-taken",
              distributionals: ["Sc"],
            }),
          ]),
        ],
        ...auto,
      }),
    );
    expect(counts.Sc).toBe(2);
  });

  it("reports language levels alongside the allocated requirement", () => {
    const counts = countOf(
      buildDistributionalTallyInputs({
        taken: [],
        semesters: [
          term("Fall 2026", [
            course({
              code: "TEST 1",
              status: "not-taken",
              distributionals: ["Hu", "L3"],
            }),
          ]),
        ],
        ...auto,
      }),
    );
    expect(counts.Hu).toBe(1);
    expect(counts.L3).toBe(1);
  });

  it("does not count a canvas course that duplicates a transcript course", () => {
    const counts = countOf(
      buildDistributionalTallyInputs({
        taken: [
          course({
            code: "TEST 1",
            status: "completed",
            grade: "A",
            distributionals: ["WR"],
          }),
        ],
        semesters: [
          term("Fall 2026", [
            course({
              id: "other-id",
              code: "TEST 1",
              status: "not-taken",
              distributionals: ["WR"],
            }),
          ]),
        ],
        ...auto,
      }),
    );
    expect(counts.WR).toBe(1);
  });
});

describe("buildMilestoneCourseInputs", () => {
  it("marks canvas courses planned and stamps them with their column term", () => {
    const inputs = buildMilestoneCourseInputs({
      taken: [],
      semesters: [
        term("Spring 2027", [
          course({
            code: "TEST 1",
            status: "not-taken",
            credits: 0.5,
            distributionals: ["QR"],
          }),
        ]),
      ],
    });
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({
      code: "TEST 1",
      status: "planned",
      credits: 0.5,
      term: "Spring 2027",
      distributionals: ["QR"],
    });
  });

  it("carries transcript courses through with their own term and status", () => {
    const inputs = buildMilestoneCourseInputs({
      taken: [
        course({
          code: "TEST 1",
          status: "completed",
          grade: "A",
          semester: "Fall",
          year: 2025,
          distributionals: ["Hu"],
        }),
      ],
      semesters: [],
    });
    expect(inputs[0]).toMatchObject({
      status: "completed",
      term: "Fall 2025",
      grade: "A",
    });
  });

  it("dates a plan-held course from its column when it has no stored term", () => {
    const held = course({
      code: "TEST 1",
      status: "in-progress",
      distributionals: ["So"],
    });
    const inputs = buildMilestoneCourseInputs({
      taken: [held],
      semesters: [term("Fall 2026", [held])],
    });
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({ status: "in-progress", term: "Fall 2026" });
  });

  it("lets the transcript win over a duplicate canvas placement", () => {
    const inputs = buildMilestoneCourseInputs({
      taken: [
        course({
          code: "TEST 1",
          status: "completed",
          grade: "A",
          semester: "Fall",
          year: 2025,
        }),
      ],
      semesters: [
        term("Fall 2026", [
          course({ id: "other-id", code: "TEST 1", status: "not-taken" }),
        ]),
      ],
    });
    expect(inputs).toHaveLength(1);
    expect(inputs[0].status).toBe("completed");
  });

  it("drops skipped courses", () => {
    const inputs = buildMilestoneCourseInputs({
      taken: [],
      semesters: [
        term("Fall 2026", [
          course({ code: "TEST 1", status: "not-taken", skipped: true }),
        ]),
      ],
    });
    expect(inputs).toEqual([]);
  });
});
