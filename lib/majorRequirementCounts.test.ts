/**
 * `required` in lib/data/all_reqs.json counts COURSES. The dashboard used to
 * add up option CREDITS and compare that sum to it, so every requirement that
 * only half-credit courses can satisfy was permanently unfinishable: a Physics
 * major who had passed PHYS 2060L saw the advanced lab sitting at "0.5/1".
 */

import { describe, expect, it } from "vitest";
import { countReqProgress, requirementCredits } from "@/lib/majors";

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

/**
 * The credits a board column header prints. It used to print the major-wide
 * totals instead, which disagreed with the cards underneath it on 70 of the 142
 * majors: credits earned on a half-finished requirement count toward the major
 * while the requirement itself sits under Remaining.
 */
describe("requirementCredits", () => {
  const lab = (state: Partial<{ completed: boolean; inProgress: boolean }> = {}) => ({
    code: "PHYS 2060L",
    credits: 0.5,
    ...state,
  });

  it("reports the credits behind each state", () => {
    const options = [
      { code: "A 1000", credits: 1, completed: true },
      { code: "B 1000", credits: 1, inProgress: true },
      { code: "C 1000", credits: 1 },
    ];

    expect(requirementCredits(options, 3)).toEqual({
      completed: 1,
      inProgress: 1,
      remaining: 1,
    });
  });

  it("keeps a half-credit lab at half a credit", () => {
    expect(requirementCredits([lab({ completed: true })], 1)).toEqual({
      completed: 0.5,
      inProgress: 0,
      remaining: 0,
    });
  });

  it("stops at the requirement's ceiling, however long the menu", () => {
    // The Applied Mathematics breadth requirement lists 99 acceptable courses
    // for a handful of slots; it is worth those slots and no more.
    const options = Array.from({ length: 99 }, (_, i) => ({
      code: `X ${1000 + i}`,
      credits: 1,
      completed: true,
    }));

    expect(requirementCredits(options, 2).completed).toBe(2);
  });

  it("prices what is left at the cheapest options still open", () => {
    const options = [
      { code: "A 1000", credits: 1.5 },
      { code: "B 1000", credits: 0.5 },
    ];

    expect(requirementCredits(options, 1).remaining).toBe(0.5);
  });

  it("assumes a credit per slot when there is nothing to price", () => {
    // A requirement with no options is one the student fulfils by hand.
    expect(requirementCredits([], 3).remaining).toBe(3);
  });

  it("owes nothing once the requirement is met", () => {
    const options = [
      { code: "A 1000", credits: 1, completed: true },
      { code: "B 1000", credits: 1 },
    ];

    expect(requirementCredits(options, 1).remaining).toBe(0);
  });

  it("counts a course shared by two requirements only once", () => {
    // Seventeen majors list one course under two requirements.
    const shared = [{ code: "AMTH 4310", credits: 1, completed: true }];
    const counted = new Set<string>();

    expect(requirementCredits(shared, 1, counted).completed).toBe(1);
    expect(requirementCredits(shared, 1, counted).completed).toBe(0);
  });
});
