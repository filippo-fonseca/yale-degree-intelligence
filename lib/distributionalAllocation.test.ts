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
