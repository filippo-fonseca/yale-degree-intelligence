import { describe, it, expect } from "vitest";
import type { Course } from "./types";
import {
  courseTermName,
  reconcilePlanSemesters,
  type PlanSemester,
} from "./simulatorPlanReconcile";

// Local dates, since the term helper reads local getMonth/getFullYear.
const at = (year: number, month1Indexed: number, day: number) =>
  new Date(year, month1Indexed - 1, day, 12, 0, 0);

// Rohan's message came in late August 2026: Fall 2026 is the current term.
const NOW = at(2026, 8, 28);

function course(
  code: string,
  semester: string,
  year: number,
  status: Course["status"],
  grade: string | null = status === "completed" ? "A" : null,
): Course {
  return {
    id: `${code}-${semester}-${year}`,
    code,
    grade,
    semester,
    year,
    userId: "u1",
    status,
    credits: 1,
  };
}

const planned = (code: string): Course => ({
  ...course(code, "", 0, "not-taken"),
  id: `planned-${code}`,
});

function sem(name: string, courses: Course[] = []): PlanSemester {
  const [term, year] = name.split(" ");
  return { id: `${term}-${year}`, name, courses };
}

const names = (sems: PlanSemester[]) => sems.map((s) => s.name);
const codes = (sems: PlanSemester[], name: string) =>
  sems.find((s) => s.name === name)?.courses.map((c) => c.code) ?? [];

describe("courseTermName", () => {
  it("formats Fall and Spring courses", () => {
    expect(courseTermName(course("A", "Fall", 2025, "completed"))).toBe(
      "Fall 2025",
    );
    expect(courseTermName(course("A", "Spring", 2026, "completed"))).toBe(
      "Spring 2026",
    );
  });

  it("returns null for summer sessions, which get no column", () => {
    expect(courseTermName(course("A", "Summer", 2026, "completed"))).toBeNull();
  });
});

describe("reconcilePlanSemesters", () => {
  it("fills a locked past semester with every course the transcript has for it", () => {
    // Plan saved in April 2026 with only two of the Spring courses.
    const plan = [
      sem("Fall 2025", [course("MATH 120", "Fall", 2025, "completed")]),
      sem("Spring 2026", [
        course("CPSC 201", "Spring", 2026, "in-progress"),
        course("ENGL 120", "Spring", 2026, "in-progress"),
      ]),
      sem("Fall 2026", [planned("CPSC 223")]),
    ];
    // Transcript re-uploaded in August: grades in, a third Spring course.
    const transcript = [
      course("MATH 120", "Fall", 2025, "completed"),
      course("CPSC 201", "Spring", 2026, "completed"),
      course("ENGL 120", "Spring", 2026, "completed"),
      course("ECON 115", "Spring", 2026, "completed"),
    ];

    const out = reconcilePlanSemesters(plan, transcript, 2029, NOW);

    expect(codes(out, "Spring 2026")).toEqual([
      "CPSC 201",
      "ENGL 120",
      "ECON 115",
    ]);
    // The live objects win, so the stale in-progress status is gone too.
    expect(
      out
        .find((s) => s.name === "Spring 2026")!
        .courses.every((c) => c.status === "completed"),
    ).toBe(true);
    expect(codes(out, "Fall 2026")).toEqual(["CPSC 223"]);
  });

  it("keeps planned placements and drops a planned course the student has since taken", () => {
    const plan = [
      sem("Spring 2026", []),
      sem("Fall 2026", [planned("CPSC 223"), planned("MATH 225")]),
      sem("Spring 2027", [planned("CPSC 323")]),
    ];
    const transcript = [course("CPSC 223", "Fall", 2026, "in-progress")];

    const out = reconcilePlanSemesters(plan, transcript, 2028, NOW);

    expect(codes(out, "Fall 2026")).toEqual(["CPSC 223", "MATH 225"]);
    expect(
      out.find((s) => s.name === "Fall 2026")!.courses[0].status,
    ).toBe("in-progress");
    expect(codes(out, "Spring 2027")).toEqual(["CPSC 323"]);
  });

  it("extends the grid through the current term and graduation with no gaps", () => {
    // Old plan that stopped at Spring 2026, saved by a student who then
    // pushed graduation out a year.
    const plan = [sem("Fall 2025"), sem("Spring 2026")];
    const out = reconcilePlanSemesters(plan, [], 2028, NOW);

    expect(names(out)).toEqual([
      "Fall 2025",
      "Spring 2026",
      "Fall 2026",
      "Spring 2027",
      "Fall 2027",
      "Spring 2028",
    ]);
  });

  it("reaches back to the earliest transcript term the plan never had", () => {
    const plan = [sem("Fall 2026"), sem("Spring 2027")];
    const transcript = [course("MATH 115", "Fall", 2025, "completed")];

    const out = reconcilePlanSemesters(plan, transcript, 2027, NOW);

    expect(names(out)[0]).toBe("Fall 2025");
    expect(codes(out, "Fall 2025")).toEqual(["MATH 115"]);
  });

  it("always includes the current term even past the stored graduation year", () => {
    const plan = [sem("Fall 2025"), sem("Spring 2026")];
    const out = reconcilePlanSemesters(plan, [], 2026, NOW);
    expect(names(out)).toContain("Fall 2026");
  });

  it("starts four years before graduation when nothing is known", () => {
    const out = reconcilePlanSemesters([], [], 2030, NOW);
    expect(names(out)[0]).toBe("Fall 2026");
    expect(names(out)[names(out).length - 1]).toBe("Spring 2030");
  });

  it("ignores summer courses, which have no column, without dropping the grid", () => {
    const transcript = [course("ECON 110", "Summer", 2026, "completed")];
    const out = reconcilePlanSemesters([sem("Fall 2026")], transcript, 2027, NOW);
    expect(out.flatMap((s) => s.courses)).toHaveLength(0);
    expect(names(out)).toEqual(["Fall 2026", "Spring 2027"]);
  });

  it("keeps the stored column id so drag targets stay stable", () => {
    const plan = [{ id: "custom-id", name: "Fall 2026", courses: [] }];
    const out = reconcilePlanSemesters(plan, [], 2027, NOW);
    expect(out.find((s) => s.name === "Fall 2026")!.id).toBe("custom-id");
  });

  it("is idempotent", () => {
    const plan = [
      sem("Spring 2026", [course("CPSC 201", "Spring", 2026, "in-progress")]),
      sem("Fall 2026", [planned("CPSC 223")]),
    ];
    const transcript = [
      course("CPSC 201", "Spring", 2026, "completed"),
      course("ECON 115", "Spring", 2026, "completed"),
    ];
    const once = reconcilePlanSemesters(plan, transcript, 2028, NOW);
    const twice = reconcilePlanSemesters(once, transcript, 2028, NOW);
    expect(twice).toEqual(once);
  });
});
