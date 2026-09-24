/**
 * Yale's distributional requirements are checked at four cumulative promotion
 * milestones, not once at graduation. These tests pin the chart's shape, the
 * two grading bases (enrollment for the first two, passing letter grades for
 * the last two), and the behind / on-track verdict.
 */

import { describe, it, expect } from "vitest";
import {
  DISTRIBUTIONAL_MILESTONES,
  enrollmentTermName,
  evaluateDistributionalMilestones,
  termsEnrolledAsOf,
  toMilestoneCourseInputs,
  type MilestoneCourseInput,
  type MilestoneEvaluation,
  type MilestoneResult,
} from "@/lib/distributionalMilestones";
import type { Course } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

let seq = 0;

/** A milestone input with sane defaults; `TEST` codes are not in the catalog. */
function c(
  partial: Partial<MilestoneCourseInput> & { distributionals?: string[] },
): MilestoneCourseInput {
  seq += 1;
  return {
    id: partial.id ?? `id-${seq}`,
    code: partial.code ?? `TEST ${100 + seq}`,
    credits: partial.credits ?? 1,
    distributionals: partial.distributionals ?? [],
    status: partial.status ?? "completed",
    grade: partial.grade ?? "A",
    term: partial.term ?? "Fall 2024",
  };
}

/** Untagged completed filler, purely to clear a credit threshold. */
function filler(n: number, term = "Fall 2024"): MilestoneCourseInput[] {
  return Array.from({ length: n }, () => c({ term }));
}

function milestone(res: MilestoneEvaluation, key: string): MilestoneResult {
  const found = res.milestones.find((m) => m.key === key);
  if (!found) throw new Error(`no milestone ${key}`);
  return found;
}

/** Which requirement each chart bar carries, top to bottom. */
function fills(m: MilestoneResult): string[] {
  return m.slots.map((s) => s.fill);
}

/* -------------------------------------------------------------------------- */
/* Term mapping                                                               */
/* -------------------------------------------------------------------------- */

describe("enrollmentTermName", () => {
  it("maps the eight terms of enrollment onto the plan grid", () => {
    expect(enrollmentTermName(2028, 1)).toBe("Fall 2024");
    expect(enrollmentTermName(2028, 2)).toBe("Spring 2025");
    expect(enrollmentTermName(2028, 3)).toBe("Fall 2025");
    expect(enrollmentTermName(2028, 4)).toBe("Spring 2026");
    expect(enrollmentTermName(2028, 5)).toBe("Fall 2026");
    expect(enrollmentTermName(2028, 6)).toBe("Spring 2027");
    expect(enrollmentTermName(2028, 7)).toBe("Fall 2027");
    expect(enrollmentTermName(2028, 8)).toBe("Spring 2028");
  });

  it("puts each milestone deadline on the term Yale checks it", () => {
    const byKey = Object.fromEntries(
      DISTRIBUTIONAL_MILESTONES.map((s) => [s.key, enrollmentTermName(2028, s.term)]),
    );
    expect(byKey).toEqual({
      "first-year": "Spring 2025",
      sophomore: "Spring 2026",
      junior: "Spring 2027",
      senior: "Spring 2028",
    });
  });
});

