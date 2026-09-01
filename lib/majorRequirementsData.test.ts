/**
 * The Physics major as the catalog states it, guarded end to end.
 *
 * A student reported that DegreeIntelligence demanded four introductory
 * lecture courses when Yale asks for one two-course sequence, and that the
 * half-credit labs never registered as done. Both were data bugs on top of a
 * UI that measured requirements in credits; these are the shapes that keep
 * them fixed.
 *
 * https://catalog.yale.edu/ycps/subjects-of-instruction/physics/
 */

import { describe, expect, it } from "vitest";
import {
  calculateMajorProgress,
  countReqProgress,
  getReqsForMajor,
  majorRequirements,
} from "@/lib/majors";
import { getCanonicalCode, getCourseInfo } from "@/lib/courseCatalog";

const MAJORS = Object.entries(majorRequirements);
const allRequirements = MAJORS.flatMap(([id, major]) =>
  major.requirements.map((req) => ({ id, major, req, label: `${id} / ${req.name}` })),
);
const codesOf = (req: (typeof allRequirements)[number]["req"]) =>
  req.options.flatMap((o) => (o.type === "group" ? o.options : [o.code]));

const requirement = (majorId: string, name: string) => {
  const req = getReqsForMajor(majorId)?.requirements.find((r) => r.name === name);
  if (!req) throw new Error(`${majorId} has no requirement named "${name}"`);
  return req;
};

const progressFor = (majorId: string, name: string, completed: string[]) => {
  const progress = calculateMajorProgress(majorId, completed);
  const all = [
    ...progress.completedRequirements,
    ...progress.inProgressRequirements,
    ...progress.remainingRequirements,
  ];
  const req = all.find((r) => r.name === name);
  if (!req) throw new Error(`${majorId} has no requirement named "${name}"`);
  return req;
};

describe.each(["PHYS_BS", "PHYS_BS_INTENSIVE"])("%s introductory sequence", (majorId) => {
  it("asks for two lecture courses, not four", () => {
    expect(requirement(majorId, "Introductory Physics Sequence").required).toBe(2);
  });

  it("is satisfied by PHYS 2600 and PHYS 2610 alone", () => {
    const req = progressFor(majorId, "Introductory Physics Sequence", [
      "PHYS 2600",
      "PHYS 2610",
    ]);

    expect(req.completed).toBe(2);
    expect(req.satisfied).toBe(true);
    expect(countReqProgress(req.options, req.required)).toEqual({
      reqCompleted: 2,
      reqInProgress: 0,
    });
  });

  it("is equally satisfied by any of the other three sequences", () => {
    for (const pair of [
      ["PHYS 1700", "PHYS 1710"],
      ["PHYS 1800", "PHYS 1810"],
      ["PHYS 2000", "PHYS 2010"],
    ]) {
      expect(
        progressFor(majorId, "Introductory Physics Sequence", pair).satisfied,
      ).toBe(true);
    }
  });

  it("does not count a whole second sequence as extra progress", () => {
    const req = progressFor(majorId, "Introductory Physics Sequence", [
      "PHYS 1800",
      "PHYS 1810",
      "PHYS 2600",
      "PHYS 2610",
    ]);

    expect(req.completed).toBe(2);
    expect(countReqProgress(req.options, req.required).reqCompleted).toBe(2);
  });
});

describe.each(["PHYS_BS", "PHYS_BS_INTENSIVE"])("%s laboratories", (majorId) => {
  it("takes PHYS 2050L on its own for the introductory lab", () => {
    const req = progressFor(majorId, "Introductory Laboratory", ["PHYS 2050L"]);

    expect(req.required).toBe(1);
    expect(req.satisfied).toBe(true);
    expect(countReqProgress(req.options, req.required).reqCompleted).toBe(1);
  });

  it("also offers the PHYS 1650L / 1660L sequence", () => {
    const codes = requirement(majorId, "Introductory Laboratory").options.flatMap(
      (o) => (o.type === "group" ? o.options : [o.code]),
    );

    expect(codes).toContain("PHYS 1650L");
    expect(codes).toContain("PHYS 1660L");
  });
});

describe("PHYS_BS_INTENSIVE advanced labs", () => {
  it("counts the half-credit PHYS 2060L as one whole course", () => {
    const req = progressFor("PHYS_BS_INTENSIVE", "Advanced Lab I", ["PHYS 2060L"]);

    expect(req.required).toBe(1);
    expect(req.satisfied).toBe(true);
    // The dashboard used to compare 0.5 credits against a target of 1 here.
    expect(countReqProgress(req.options, req.required).reqCompleted).toBe(1);
  });

  it("counts PHYS 4450L for Advanced Lab II", () => {
    const req = progressFor("PHYS_BS_INTENSIVE", "Advanced Lab II", ["PHYS 4450L"]);

    expect(req.satisfied).toBe(true);
  });
});

