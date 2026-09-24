/**
 * Regression coverage for how the major calculation resolves the two things a
 * student can say about a single requirement option: "do not count the course I
 * took here" (an exclusion) and "treat this option as settled, I am not taking
 * it" (a skip).
 *
 * The ids and course codes below come from lib/data/all_reqs.json.
 */

import { describe, expect, it } from "vitest";
import { calculateMajorProgress } from "@/lib/majors";

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