describe("termsEnrolledAsOf", () => {
  it("counts the term under way and clamps at both ends", () => {
    expect(termsEnrolledAsOf(2028, "Spring 2024")).toBe(0);
    expect(termsEnrolledAsOf(2028, "Fall 2024")).toBe(1);
    expect(termsEnrolledAsOf(2028, "Spring 2026")).toBe(4);
    expect(termsEnrolledAsOf(2028, "Spring 2028")).toBe(8);
    expect(termsEnrolledAsOf(2028, "Fall 2030")).toBe(8);
  });

  it("is null without a graduation year", () => {
    expect(termsEnrolledAsOf(null, "Fall 2025")).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* First-year milestone                                                       */
/* -------------------------------------------------------------------------- */

describe("first-year milestone", () => {
  it("is met by one credit in two different skills categories", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        c({ code: "MATH 112", distributionals: ["QR"] }),
        c({ code: "ENGL 114", distributionals: ["WR"] }),
        ...filler(6),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2025",
    });
    const m = milestone(res, "first-year");
    expect(m.credits.earned).toBe(8);
    expect(m.credits.met).toBe(true);
    expect(fills(m)).toEqual(["done", "done"]);
    expect(m.distributionalsMet).toBe(true);
    expect(m.status).toBe("met");
  });

  it("is not met by two courses in the SAME skills category", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        c({ code: "MATH 112", distributionals: ["QR"] }),
        c({ code: "MATH 115", distributionals: ["QR"] }),
        ...filler(6),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2025",
    });
    const m = milestone(res, "first-year");
    expect(fills(m)).toEqual(["done", "empty"]);
    expect(m.distributionalsMet).toBe(false);
    expect(m.notes.join(" ")).toContain("QR, WR, or L");
  });

  it("accepts a language course as one of the two skills", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        c({ code: "SPAN 130", distributionals: ["L3"] }),
        c({ code: "ENGL 114", distributionals: ["WR"] }),
        ...filler(6),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2025",
    });
    expect(fills(milestone(res, "first-year"))).toEqual(["done", "done"]);
  });

  it("counts a Credit/D/Fail course, because the basis is enrollment", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        c({ code: "MATH 112", distributionals: ["QR"], grade: "CR" }),
        c({ code: "ENGL 114", distributionals: ["WR"] }),
        ...filler(6),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2025",
    });
    expect(milestone(res, "first-year").status).toBe("met");
  });
});

/* -------------------------------------------------------------------------- */
/* Sophomore milestone                                                        */
/* -------------------------------------------------------------------------- */

const SOPHOMORE_SIX = [
  c({ code: "HIST 100", distributionals: ["Hu"] }),
  c({ code: "BENG 100", distributionals: ["Sc"] }),
  c({ code: "PLSC 100", distributionals: ["So"] }),
  c({ code: "MATH 112", distributionals: ["QR"] }),
  c({ code: "ENGL 114", distributionals: ["WR"] }),
  c({ code: "SPAN 130", distributionals: ["L3"] }),
];

describe("sophomore milestone", () => {
  it("needs all three areas and all three skills", () => {
    const res = evaluateDistributionalMilestones({
      courses: [...SOPHOMORE_SIX, ...filler(10)],
      graduationYear: 2028,
      currentTerm: "Fall 2026",
    });
    const m = milestone(res, "sophomore");
    expect(m.credits.earned).toBe(16);
    expect(fills(m)).toEqual(["done", "done", "done", "done", "done", "done"]);
    expect(m.status).toBe("met");
  });

  it("leaves the missing area empty when one is absent", () => {
    const res = evaluateDistributionalMilestones({
      courses: [...SOPHOMORE_SIX.filter((x) => x.code !== "BENG 100"), ...filler(11)],
      graduationYear: 2028,
      currentTerm: "Fall 2026",
    });
    const m = milestone(res, "sophomore");
    // Bars are Hu, Sc, So, QR, WR, L.
    expect(fills(m)).toEqual(["done", "empty", "done", "done", "done", "done"]);
    expect(m.distributionalsMet).toBe(false);
    expect(m.notes.join(" ")).toContain("Sc (sciences)");
  });

  it("counts one language course, without needing the sequence finished", () => {
    const res = evaluateDistributionalMilestones({
      courses: [...SOPHOMORE_SIX, ...filler(10)],
      graduationYear: 2028,
      currentTerm: "Fall 2026",
    });
    // A single L3 course does not finish the requirement (L4 is still owed),
    // but it does fill the sophomore language bar.
    expect(milestone(res, "sophomore").slots[5].fill).toBe("done");
    expect(milestone(res, "senior").slots[10].fill).toBe("empty");
  });
});

/* -------------------------------------------------------------------------- */
/* Junior milestone and the grading basis                                     */
/* -------------------------------------------------------------------------- */

/** Enough coursework to finish every skills requirement with letter grades. */
const JUNIOR_SKILLS = [
  c({ code: "MATH 112", distributionals: ["QR"] }),
  c({ code: "MATH 115", distributionals: ["QR"] }),
  c({ code: "ENGL 114", distributionals: ["WR"] }),
  c({ code: "ENGL 120", distributionals: ["WR"] }),
  c({ code: "SPAN 140", distributionals: ["L3"] }),
  c({ code: "SPAN 150", distributionals: ["L4"] }),
];

