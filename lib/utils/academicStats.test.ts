import { describe, expect, it } from "vitest";
import { Course } from "@/lib/types";
import { getEarnedCredits } from "./academicStats";

const c = (overrides: Partial<Course>): Course =>
  ({
    code: "CPSC 201",
    name: "Test",
    semester: "Fall",
    year: 2024,
    grade: "A",
    status: "completed",
    credits: 1,
    ...overrides,
  }) as Course;

describe("getEarnedCredits", () => {
  it("sums completed courses across all terms, summer included", () => {
    const courses = [
      c({ semester: "Fall", year: 2024 }),
      c({ semester: "Spring", year: 2025 }),
      c({ semester: "Summer", year: 2025, credits: 1.5 }),
    ];
    expect(getEarnedCredits(courses)).toBe(3.5);
  });

  it("counts Credit/D/Fail, pass, and ungraded completed courses", () => {
    const courses = [
      c({ grade: "CR" }),
      c({ grade: "P" }),
      c({ grade: null }),
      c({ grade: "TR", credits: 0.5 }),
    ];
    expect(getEarnedCredits(courses)).toBe(3.5);
  });

  it("excludes in-progress, skipped, failed, and withdrawn courses", () => {
    const courses = [
      c({}),
      c({ status: "in-progress", grade: null }),
      c({ skipped: true }),
      c({ grade: "F" }),
      c({ grade: "W" }),
    ];
    expect(getEarnedCredits(courses)).toBe(1);
  });

  it("does not invent credit for a zero-credit course", () => {
    expect(getEarnedCredits([c({ credits: 0 })])).toBe(0);
  });
});
