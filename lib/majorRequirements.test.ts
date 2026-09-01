/**
 * The Physics majors are where the two ways of measuring a requirement pulled
 * apart, so they are the regression case: `required` counts courses, and a
 * half-credit lab is one course.
 *
 * Reported from the Physics B.S. Intensive: the intro lecture sequence asked
 * for four courses when a sequence is two terms, the intro lab asked for two
 * when PHYS 2050L alone satisfies it, and Advanced Lab I never went green on
 * PHYS 2060L because the board was adding up credits (0.5) and comparing them
 * against a course count (1).
 */

import { describe, expect, it } from "vitest";

import allReqs from "@/lib/data/all_reqs.json";
import { getCourseInfo } from "@/lib/courseCatalog";
import { calculateMajorProgress, majorRequirements } from "@/lib/majors";
import { tallyRequirementOptions } from "@/lib/requirementProgress";

const INTENSIVE = "PHYS_BS_INTENSIVE";

function requirement(
  progress: ReturnType<typeof calculateMajorProgress>,
  name: string,
) {
  const all = [
    ...progress.completedRequirements,
    ...progress.inProgressRequirements,
    ...progress.remainingRequirements,
  ];
  const found = all.find((r) => r.name === name);
  if (!found) throw new Error(`No requirement named ${name}`);
  return found;
}

/** What the progress board recomputes from the engine's options. */
function boardSatisfies(
  progress: ReturnType<typeof calculateMajorProgress>,
  name: string,
): boolean {
  const req = requirement(progress, name);
  return tallyRequirementOptions(req.options).completed >= req.required;
}

describe("Physics B.S. Intensive", () => {
  it("counts one full lecture sequence as the whole intro requirement", () => {
    const progress = calculateMajorProgress(INTENSIVE, [
      "PHYS 2600",
      "PHYS 2610",
    ]);
    const req = requirement(progress, "Introductory Physics Sequence");

    expect(req.required).toBe(2);
    expect(req.satisfied).toBe(true);
    expect(boardSatisfies(progress, "Introductory Physics Sequence")).toBe(true);
  });

  it("does not call a half-finished sequence done", () => {
    const progress = calculateMajorProgress(INTENSIVE, ["PHYS 2600"]);

    expect(requirement(progress, "Introductory Physics Sequence").satisfied).toBe(
      false,
    );
  });

  it("takes PHYS 2050L alone for the introductory lab", () => {
    const progress = calculateMajorProgress(INTENSIVE, ["PHYS 2050L"]);
    const req = requirement(progress, "Introductory Laboratory");

    expect(req.required).toBe(1);
    expect(req.satisfied).toBe(true);
    expect(boardSatisfies(progress, "Introductory Laboratory")).toBe(true);
  });

  it("takes the PHYS 1650L-1660L sequence for the introductory lab", () => {
    const progress = calculateMajorProgress(INTENSIVE, [
      "PHYS 1650L",
      "PHYS 1660L",
    ]);

    expect(requirement(progress, "Introductory Laboratory").satisfied).toBe(true);
  });

  it("goes green on Advanced Lab I with the only course that satisfies it", () => {
    // PHYS 2060L is worth 0.5, and the board used to compare that against a
    // required of 1, so the card sat in Remaining with the course completed.
    const progress = calculateMajorProgress(INTENSIVE, ["PHYS 2060L"]);
    const req = requirement(progress, "Advanced Lab I");

    expect(getCourseInfo("PHYS 2060L")?.credits).toBe(0.5);
    expect(req.satisfied).toBe(true);
    expect(boardSatisfies(progress, "Advanced Lab I")).toBe(true);
  });

  it("adds up to the 13 credits the major declares", () => {
    const major = majorRequirements[INTENSIVE];
    const credits = major.requirements.reduce((total, req) => {
      const perCourse = req.options
        .map((option) =>
          option.type === "course" ? getCourseInfo(option.code)?.credits : undefined,
        )
        .filter((value): value is number => typeof value === "number");
      // An empty requirement (the DUS-approved advanced elective) is a full
      // course credit; otherwise the cheapest option is the one a student can
      // finish it with.
      const unit = perCourse.length ? Math.min(...perCourse) : 1;
      return total + req.required * unit;
    }, 0);

    expect(credits).toBe(major.creditRequirements.total);
  });
});

describe("requirement data speaks in courses", () => {
  const requirements = Object.entries(
    allReqs as Record<string, { requirements: any[] }>,
  ).flatMap(([majorId, major]) =>
    (major.requirements || []).map((req) => ({ majorId, req })),
  );

  it("never states `required` as a credit value", () => {
    // 0.5 here means "one half-credit lab", and the engine reads it as half a
    // course. Keeping the two units apart is the whole point.
    const fractional = requirements
      .filter(
        ({ req }) =>
          typeof req.required === "number" && !Number.isInteger(req.required),
      )
      .map(({ majorId, req }) => `${majorId}: ${req.name} (${req.required})`);

    expect(fractional).toEqual([]);
  });

  it("holds one well-formed option object per option", () => {
    const malformed = requirements
      .flatMap(({ majorId, req }) =>
        (req.options || []).map((option: unknown) => ({ majorId, req, option })),
      )
      .filter(
        ({ option }) =>
          typeof option !== "object" ||
          option === null ||
          Array.isArray(option) ||
          !("type" in option),
      )
      .map(({ majorId, req }) => `${majorId}: ${req.name}`);

    expect(malformed).toEqual([]);
  });
});

describe("tallyRequirementOptions", () => {
  it("counts a half-credit lab as one course", () => {
    const tally = tallyRequirementOptions([
      { completed: true },
      { inProgress: true },
      {},
    ]);

    expect(tally).toEqual({ completed: 1, inProgress: 1 });
  });

  it("does not count a course twice when it is both flags", () => {
    expect(
      tallyRequirementOptions([{ completed: true, inProgress: true }]),
    ).toEqual({ completed: 1, inProgress: 0 });
  });
});