const JUNIOR_AREAS = [
  c({ code: "HIST 100", distributionals: ["Hu"] }),
  c({ code: "BENG 100", distributionals: ["Sc"] }),
  c({ code: "PLSC 100", distributionals: ["So"] }),
];

describe("junior milestone", () => {
  it("needs 2 QR, 2 WR, a finished language, and one credit per area", () => {
    const res = evaluateDistributionalMilestones({
      courses: [...JUNIOR_SKILLS, ...JUNIOR_AREAS, ...filler(17)],
      graduationYear: 2028,
      currentTerm: "Fall 2027",
    });
    const m = milestone(res, "junior");
    expect(m.credits.earned).toBe(26);
    expect(fills(m)).toEqual(Array(8).fill("done"));
    expect(m.status).toBe("met");
  });

  it("is short when only one WR credit has been earned", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        ...JUNIOR_SKILLS.filter((x) => x.code !== "ENGL 120"),
        ...JUNIOR_AREAS,
        ...filler(18),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2027",
    });
    const m = milestone(res, "junior");
    // Bars: Hu, Sc, So, QR, WR, QR, WR, L. The second WR bar is the gap.
    expect(fills(m)).toEqual([
      "done",
      "done",
      "done",
      "done",
      "done",
      "done",
      "empty",
      "done",
    ]);
    expect(m.notes.join(" ")).toContain("1 more WR (writing) credit needed by Spring 2027");
  });

  it("does not finish the language requirement from placement level alone", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        ...JUNIOR_SKILLS.filter((x) => x.code !== "SPAN 150"),
        ...JUNIOR_AREAS,
        ...filler(18),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2027",
    });
    const m = milestone(res, "junior");
    expect(m.slots[7].fill).toBe("empty");
    expect(m.notes.join(" ")).toContain("Foreign language requirement not yet complete");
  });

  it("honours an explicit placement level over the inferred one", () => {
    const courses = [
      c({ code: "SPAN 150", distributionals: ["L4"] }),
      ...JUNIOR_SKILLS.filter((x) => !x.code.startsWith("SPAN")),
      ...JUNIOR_AREAS,
      ...filler(18),
    ];
    const res = evaluateDistributionalMilestones({
      courses,
      graduationYear: 2028,
      currentTerm: "Fall 2027",
      languagePlacement: "L4",
    });
    // Placed into L4, one L4 course finishes it, and no inference caveat.
    expect(milestone(res, "junior").slots[7].fill).toBe("done");
    expect(milestone(res, "junior").notes.join(" ")).not.toContain("inferred");
  });
});

describe("grading basis", () => {
  const crWriting = c({ code: "ENGL 114", distributionals: ["WR"], grade: "CR" });

  it("a Credit/D/Fail writing course counts for sophomore but not for junior", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        crWriting,
        ...JUNIOR_SKILLS.filter((x) => !x.code.startsWith("ENGL")),
        c({ code: "ENGL 120", distributionals: ["WR"] }),
        ...JUNIOR_AREAS,
        ...filler(17),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2027",
    });
    // Sophomore only needs one WR credit and takes the CR course happily.
    expect(milestone(res, "sophomore").slots[4].fill).toBe("done");
    // Junior needs two WR credits by letter grade and only has one.
    const junior = milestone(res, "junior");
    expect(junior.slots[4].fill).toBe("done");
    expect(junior.slots[6].fill).toBe("empty");
  });

  it("a settled Credit/D/Fail course is not even projected on the letter basis", () => {
    const res = evaluateDistributionalMilestones({
      courses: [crWriting, ...filler(30)],
      graduationYear: 2028,
      currentTerm: "Fall 2027",
    });
    expect(milestone(res, "junior").slots[4].fill).toBe("empty");
  });

  it("an in-progress course is done for sophomore and projected for junior", () => {
    const inProgress = c({
      code: "ENGL 114",
      distributionals: ["WR"],
      status: "in-progress",
      grade: "In Progress",
    });
    const res = evaluateDistributionalMilestones({
      courses: [inProgress, ...filler(30)],
      graduationYear: 2028,
      currentTerm: "Fall 2027",
    });
    expect(milestone(res, "sophomore").slots[4].fill).toBe("done");
    expect(milestone(res, "junior").slots[4].fill).toBe("projected");
  });
});