/**
 * These hold for all 142 major variants. Each one is a bug class the audit
 * against catalog.yale.edu turned up more than eighty times over.
 */
describe("every major in all_reqs.json is internally consistent", () => {
  it("covers 142 variants, each keyed by its own id", () => {
    expect(MAJORS.length).toBe(142);
    expect(MAJORS.filter(([id, major]) => major.id !== id)).toEqual([]);
  });

  it("states `required` as a whole number of courses", () => {
    // 0.5 and 1.5 used to appear here: someone had written the requirement's
    // credit value into a field the engine reads as a course count.
    const wrong = allRequirements
      .filter(({ req }) => !Number.isInteger(req.required) || req.required < 1)
      .map(({ label, req }) => `${label} = ${req.required}`);

    expect(wrong).toEqual([]);
  });

  it("names only courses the catalog knows", () => {
    const unknown = allRequirements.flatMap(({ label, req }) =>
      codesOf(req)
        .filter((code) => !getCourseInfo(code))
        .map((code) => `${label}: ${code}`),
    );

    expect(unknown).toEqual([]);
  });

  it("names each course by its canonical code", () => {
    // getCanonicalCode is how a student's courses are matched to an option, so
    // an option naming a cross-listing or a legacy number matches nothing.
    const aliased = allRequirements.flatMap(({ label, req }) =>
      codesOf(req)
        .filter((code) => getCourseInfo(code) && getCanonicalCode(code) !== code)
        .map((code) => `${label}: ${code} should be ${getCanonicalCode(code)}`),
    );

    expect(aliased).toEqual([]);
  });

  it("never lists the same course twice in one requirement", () => {
    const duplicated = allRequirements
      .filter(({ req }) => new Set(codesOf(req)).size !== codesOf(req).length)
      .map(({ label }) => label);

    expect(duplicated).toEqual([]);
  });

  it("can be satisfied by the options it offers", () => {
    const impossible = allRequirements
      .filter(({ req }) => {
        if (req.options.length === 0) return false; // fulfilled by hand
        const countable = req.options.reduce(
          (sum, o) =>
            sum + (o.type === "group" ? Math.min(o.required, o.options.length) : 1),
          0,
        );
        return req.required > countable;
      })
      .map(({ label, req }) => `${label} needs ${req.required}`);

    expect(impossible).toEqual([]);
  });

  it("puts a choice in a group rather than a loose list of courses", () => {
    // Loose `course` options are all counted with no ceiling, so a requirement
    // that offers eight courses for two slots has to say so with a group or it
    // reads "2/4" to a student who did exactly what the catalog asks.
    const uncapped = allRequirements
      .filter(({ req }) => {
        const loose = req.options.filter((o) => o.type === "course").length;
        return !req.options.some((o) => o.type === "group") && loose > req.required;
      })
      .map(({ label, req }) => `${label}: ${req.options.length} options for ${req.required}`);

    expect(uncapped).toEqual([]);
  });

  it("gives every group at least as many options as it needs", () => {
    const short = allRequirements.flatMap(({ label, req }) =>
      req.options
        .filter((o) => o.type === "group" && o.required > o.options.length)
        .map((o) => `${label}: group needs ${(o as { required: number }).required}`),
    );

    expect(short).toEqual([]);
  });

  it("quotes a positive credit total", () => {
    const wrong = MAJORS.filter(
      ([, major]) =>
        typeof major.creditRequirements?.total !== "number" ||
        major.creditRequirements.total <= 0,
    ).map(([id]) => id);

    expect(wrong).toEqual([]);
  });

  it("computes progress for every major without throwing", () => {
    for (const [id] of MAJORS) {
      const progress = calculateMajorProgress(id, [], []);
      expect(Number.isFinite(progress.percentage), id).toBe(true);
      expect(Number.isFinite(progress.remainingCredits), id).toBe(true);
    }
  });

  it("quotes a credit total the requirements can actually earn", () => {
    // The progress bar is completed credits over `creditRequirements.total`, so
    // a total above everything the requirements can earn pins the bar below
    // 100% no matter what the student does. Chemistry read 16.5 against a
    // ceiling of 15.5 because a two-term capstone was recorded as one course.
    //
    // Only this direction is asserted. A total BELOW the sum is normal: several
    // catalogs state one set of courses through overlapping rules (a History
    // course can be the preindustrial one, the seminar and the regional one at
    // once), and the honest total there is the catalog's own course count.
    const unreachable: string[] = [];
    for (const [id, major] of MAJORS) {
      let ceiling = 0;
      for (const req of major.requirements) {
        if (req.options.length === 0) {
          ceiling += req.required; // fulfilled by hand; assume Yale's 1-credit norm
          continue;
        }
        for (const option of req.options) {
          if (option.type === "course") {
            ceiling += getCourseInfo(option.code)?.credits ?? 1;
          } else {
            ceiling += option.options
              .map((code) => getCourseInfo(code)?.credits ?? 1)
              .sort((a, b) => a - b)
              .slice(-option.required)
              .reduce((sum, credits) => sum + credits, 0);
          }
        }
      }
      const total = major.creditRequirements.total;
      if (total > ceiling) {
        unreachable.push(`${id}: total ${total} above the ${ceiling} its requirements can earn`);
      }
    }

    expect(unreachable).toEqual([]);
  });
});

