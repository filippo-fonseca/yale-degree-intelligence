/**
 * The allocator is a maximum matching: a multi-tag course already placed is
 * moved aside when that frees room for another course.
 */

import { describe, it, expect } from "vitest";
import type { Course } from "@/lib/types";
import { allocateDistributionals } from "@/lib/distributionalAllocation";

function course(id: string, distributionals: string[]): Course {
  return {
    id,
    code: `TEST ${id}`,
    grade: null,
    semester: "",
    year: 0,
    userId: "",
    status: "completed",
    credits: 1,
    distributionals,
  };
}

describe("allocateDistributionals", () => {
  it("moves an earlier course aside to make room for a later stage", () => {
    const x = course("x", ["Hu", "WR"]);
    const y = course("y", ["Hu"]);
    const alloc = allocateDistributionals([x, y], {
      auto: true,
      overrides: {},
      stages: [
        { courses: [x], caps: { Hu: 1, WR: 1 } },
        { courses: [y], caps: { Hu: 1, WR: 1 } },
      ],
    });
    expect(alloc.reqByCourseKey).toEqual({ x: "WR", y: "Hu" });
  });

  it("keeps a manual override fixed", () => {
    const x = course("x", ["Hu", "WR"]);
    const y = course("y", ["Hu"]);
    const alloc = allocateDistributionals([x, y], {
      auto: false,
      overrides: { "TEST x": "Hu" },
      stages: [{ courses: [x, y], caps: { Hu: 1, WR: 1 } }],
    });
    expect(alloc.reqByCourseKey.x).toBe("Hu");
  });
});

describe("allocateDistributionals: Credit/D/Fail", () => {
  it("counts a Credit/D/Fail course toward no requirement", () => {
    const x = { ...course("x", ["Hu", "WR"]), grade: "CR" };
    const y = course("y", ["Hu"]);
    const alloc = allocateDistributionals([x, y], { auto: true, overrides: {} });

    expect(alloc.reqByCourseKey).toEqual({ y: "Hu" });
    expect(alloc.coursesByReq.Hu.map((c) => c.id)).toEqual(["y"]);
    expect(alloc.coursesByReq.WR).toEqual([]);
    expect(alloc.optionsByCourseKey.x).toBeUndefined();
  });

  it("reports a Credit/D/Fail course under every requirement it is tagged for", () => {
    const x = { ...course("x", ["Hu", "WR"]), grade: " cr " };
    const alloc = allocateDistributionals([x], { auto: true, overrides: {} });

    expect(alloc.creditDFailByReq.Hu.map((c) => c.id)).toEqual(["x"]);
    expect(alloc.creditDFailByReq.WR.map((c) => c.id)).toEqual(["x"]);
    expect(alloc.creditDFailByReq.QR).toEqual([]);
  });

  it("ignores a manual override pointing a Credit/D/Fail course at a requirement", () => {
    const x = { ...course("x", ["Hu"]), grade: "CR" };
    const alloc = allocateDistributionals([x], {
      auto: false,
      overrides: { [x.code]: "Hu" },
    });
    expect(alloc.coursesByReq.Hu).toEqual([]);
  });
});
