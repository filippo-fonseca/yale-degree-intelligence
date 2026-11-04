/**
 * Credit/D/Fail detection and the tag view the distributional engines read.
 */

import { describe, it, expect } from "vitest";
import {
  countingDistributionals,
  creditDFailMajorNote,
  isCreditDFail,
  isCreditDFailCourse,
} from "@/lib/utils/creditDFail";

describe("isCreditDFail", () => {
  it("recognises CR in any case and with stray whitespace", () => {
    expect(isCreditDFail("CR")).toBe(true);
    expect(isCreditDFail(" cr ")).toBe(true);
  });

  it("does not treat letter grades, ABX, or a missing grade as Cr/D/F", () => {
    for (const g of ["A", "D", "F", "ABX", "In Progress", "", null, undefined]) {
      expect(isCreditDFail(g)).toBe(false);
    }
    expect(isCreditDFailCourse(null)).toBe(false);
  });
});

describe("countingDistributionals", () => {
  it("returns the stored tags for a graded course", () => {
    expect(
      countingDistributionals({ code: "TEST 1", grade: "B+", distributionals: ["Hu", "WR"] }),
    ).toEqual(["Hu", "WR"]);
  });

  it("returns nothing for a Credit/D/Fail course", () => {
    expect(
      countingDistributionals({ code: "TEST 1", grade: "CR", distributionals: ["Hu", "L2"] }),
    ).toEqual([]);
  });
});

describe("creditDFailMajorNote", () => {
  it("picks the refusal or the generic warning", () => {
    expect(creditDFailMajorNote("refused")).toMatch(/does not count/);
    expect(creditDFailMajorNote("unverified")).toMatch(/check your major/);
    expect(creditDFailMajorNote(undefined)).toBeNull();
  });
});
