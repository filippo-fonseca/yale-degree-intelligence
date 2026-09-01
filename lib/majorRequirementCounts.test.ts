/**
 * `required` in lib/data/all_reqs.json counts COURSES. The dashboard used to
 * add up option CREDITS and compare that sum to it, so every requirement that
 * only half-credit courses can satisfy was permanently unfinishable: a Physics
 * major who had passed PHYS 2060L saw the advanced lab sitting at "0.5/1".
 */

import { describe, expect, it } from "vitest";
import { countReqProgress } from "@/lib/majors";

describe("countReqProgress", () => {
  it("counts a half-credit lab as one whole course", () => {
    const options = [{ completed: true, inProgress: false }];

    expect(countReqProgress(options, 1)).toEqual({
      reqCompleted: 1,
      reqInProgress: 0,
    });
  });

  it("does not let extra options overshoot the requirement", () => {
    // The four introductory Physics sequences are listed as eight options for
    // one two-course requirement, so a student who took two of them must still
    // read 2/2 and not 4/2.
    const options = Array.from({ length: 4 }, () => ({ completed: true }));

    expect(countReqProgress(options, 2)).toEqual({
      reqCompleted: 2,
      reqInProgress: 0,
    });
  });

  it("only counts in-progress work toward the slots still open", () => {
    const options = [
      { completed: true },
      { inProgress: true },
      { inProgress: true },
    ];

    expect(countReqProgress(options, 2)).toEqual({
      reqCompleted: 1,
      reqInProgress: 1,
    });
  });

  it("never counts one option as both completed and in progress", () => {
    const options = [{ completed: true, inProgress: true }];

    expect(countReqProgress(options, 1)).toEqual({
      reqCompleted: 1,
      reqInProgress: 0,
    });
  });

  it("reports raw counts for open-ended requirements", () => {
    // `required: 0` shows up on informational rows; there is nothing to clamp to.
    const options = [{ completed: true }, { inProgress: true }];

    expect(countReqProgress(options, 0)).toEqual({
      reqCompleted: 1,
      reqInProgress: 1,
    });
  });

  it("treats a missing options list as no progress", () => {
    expect(countReqProgress(undefined, 3)).toEqual({
      reqCompleted: 0,
      reqInProgress: 0,
    });
  });
});
