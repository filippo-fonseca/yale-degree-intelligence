/**
 * Auto-matched major credit as seen by the policy engine.
 *
 * Almost no major credit is stored. The progress calculations match a
 * student's courses against the major's option lists and attribute the credit
 * on the fly, so for most students buildAllocations saw nothing at all and the
 * engine judged an empty picture: a zero-overlap certificate happily took a
 * course the major was already counting. These tests pin the implied claims
 * that close that gap, and the six surrounding behaviors that have to survive
 * it.
 *
 * Every certificate id, major id, and course code below was read out of
 * lib/data/all_reqs.json and lib/data/all_certificates.json before it was
 * written down.
 */

import { describe, it, expect } from "vitest";
import {
  evaluateAllocation,
  type Allocation,
  type Violation,
} from "@/lib/certificatePolicy";
import { calculateCertificateProgress } from "@/lib/certificates";
import { calculateMajorProgress } from "@/lib/majors";
import {
  buildProgramClaimContext,
  getCertificateBlockedCodes,
  getCertificateOverlapBudget,
  getMajorBlockedCodes,
  type ProgramClaimOptions,
} from "@/lib/utils/programClaims";
import { Course, ManualRequirement } from "@/lib/types";

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const course = (
  code: string,
  manuals: ManualRequirement[] = []
): Course => ({
  id: `id-${code}`,
  code,
  grade: "A",
  semester: "Fall",
  year: 2025,
  userId: "u1",
  status: "completed",
  credits: 1,
  manualRequirementsFulfilled: manuals,
});

const certManual = (
  certificate_id: string,
  requirement_title: string
): ManualRequirement => ({ certificate_id, requirement_title });

const majorManual = (
  major_id: string,
  requirement_title: string
): ManualRequirement => ({ major_id, requirement_title });

/** Display names as the catalog data spells them. */
const EECS = "Electrical Engineering and Computer Science, B.S.";
const APPLIED_MATH = "Applied Mathematics, B.S.";
const DATA_SCIENCE = "Data Science";

const allocationsFor = (
  allocations: Allocation[],
  type: "major" | "certificate",
  id: string,
  code?: string
) =>
  allocations.filter(
    (a) =>
      a.program.type === type &&
      a.program.id === id &&
      (!code || a.courseCode === code)
  );

/**
 * What a picker actually evaluates against. A stored conflict has already been
 * resolved against the certificate, so leaving it in the list would answer
 * "already fills that slot" for a course the certificate has lost.
 * AddManualCourseModal builds exactly this before it calls the engine.
 */
const settle = (allocations: Allocation[], violations: Violation[]) => {
  const key = (a: {
    courseCode: string;
    program: { type: string; id: string };
    requirementTitle: string;
  }) => `${a.courseCode}::${a.program.type}:${a.program.id}::${a.requirementTitle}`;
  const lost = new Set(violations.map(key));
  return allocations.filter((a) => !lost.has(key(a)));
};

// ---------------------------------------------------------------------------
// The user's report
// ---------------------------------------------------------------------------

