import { describe, expect, it } from "vitest";
import {
  buildCourseRequirementIndex,
  groupHitsByProgram,
  requirementBadgeLabel,
  requirementsForCourse,
} from "./simulatorRequirementBadges";

const identity = (c: string) => c.toUpperCase().trim();

function req(
  name: string,
  options: { code: string; completed?: boolean; inProgress?: boolean }[],
) {
  return {
    name,
    options: options.map((o) => ({
      code: o.code,
      completed: o.completed ?? false,
      inProgress: o.inProgress ?? false,
    })),
  };
}

function prog(parts: {
  completed?: ReturnType<typeof req>[];
  inProgress?: ReturnType<typeof req>[];
  remaining?: ReturnType<typeof req>[];
}) {
  return {
    completedRequirements: parts.completed ?? [],
    inProgressRequirements: parts.inProgress ?? [],
    remainingRequirements: parts.remaining ?? [],
  };
}

describe("buildCourseRequirementIndex", () => {
  it("indexes completed and in-progress options, skips untaken ones", () => {
    const index = buildCourseRequirementIndex(
      [
        {
          programType: "major",
          progress: {
            cs: prog({
              completed: [req("Intro", [{ code: "CPSC 2010", completed: true }])],
              inProgress: [
                req("Core", [
                  { code: "CPSC 2230", inProgress: true },
                  { code: "CPSC 3230" },
                ]),
              ],
            }),
          },
          nameOf: () => "Computer Science",
        },
      ],
      identity,
    );
    expect(requirementsForCourse(index, "CPSC 2010", identity)).toEqual([
      {
        programType: "major",
        programId: "cs",
        programName: "Computer Science",
        requirement: "Intro",
      },
    ]);
    expect(requirementsForCourse(index, "CPSC 2230", identity)).toHaveLength(1);
    expect(requirementsForCourse(index, "CPSC 3230", identity)).toEqual([]);
  });

  it("collects hits across majors and certificates in order", () => {
    const index = buildCourseRequirementIndex(
      [
        {
          programType: "major",
          progress: {
            econ: prog({
              completed: [req("Statistics", [{ code: "S&DS 2380", completed: true }])],
            }),
          },
          nameOf: () => "Economics",
        },
        {
          programType: "certificate",
          progress: {
            data: prog({
              inProgress: [req("Methods", [{ code: "S&DS 2380", inProgress: true }])],
            }),
          },
          nameOf: () => undefined,
        },
      ],
      identity,
    );
    const hits = requirementsForCourse(index, "s&ds 2380", identity);
    expect(hits.map((h) => `${h.programType}:${h.programName}:${h.requirement}`)).toEqual([
      "major:Economics:Statistics",
      "certificate:data:Methods",
    ]);
  });

  it("lists a requirement once even when the option repeats", () => {
    const index = buildCourseRequirementIndex(
      [
        {
          programType: "major",
          progress: {
            m: prog({
              completed: [
                req("Electives", [
                  { code: "MATH 2250", completed: true },
                  { code: "MATH 2250", completed: true },
                ]),
              ],
            }),
          },
          nameOf: () => "Math",
        },
      ],
      identity,
    );
    expect(requirementsForCourse(index, "MATH 2250", identity)).toHaveLength(1);
  });

  it("ignores missing progress entries", () => {
    const index = buildCourseRequirementIndex(
      [{ programType: "major", progress: { gone: undefined }, nameOf: () => "X" }],
      identity,
    );
    expect(index.size).toBe(0);
  });

  it("normalizes codes with the real catalog normalizer by default", () => {
    const index = buildCourseRequirementIndex([
      {
        programType: "major",
        progress: {
          cs: prog({
            completed: [req("Intro", [{ code: "cpsc  201", completed: true }])],
          }),
        },
        nameOf: () => "CS",
      },
    ]);
    expect(requirementsForCourse(index, "CPSC 2010")).toHaveLength(1);
  });
});

describe("groupHitsByProgram / requirementBadgeLabel", () => {
  const hits = [
    { programType: "major" as const, programId: "cs", programName: "CS", requirement: "Core" },
    { programType: "certificate" as const, programId: "d", programName: "Data", requirement: "Methods" },
    { programType: "major" as const, programId: "cs", programName: "CS", requirement: "Electives" },
  ];

  it("groups by program in first-seen order", () => {
    expect(groupHitsByProgram(hits)).toEqual([
      { programType: "major", programId: "cs", programName: "CS", requirements: ["Core", "Electives"] },
      { programType: "certificate", programId: "d", programName: "Data", requirements: ["Methods"] },
    ]);
  });

  it("builds a readable label", () => {
    expect(requirementBadgeLabel(hits)).toBe(
      "Counts toward CS: Core, Electives; Data: Methods",
    );
    expect(requirementBadgeLabel([])).toBe("");
  });
});
