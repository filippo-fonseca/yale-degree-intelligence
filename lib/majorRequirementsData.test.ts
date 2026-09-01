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
import { calculateMajorProgress, countReqProgress, getReqsForMajor } from "@/lib/majors";

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