describe("the EECS student who was allowed to assign CPSC 2230 to Data Science", () => {
  const options: ProgramClaimOptions = {
    majorIds: ["EECS"],
    certificateIds: ["CERT_DATA_SCIENCE"],
  };

  // No manual claim anywhere. The major counts CPSC 2230 by auto-match alone,
  // which is the entire point of the case.
  const courses = [course("CPSC 2230"), course("S&DS 2650")];

  it("materializes the auto-matched major claim the engine never used to see", () => {
    const { allocations } = buildProgramClaimContext(courses, options);

    expect(allocationsFor(allocations, "major", "EECS", "CPSC 2230")).toEqual([
      {
        courseCode: "CPSC 2230",
        program: { type: "major", id: "EECS" },
        requirementTitle: "Data Structures and Programming Techniques",
      },
    ]);
  });

  it("audits the certificate side as a zero-overlap conflict naming the major", () => {
    const { violations } = buildProgramClaimContext(courses, options);

    expect(violations).toEqual([
      {
        courseCode: "CPSC 2230",
        program: { type: "certificate", id: "CERT_DATA_SCIENCE" },
        requirementTitle: "Computation and Machine Learning",
        code: "zero-overlap",
        reason: `Already counts toward your ${EECS} major. ${DATA_SCIENCE} allows no overlap with a major.`,
      },
    ]);
  });

  it("refuses the assignment the picker used to offer", () => {
    const { allocations, violations, majorIds, certificateIds } =
      buildProgramClaimContext(courses, options);

    const verdict = evaluateAllocation({
      courseCode: "CPSC 2230",
      target: {
        type: "certificate",
        id: "CERT_DATA_SCIENCE",
        requirementTitle: "Computation and Machine Learning",
      },
      existing: settle(allocations, violations),
      majorIds,
      certificateIds,
    });

    expect(verdict).toEqual({
      allowed: false,
      kind: "blocked",
      code: "zero-overlap",
      reason: `Already counts toward your ${EECS} major. ${DATA_SCIENCE} allows no overlap with a major.`,
    });
  });

  it("blocks the course from the certificate's counting", () => {
    expect(
      getCertificateBlockedCodes(courses, "CERT_DATA_SCIENCE", options)
    ).toEqual(["CPSC 2230"]);
  });

  it("reaches the same verdicts through the legacy three-digit spelling", () => {
    const legacy = [course("CPSC 223"), course("S&DS 2650")];
    const { allocations, violations } = buildProgramClaimContext(
      legacy,
      options
    );

    expect(allocationsFor(allocations, "major", "EECS", "CPSC 2230")).toHaveLength(1);
    expect(violations.map((v) => v.courseCode)).toEqual(["CPSC 2230"]);
    expect(
      getCertificateBlockedCodes(legacy, "CERT_DATA_SCIENCE", options)
    ).toEqual(["CPSC 2230"]);
  });

  it("drops the blocked course out of the certificate's percentage", () => {
    const blocked = getCertificateBlockedCodes(
      courses,
      "CERT_DATA_SCIENCE",
      options
    );

    const before = calculateCertificateProgress(
      "CERT_DATA_SCIENCE",
      ["CPSC 2230", "S&DS 2650"],
      [],
      [],
      [],
      [],
      []
    );
    const after = calculateCertificateProgress(
      "CERT_DATA_SCIENCE",
      ["CPSC 2230", "S&DS 2650"],
      [],
      [],
      [],
      [],
      blocked
    );

    expect(after.completedCredits).toBe(before.completedCredits - 1);
    expect(after.percentage).toBeLessThan(before.percentage);
  });
});

// ---------------------------------------------------------------------------
// Subtlety 2: the major must not lose to its own implied claim
// ---------------------------------------------------------------------------

describe("majors keep the credit their implied claim describes", () => {
  const options: ProgramClaimOptions = {
    majorIds: ["EECS"],
    certificateIds: ["CERT_DATA_SCIENCE"],
  };
  const courses = [course("CPSC 2230")];

  it("answers ok when the target major is the one already holding it", () => {
    const { allocations, violations, majorIds, certificateIds } =
      buildProgramClaimContext(courses, options);

    const verdict = evaluateAllocation({
      courseCode: "CPSC 2230",
      target: {
        type: "major",
        id: "EECS",
        requirementTitle: "Data Structures and Programming Techniques",
      },
      existing: settle(allocations, violations),
      majorIds,
      certificateIds,
    });

    expect(verdict).toEqual({ allowed: true, kind: "ok" });
  });

  it("never blocks the course from the major, and the major still counts it", () => {
    const blocked = getMajorBlockedCodes(courses, options);
    expect(blocked).not.toContain("CPSC 2230");

    const progress = calculateMajorProgress(
      "EECS",
      ["CPSC 2230"],
      [],
      [],
      [],
      [],
      blocked
    );
    expect(progress.completedCredits).toBeGreaterThan(0);
  });

  it("keeps the major even when the student assigned the course to the certificate", () => {
    // The stored certificate claim is what the user managed to make. The audit
    // now resolves it the way the engine documents: the major wins the course.
    const claimed = [
      course("CPSC 2230", [
        certManual("CERT_DATA_SCIENCE", "Computation and Machine Learning"),
      ]),
    ];

    expect(getMajorBlockedCodes(claimed, options)).not.toContain("CPSC 2230");
    expect(
      getCertificateBlockedCodes(claimed, "CERT_DATA_SCIENCE", options)
    ).toEqual(["CPSC 2230"]);
  });
});

