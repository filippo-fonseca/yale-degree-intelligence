/**
 * Regression coverage for how the major calculation resolves the two things a
 * student can say about a single requirement option: "do not count the course I
 * took here" (an exclusion) and "treat this option as settled, I am not taking
 * it" (a skip).
 *
 * The ids and course codes below come from lib/data/all_reqs.json.
 */

import { describe, expect, it } from "vitest";
import {
  calculateMajorProgress,
  majorRequirements,
  type MajorCreditDFailPolicy,
} from "@/lib/majors";

const MAJOR = "CPSC_BS";
const REQUIREMENT = "Data Structures and Programming Techniques";
const CODE = "CPSC 2230";

function optionFor(
  progress: ReturnType<typeof calculateMajorProgress>,
  requirement: string,
  code: string,
) {
  const reqs = [
    ...progress.completedRequirements,
    ...progress.inProgressRequirements,
    ...progress.remainingRequirements,
  ];
  const req = reqs.find((r) => r.name === requirement);
  return req?.options.find((o) => o.code === code);
}

describe("calculateMajorProgress: skips and exclusions", () => {
  it("counts a skipped option", () => {
    const progress = calculateMajorProgress(MAJOR, [CODE], [], [CODE], [], []);
    const option = optionFor(progress, REQUIREMENT, CODE);

    expect(option?.skipped).toBe(true);
    expect(option?.completed).toBe(true);
  });

  it("does not count a completed course excluded from the requirement", () => {
    const progress = calculateMajorProgress(
      MAJOR,
      [CODE],
      [],
      [],
      [],
      [{ code: CODE, requirement: REQUIREMENT }],
    );
    const option = optionFor(progress, REQUIREMENT, CODE);

    expect(option?.completed).toBe(false);
    expect(option?.skipped).toBeFalsy();
  });

  it("lets a skip outrank an earlier exclusion of the same option", () => {
    // Skipping used to be a no-op on an option the student had excluded first:
    // the pill kept reading "not taken" no matter how many times they pressed
    // "Mark as skipped".
    const progress = calculateMajorProgress(
      MAJOR,
      [CODE],
      [],
      [CODE],
      [],
      [{ code: CODE, requirement: REQUIREMENT }],
    );
    const option = optionFor(progress, REQUIREMENT, CODE);

    expect(option?.skipped).toBe(true);
    expect(option?.completed).toBe(true);
  });
});

describe("calculateMajorProgress: Global Affairs L4 language requirement", () => {
  const GLBL = "GLBL_BA";
  const LANG_REQ = "Language Requirement (L4)";
  // Illustrative codes; tags come from the injected resolver, not the catalog.
  const TAGS: Record<string, string[]> = {
    "SPAN 1100": ["L1"],
    "SPAN 1200": ["L2"],
    "SPAN 1300": ["L3"],
    "SPAN 1400": ["L4"],
    "SPAN 2300": ["Hu", "L5"],
    "LATN 3900": ["Hu", "L5"],
    "GREK 1400": ["L4"],
  };
  const resolver = (code: string) => TAGS[code] ?? [];

  function langReq(completed: string[], inProgress: string[] = []) {
    const progress = calculateMajorProgress(
      GLBL,
      completed,
      inProgress,
      [],
      [],
      [],
      [],
      resolver,
    );
    const all = [
      ...progress.completedRequirements,
      ...progress.inProgressRequirements,
      ...progress.remainingRequirements,
    ];
    return { progress, req: all.find((r) => r.name === LANG_REQ) };
  }

  it("is part of the Global Affairs requirements and carries L4/L5 pills", () => {
    const { req } = langReq([]);
    expect(req).toBeDefined();
    expect(req?.tags).toEqual(["L4", "L5"]);
    expect(req?.satisfied).toBe(false);
  });

  it("is satisfied by a completed L4 course", () => {
    const { req, progress } = langReq(["SPAN 1400"]);
    expect(req?.satisfied).toBe(true);
    expect(req?.options.map((o) => o.code)).toEqual(["SPAN 1400"]);
    expect(
      progress.completedRequirements.some((r) => r.name === LANG_REQ),
    ).toBe(true);
  });

  it("is satisfied by a completed L5 course", () => {
    const { req } = langReq(["SPAN 2300"]);
    expect(req?.satisfied).toBe(true);
  });

  it("is not satisfied by L1-L3 courses alone", () => {
    const { req, progress } = langReq(["SPAN 1100", "SPAN 1200", "SPAN 1300"]);
    expect(req?.satisfied).toBe(false);
    expect(req?.options).toEqual([]);
    expect(
      progress.remainingRequirements.some((r) => r.name === LANG_REQ),
    ).toBe(true);
  });

  it("shows an in-progress L4 course as in progress, not satisfied", () => {
    const { req, progress } = langReq([], ["SPAN 1400"]);
    expect(req?.satisfied).toBe(false);
    expect(req?.options[0]?.inProgress).toBe(true);
    expect(
      progress.inProgressRequirements.some((r) => r.name === LANG_REQ),
    ).toBe(true);
  });

  it("does not count the language course toward the 14-course total", () => {
    const { progress } = langReq(["SPAN 1400"]);
    expect(progress.completedCredits).toBe(0);
    expect(progress.totalCredits).toBe(14);
  });

  it("accepts a manual fulfillment (placement beyond L4)", () => {
    const progress = calculateMajorProgress(
      GLBL,
      [],
      [],
      [],
      [{ code: "SPAN 1100", requirement: LANG_REQ, credits: 1 }],
      [],
      [],
      resolver,
    );
    expect(
      progress.completedRequirements.some((r) => r.name === LANG_REQ),
    ).toBe(true);
    expect(progress.completedCredits).toBe(0);
  });

  it("does not count a classical language, since YCPS asks for a modern one", () => {
    const { req } = langReq(["LATN 3900", "GREK 1400"]);
    expect(req?.completed).toBe(0);
    expect(req?.satisfied).toBe(false);
  });
});