/* -------------------------------------------------------------------------- */
/* Planned coursework, half credits, single counting                          */
/* -------------------------------------------------------------------------- */

describe("planned coursework", () => {
  it("fills a bar as projected, never as done", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        c({ code: "MATH 112", distributionals: ["QR"] }),
        c({ code: "ENGL 114", distributionals: ["WR"], status: "planned", grade: null }),
        ...filler(6),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2025",
    });
    const m = milestone(res, "first-year");
    expect(fills(m)).toEqual(["done", "projected"]);
    expect(m.distributionalsMet).toBe(false);
    expect(m.distributionalsProjectedMet).toBe(true);
    expect(m.status).toBe("projected");
  });

  it("does not count planned credits as earned", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        ...filler(6),
        c({ status: "planned", grade: null }),
        c({ status: "planned", grade: null }),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2025",
    });
    const m = milestone(res, "first-year");
    expect(m.credits.earned).toBe(6);
    expect(m.credits.projected).toBe(8);
    expect(m.credits.met).toBe(false);
    expect(m.credits.projectedMet).toBe(true);
  });
});

describe("half-credit courses", () => {
  it("take two of them to fill one bar", () => {
    const half = (code: string) =>
      c({ code, credits: 0.5, distributionals: ["WR"] });
    const one = evaluateDistributionalMilestones({
      courses: [half("ENGL 114"), c({ code: "MATH 112", distributionals: ["QR"] }), ...filler(7)],
      graduationYear: 2028,
      currentTerm: "Fall 2025",
    });
    expect(fills(milestone(one, "first-year"))).toEqual(["done", "empty"]);

    const two = evaluateDistributionalMilestones({
      courses: [
        half("ENGL 114"),
        half("ENGL 120"),
        c({ code: "MATH 112", distributionals: ["QR"] }),
        ...filler(7),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2025",
    });
    expect(fills(milestone(two, "first-year"))).toEqual(["done", "done"]);
  });

  it("contributes fractionally to the promotion credit total", () => {
    const res = evaluateDistributionalMilestones({
      courses: [c({ credits: 0.5 }), c({ credits: 0.5 }), ...filler(7)],
      graduationYear: 2028,
      currentTerm: "Fall 2025",
    });
    expect(milestone(res, "first-year").credits.earned).toBe(8);
  });
});

describe("multi-tag courses", () => {
  it("are single-counted across the areas they could satisfy", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        c({ code: "ARCH 100", distributionals: ["Hu", "So"] }),
        c({ code: "BENG 100", distributionals: ["Sc"] }),
        c({ code: "MATH 112", distributionals: ["QR"] }),
        c({ code: "ENGL 114", distributionals: ["WR"] }),
        c({ code: "SPAN 130", distributionals: ["L3"] }),
        ...filler(11),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2026",
    });
    const m = milestone(res, "sophomore");
    // One course cannot fill both the Hu and the So bar.
    const areaFills = m.slots.slice(0, 3).map((s) => s.fill);
    expect(areaFills.filter((f) => f === "done")).toHaveLength(2);
    expect(areaFills.filter((f) => f === "empty")).toHaveLength(1);
  });

  it("counts a course toward one area and its language level separately", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        c({ code: "SPAN 200", distributionals: ["Hu", "L4"] }),
        c({ code: "MATH 112", distributionals: ["QR"] }),
        ...filler(6),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2025",
    });
    // Language levels are a separate axis, so Hu and L both light up.
    expect(fills(milestone(res, "first-year"))).toEqual(["done", "done"]);
    expect(milestone(res, "sophomore").slots[0].fill).toBe("done");
  });
});

/* -------------------------------------------------------------------------- */
/* Deadlines and status                                                       */
/* -------------------------------------------------------------------------- */

describe("deadlines", () => {
  it("ignores coursework taken after the milestone's deadline", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        c({ code: "MATH 112", distributionals: ["QR"], term: "Fall 2024" }),
        c({ code: "ENGL 114", distributionals: ["WR"], term: "Fall 2027" }),
        ...filler(8),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2027",
    });
    // The writing course lands after Spring 2025, so the first-year bar is empty.
    expect(fills(milestone(res, "first-year"))).toEqual(["done", "empty"]);
    expect(milestone(res, "senior").slots[7].fill).toBe("done");
  });

  it("treats undated coursework as already taken", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        c({ code: "MATH 112", distributionals: ["QR"], term: null }),
        c({ code: "ENGL 114", distributionals: ["WR"], term: null }),
        ...filler(6, "Fall 2024"),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2025",
    });
    expect(fills(milestone(res, "first-year"))).toEqual(["done", "done"]);
  });
});