/**
 * What the My Major cards add up to. `completedCredits` drives the "Total
 * Credits" card and the percentage on the bar, so it has to describe courses the
 * student really took.
 */
describe("the credit figures the cards print", () => {
  it("never claims more credits than the student's courses are worth", () => {
    const overstated: string[] = [];
    for (const [id, major] of MAJORS) {
      const taken: string[] = [];
      for (const req of major.requirements) {
        for (const option of req.options) {
          if (option.type === "course") taken.push(option.code);
          else taken.push(...option.options.slice(0, option.required));
        }
      }
      const distinct = Array.from(new Set(taken));
      const worth = distinct.reduce((sum, code) => sum + (getCourseInfo(code)?.credits ?? 1), 0);
      const { completedCredits } = calculateMajorProgress(id, distinct);
      if (completedCredits > worth + 0.001) {
        overstated.push(`${id}: card says ${completedCredits}, courses are worth ${worth}`);
      }
    }

    expect(overstated).toEqual([]);
  });

  it("counts a course once even when two requirements accept it", () => {
    // AMTH 4310 is both a breadth course and the additional breadth course.
    const shared = "AMTH 4310";
    const reqs = getReqsForMajor("AMTH_BS")!.requirements.filter((r) =>
      r.options.some((o) => (o.type === "group" ? o.options.includes(shared) : o.code === shared)),
    );
    expect(reqs.length).toBeGreaterThan(1);

    const { completedCredits } = calculateMajorProgress("AMTH_BS", [shared]);
    expect(completedCredits).toBe(getCourseInfo(shared)!.credits);
  });

  it("counts a course underway inside a group as in-progress credit", () => {
    // The group branch used to bump the count and add no credits at all, and
    // the audit turned most choices into groups.
    const { inProgressCredits } = calculateMajorProgress("PHYS_BS", [], ["PHYS 2600"]);

    expect(inProgressCredits).toBe(1);
  });

  it("never reports negative credits left or more than 100%", () => {
    const bad: string[] = [];
    for (const [id, major] of MAJORS) {
      const everything = major.requirements.flatMap((req) =>
        req.options.flatMap((o) => (o.type === "group" ? o.options : [o.code])),
      );
      const progress = calculateMajorProgress(id, everything);
      if (progress.remainingCredits < 0) bad.push(`${id}: ${progress.remainingCredits} remaining`);
      if (progress.percentage > 100) bad.push(`${id}: ${progress.percentage}%`);
      void major;
    }

    expect(bad).toEqual([]);
  });

  it("does not let one manual fulfillment close a two-course requirement", () => {
    const name = "Econometrics Sequence";
    const progress = calculateMajorProgress("CSEC_BS", [], [], [], [
      { code: "ECON 1170", requirement: name, credits: 1 },
    ]);
    const req = [
      ...progress.completedRequirements,
      ...progress.inProgressRequirements,
      ...progress.remainingRequirements,
    ].find((r) => r.name === name)!;

    expect(req.required).toBe(2);
    expect(req.completed).toBe(1);
    expect(req.satisfied).toBe(false);
    expect(progress.completedRequirements.map((r) => r.name)).not.toContain(name);
  });

  it("still lets enough manual fulfillments close a requirement", () => {
    const name = "Econometrics Sequence";
    const progress = calculateMajorProgress("CSEC_BS", [], [], [], [
      { code: "ECON 1170", requirement: name, credits: 1 },
      { code: "ECON 2123", requirement: name, credits: 1 },
    ]);

    expect(progress.completedRequirements.map((r) => r.name)).toContain(name);
  });
});

describe("Physics credit totals match the catalog", () => {
  // The catalog quotes the total "beyond the prerequisites"; DI also lists the
  // prerequisites, which are the 2-credit lecture sequence and the half-credit
  // introductory lab.
  it("has 8.5 credits beyond prerequisites for the B.S.", () => {
    expect(getReqsForMajor("PHYS_BS")?.creditRequirements.total).toBe(2 + 0.5 + 8.5);
  });

  it("has 10.5 credits beyond prerequisites for the intensive major", () => {
    expect(getReqsForMajor("PHYS_BS_INTENSIVE")?.creditRequirements.total).toBe(
      2 + 0.5 + 10.5,
    );
  });
});
