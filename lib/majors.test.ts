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