describe("status", () => {
  const bare = { courses: [], graduationYear: 2028 };

  it("is missed once the deadline has passed unmet", () => {
    const res = evaluateDistributionalMilestones({ ...bare, currentTerm: "Fall 2026" });
    expect(milestone(res, "first-year").status).toBe("missed");
  });

  it("is at-risk for the milestone whose deadline is next", () => {
    const res = evaluateDistributionalMilestones({ ...bare, currentTerm: "Fall 2026" });
    const junior = milestone(res, "junior");
    expect(junior.isCurrent).toBe(true);
    expect(junior.status).toBe("at-risk");
  });

  it("is upcoming for a later milestone that is not yet at risk", () => {
    const res = evaluateDistributionalMilestones({ ...bare, currentTerm: "Fall 2026" });
    expect(milestone(res, "senior").isCurrent).toBe(false);
    expect(milestone(res, "senior").status).toBe("upcoming");
  });

  it("marks exactly one milestone current", () => {
    const res = evaluateDistributionalMilestones({ ...bare, currentTerm: "Fall 2024" });
    expect(res.milestones.filter((m) => m.isCurrent).map((m) => m.key)).toEqual([
      "first-year",
    ]);
    expect(res.termsEnrolled).toBe(1);
  });

  it("falls back to at-risk with no graduation year, and reports no deadlines", () => {
    const res = evaluateDistributionalMilestones({
      courses: [],
      currentTerm: "Fall 2026",
    });
    expect(res.termsEnrolled).toBeNull();
    res.milestones.forEach((m) => {
      expect(m.deadlineTerm).toBeNull();
      expect(m.status).toBe("at-risk");
      expect(m.isCurrent).toBe(false);
    });
  });

  it("still reports met without a graduation year when everything is done", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        c({ code: "MATH 112", distributionals: ["QR"] }),
        c({ code: "ENGL 114", distributionals: ["WR"] }),
        ...filler(6),
      ],
      currentTerm: "Fall 2026",
    });
    expect(milestone(res, "first-year").status).toBe("met");
  });
});

/* -------------------------------------------------------------------------- */
/* Adapter                                                                    */
/* -------------------------------------------------------------------------- */