// ---------------------------------------------------------------------------
// Subtlety 3: only declared majors may imply anything
// ---------------------------------------------------------------------------

describe("implied claims come only from the majors in scope", () => {
  // CPSC 1001 sits in the option lists of EECS, Applied Mathematics, and
  // Astrophysics, among others. Declaring one of them must not conjure the
  // other two.
  const courses = [course("CPSC 1001")];

  it("names one major, not every major that lists the course", () => {
    const { allocations, violations } = buildProgramClaimContext(courses, {
      majorIds: ["AMTH_BS"],
      certificateIds: ["CERT_PROGRAMMING"],
    });

    expect(
      allocations
        .filter((a) => a.program.type === "major")
        .map((a) => a.program.id)
    ).toEqual(["AMTH_BS"]);

    expect(violations).toEqual([
      {
        courseCode: "CPSC 1001",
        program: { type: "certificate", id: "CERT_PROGRAMMING" },
        requirementTitle: "Prerequisite",
        code: "zero-overlap",
        reason: `Already counts toward your ${APPLIED_MATH} major. Programming allows no overlap with a major.`,
      },
    ]);
  });

  it("calls two declared majors two programs, so a certificate is the third", () => {
    const { allocations, violations } = buildProgramClaimContext(courses, {
      majorIds: ["AMTH_BS", "ASTR_BS"],
      certificateIds: ["CERT_PROGRAMMING"],
    });

    expect(
      allocations
        .filter((a) => a.program.type === "major")
        .map((a) => a.program.id)
        .sort()
    ).toEqual(["AMTH_BS", "ASTR_BS"]);

    expect(violations).toEqual([
      {
        courseCode: "CPSC 1001",
        program: { type: "certificate", id: "CERT_PROGRAMMING" },
        requirementTitle: "Prerequisite",
        code: "three-programs",
        reason: "A course can count toward at most two programs at Yale.",
      },
    ]);
  });

  it("implies nothing for a student who has declared no major", () => {
    const { allocations } = buildProgramClaimContext(courses, {
      certificateIds: ["CERT_PROGRAMMING"],
    });

    expect(allocations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Subtlety 1 and 4: the student's courses, counted once
// ---------------------------------------------------------------------------

describe("implied claims are bounded and never duplicated", () => {
  const options: ProgramClaimOptions = {
    majorIds: ["EECS"],
    certificateIds: ["CERT_DATA_SCIENCE"],
  };

  it("implies nothing for the rest of a major's option list", () => {
    const { allocations } = buildProgramClaimContext([course("CPSC 2230")], {
      majorIds: ["EECS"],
    });

    expect(allocations).toEqual([
      {
        courseCode: "CPSC 2230",
        program: { type: "major", id: "EECS" },
        requirementTitle: "Data Structures and Programming Techniques",
      },
    ]);
  });

  it("collapses a stored major claim and its implied twin into one", () => {
    const stored = [
      course("CPSC 2230", [
        majorManual("EECS", "Data Structures and Programming Techniques"),
      ]),
    ];
    const { allocations } = buildProgramClaimContext(stored, options);

    expect(allocationsFor(allocations, "major", "EECS")).toHaveLength(1);
    // The stored claim is the one that survived, spelled as the student stored it.
    expect(allocationsFor(allocations, "major", "EECS")[0].courseCode).toBe(
      "CPSC 2230"
    );
  });

  it("collapses them through the legacy spelling too", () => {
    const stored = [
      course("CPSC 223", [
        majorManual("EECS", "Data Structures and Programming Techniques"),
      ]),
    ];
    const { allocations } = buildProgramClaimContext(stored, options);

    expect(allocationsFor(allocations, "major", "EECS")).toHaveLength(1);
  });

  it("leaves exactly one certificate allocation for the implied overlap", () => {
    const { allocations } = buildProgramClaimContext(
      [course("CPSC 2230")],
      options
    );

    expect(
      allocationsFor(allocations, "certificate", "CERT_DATA_SCIENCE")
    ).toEqual([
      {
        courseCode: "CPSC 2230",
        program: { type: "certificate", id: "CERT_DATA_SCIENCE" },
        requirementTitle: "Computation and Machine Learning",
      },
    ]);
  });

  it("reads planned courses out of extraAllocations as well as stored ones", () => {
    // The Simulator's plan-scoped certificate assignment, on a course the
    // student has not taken yet. The major's auto-match still has to count.
    const { allocations, violations } = buildProgramClaimContext([], {
      ...options,
      extraAllocations: [
        {
          courseCode: "CPSC 2230",
          program: { type: "certificate", id: "CERT_DATA_SCIENCE" },
          requirementTitle: "Computation and Machine Learning",
        },
      ],
    });

    expect(allocationsFor(allocations, "major", "EECS", "CPSC 2230")).toHaveLength(1);
    expect(violations.map((v) => v.code)).toEqual(["zero-overlap"]);
  });
});

// ---------------------------------------------------------------------------
// Subtlety 6: the overlap budget now spends on auto-matched courses
// ---------------------------------------------------------------------------

describe("overlap budgets count auto-matched overlaps", () => {
  // Energy Studies is a plain cap-2 certificate: no level band, no department
  // cap, no grade floor. All three courses sit in the EECS option lists, so
  // every overlap here comes from auto-matching on the major side.
  const courses = [
    course("CPSC 2230", [
      certManual("CERT_ENERGY_STUDIES", "Energy Science & Technology"),
    ]),
    course("CPSC 3230", [
      certManual("CERT_ENERGY_STUDIES", "Energy & Environment"),
    ]),
    course("S&DS 2380", [
      certManual("CERT_ENERGY_STUDIES", "Energy & Society"),
    ]),
  ];

  it("reads an empty budget while no major is in scope", () => {
    expect(
      getCertificateOverlapBudget(courses, "CERT_ENERGY_STUDIES", {
        certificateIds: ["CERT_ENERGY_STUDIES"],
      })
    ).toEqual({ used: 0, cap: 2, courses: [] });
  });

  it("spends the full budget once the major is declared", () => {
    expect(
      getCertificateOverlapBudget(courses, "CERT_ENERGY_STUDIES", {
        majorIds: ["EECS"],
        certificateIds: ["CERT_ENERGY_STUDIES"],
      })
    ).toEqual({ used: 2, cap: 2, courses: ["CPSC 2230", "CPSC 3230"] });
  });

  it("refuses the third shared course with the cap sentence", () => {
    const { violations } = buildProgramClaimContext(courses, {
      majorIds: ["EECS"],
      certificateIds: ["CERT_ENERGY_STUDIES"],
    });

    expect(violations).toEqual([
      {
        courseCode: "S&DS 2380",
        program: { type: "certificate", id: "CERT_ENERGY_STUDIES" },
        requirementTitle: "Energy & Society",
        code: "overlap-cap",
        reason: "Overlap limit reached: 2 of 2 shared courses already used.",
      },
    ]);
  });
});