describe("calculateMajorProgress: Credit/D/Fail", () => {
  // No major records its Cr/D/F rule yet, so the "none" and "allowed" cases
  // set the field on a real major for the length of one test.
  function withPolicy<T>(
    majorId: string,
    policy: MajorCreditDFailPolicy | undefined,
    fn: () => T,
  ): T {
    const major = majorRequirements[majorId];
    const before = major.creditDFail;
    major.creditDFail = policy;
    try {
      return fn();
    } finally {
      major.creditDFail = before;
    }
  }

  const progressFor = (completed: string[], crdf: string[]) =>
    calculateMajorProgress(
      MAJOR,
      completed,
      [],
      [],
      [],
      [],
      [],
      undefined,
      crdf,
    );

  it("records a Cr/D/F policy only as \"none\" or \"allowed\"", () => {
    for (const major of Object.values(majorRequirements)) {
      if (major.creditDFail !== undefined) {
        expect(["none", "allowed"]).toContain(major.creditDFail);
      }
    }
  });

  it("still counts a Cr/D/F course when the major's rule is unrecorded, with a warning", () => {
    const progress = progressFor([CODE], [CODE]);
    const option = optionFor(progress, REQUIREMENT, CODE);

    expect(option?.completed).toBe(true);
    expect(option?.creditDFail).toBe("unverified");
  });

  it("does not flag a course taken for a letter grade", () => {
    const option = optionFor(progressFor([CODE], []), REQUIREMENT, CODE);
    expect(option?.completed).toBe(true);
    expect(option?.creditDFail).toBeUndefined();
  });

  it("refuses a Cr/D/F course for a major whose rule is \"none\"", () => {
    withPolicy(MAJOR, "none", () => {
      const counted = progressFor([CODE], []);
      const progress = progressFor([CODE], [CODE]);
      const option = optionFor(progress, REQUIREMENT, CODE);

      expect(option?.completed).toBe(false);
      expect(option?.inProgress).toBe(false);
      expect(option?.creditDFail).toBe("refused");
      expect(progress.completedCredits).toBeLessThan(counted.completedCredits);
    });
  });

  it("counts a Cr/D/F course without a warning for a major whose rule is \"allowed\"", () => {
    withPolicy(MAJOR, "allowed", () => {
      const option = optionFor(progressFor([CODE], [CODE]), REQUIREMENT, CODE);
      expect(option?.completed).toBe(true);
      expect(option?.creditDFail).toBeUndefined();
    });
  });

  it("keeps a manual assignment of a Cr/D/F course, flagged, even under \"none\"", () => {
    withPolicy(MAJOR, "none", () => {
      const progress = calculateMajorProgress(
        MAJOR,
        [CODE],
        [],
        [],
        [{ code: CODE, requirement: REQUIREMENT, credits: 1 }],
        [],
        [],
        undefined,
        [CODE],
      );
      const option = optionFor(progress, REQUIREMENT, CODE);
      expect(option?.manual).toBe(true);
      expect(option?.completed).toBe(true);
      expect(option?.creditDFail).toBe("unverified");
    });
  });

  it("lists, but does not count, a Cr/D/F course on a distributional option under \"none\"", () => {
    const GLBL = "GLBL_BA";
    const LANG_REQ = "Language Requirement (L4)";
    const resolver = (code: string) => (code === "SPAN 1400" ? ["L4"] : []);
    withPolicy(GLBL, "none", () => {
      const progress = calculateMajorProgress(
        GLBL,
        ["SPAN 1400"],
        [],
        [],
        [],
        [],
        [],
        resolver,
        ["SPAN 1400"],
      );
      const req = [
        ...progress.completedRequirements,
        ...progress.inProgressRequirements,
        ...progress.remainingRequirements,
      ].find((r) => r.name === LANG_REQ);

      expect(req?.satisfied).toBe(false);
      expect(req?.options).toEqual([
        expect.objectContaining({
          code: "SPAN 1400",
          completed: false,
          creditDFail: "refused",
        }),
      ]);
    });
  });
});