describe("toMilestoneCourseInputs", () => {
  const base: Course = {
    id: "a",
    code: "ENGL 114",
    grade: "A",
    semester: "Fall",
    year: 2024,
    userId: "u",
    status: "completed",
    credits: 1,
    distributionals: ["WR"],
  };

  it("carries term, tags, and status across", () => {
    const [out] = toMilestoneCourseInputs([base]);
    expect(out).toMatchObject({
      id: "a",
      code: "ENGL 114",
      credits: 1,
      distributionals: ["WR"],
      status: "completed",
      grade: "A",
      term: "Fall 2024",
    });
  });

  it("reads an In Progress grade as in-progress", () => {
    const [out] = toMilestoneCourseInputs([
      { ...base, grade: "In Progress", status: "completed" },
    ]);
    expect(out.status).toBe("in-progress");
  });

  it("treats a not-taken course as planned", () => {
    const [out] = toMilestoneCourseInputs([{ ...base, status: "not-taken" }]);
    expect(out.status).toBe("planned");
  });

  it("drops skipped major placeholders", () => {
    const out = toMilestoneCourseInputs([
      base,
      { ...base, id: "b", skipped: true },
      { ...base, id: "c", status: "skipped", semester: "Skipped" },
    ]);
    expect(out.map((x) => x.id)).toEqual(["a"]);
  });

  it("nulls a term it cannot parse", () => {
    const [out] = toMilestoneCourseInputs([{ ...base, semester: "", year: 0 }]);
    expect(out.term).toBeNull();
  });

  it("keeps skipped courses out of credits and bars end to end", () => {
    const courses: Course[] = [
      ...Array.from({ length: 8 }, (_, i) => ({
        ...base,
        id: `f${i}`,
        code: `TEST ${900 + i}`,
        distributionals: [],
      })),
      { ...base, id: "skip", code: "MATH 112", distributionals: ["QR"], skipped: true },
    ];
    const res = evaluateDistributionalMilestones({
      courses: toMilestoneCourseInputs(courses),
      graduationYear: 2028,
      currentTerm: "Fall 2025",
    });
    const m = milestone(res, "first-year");
    expect(m.credits.earned).toBe(8);
    expect(m.slots.some((s) => s.source === "MATH 112")).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Cumulative columns                                                         */
/* -------------------------------------------------------------------------- */

describe("ahead-of-checkpoint credit", () => {
  const eval2028 = (courses: MilestoneCourseInput[]) =>
    evaluateDistributionalMilestones({
      courses,
      graduationYear: 2028,
      currentTerm: "Fall 2027",
    });

  it("shows a second Hu credit on the junior column, where only one is due", () => {
    const res = eval2028([
      c({ code: "PHIL 101", distributionals: ["Hu"], term: "Fall 2024" }),
      c({ code: "ENGL 101", distributionals: ["Hu"], term: "Spring 2026" }),
    ]);
    const junior = milestone(res, "junior");
    expect(junior.slots.filter((s) => s.req === "Hu" && s.fill === "done")).toHaveLength(1);
    expect(junior.ahead.map((s) => [s.req, s.fill, s.source])).toContainEqual([
      "Hu",
      "done",
      "ENGL 101",
    ]);
  });

  it("carries earlier credit into the first-year column beyond its two skills", () => {
    const res = eval2028([
      c({ code: "MATH 112", distributionals: ["QR"], term: "Fall 2024" }),
      c({ code: "ENGL 114", distributionals: ["WR"], term: "Fall 2024" }),
      c({ code: "PSYC 110", distributionals: ["So"], term: "Spring 2025" }),
    ]);
    const first = milestone(res, "first-year");
    expect(first.slots.map((s) => s.resolvedReq)).toEqual(["QR", "WR"]);
    expect(first.ahead.map((s) => s.req)).toEqual(["So"]);
  });

  it("never adds ahead bars to the senior column and never lists open slots", () => {
    const res = eval2028([c({ code: "PHIL 101", distributionals: ["Hu"] })]);
    expect(milestone(res, "senior").ahead).toEqual([]);
    res.milestones.forEach((m) =>
      m.ahead.forEach((s) => expect(s.fill).not.toBe("empty")),
    );
  });

  it("ignores credit that lands after the checkpoint", () => {
    const res = eval2028([
      c({ code: "PHIL 101", distributionals: ["Hu"], term: "Fall 2024" }),
      c({ code: "ENGL 101", distributionals: ["Hu"], term: "Fall 2027" }),
    ]);
    expect(milestone(res, "junior").ahead.some((s) => s.req === "Hu")).toBe(false);
  });
});

describe("slot source status", () => {
  it("tells planned coursework apart from coursework in progress", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        c({ code: "PHIL 101", distributionals: ["Hu"], status: "in-progress", grade: null, term: "Fall 2027" }),
        c({ code: "ENGL 101", distributionals: ["Hu"], status: "planned", grade: null, term: "Spring 2028" }),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2027",
    });
    const hu = milestone(res, "senior").slots.filter((s) => s.req === "Hu");
    expect(hu.map((s) => [s.fill, s.sourceStatus])).toEqual([
      ["projected", "in-progress"],
      ["projected", "planned"],
    ]);
  });

  it("does not let a skill already done fill the second first-year bar as planned", () => {
    const res = evaluateDistributionalMilestones({
      courses: [
        c({ code: "ENGL 114", distributionals: ["WR"], term: "Fall 2024" }),
        c({ code: "ENGL 115", distributionals: ["WR"], status: "planned", grade: null, term: "Spring 2025" }),
        c({ code: "MATH 112", distributionals: ["QR"], status: "planned", grade: null, term: "Spring 2025" }),
      ],
      graduationYear: 2028,
      currentTerm: "Fall 2024",
    });
    const first = milestone(res, "first-year");
    expect(first.slots.map((s) => [s.fill, s.resolvedReq])).toEqual([
      ["done", "WR"],
      ["projected", "QR"],
    ]);
  });
});
