/**
 * Validation matrix for the certificate policy engine (SPEC section 9), plus
 * the supporting surfaces the matrix leans on: policy resolution, the overlap
 * budget, the sealed reason copy, determinism, and the verdict-to-UI mapping.
 *
 * Every certificate id, major id, and course code below was checked against
 * lib/data/all_certificates.json, lib/data/all_reqs.json, and
 * lib/new_courses.json before it was written down.
 */

import { describe, it, expect } from "vitest";
import {
  REASONS,
  certificateEligibility,
  evaluateAllocation,
  findExistingViolations,
  gradeMeetsFloor,
  overlapBudget,
  resolvePolicy,
  type Allocation,
  type ProgramRef,
} from "@/lib/certificatePolicy";
import { calculateCertificateProgress } from "@/lib/certificates";
import { calculateMajorProgress } from "@/lib/majors";
import { presentVerdict } from "@/lib/utils/policyPresentation";

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const major = (id: string): ProgramRef => ({ type: "major", id });
const cert = (id: string): ProgramRef => ({ type: "certificate", id });

const alloc = (
  courseCode: string,
  program: ProgramRef,
  requirementTitle: string
): Allocation => ({ courseCode, program, requirementTitle });

/** Display names as they appear in the catalog data, used by the reason copy. */
const CS_BS = "Computer Science, B.S.";
const DATA_SCIENCE = "Data Science";
const PROGRAMMING = "Programming";
const QUANTUM = "Quantum Science and Engineering";
const TRANSLATION = "Translation Studies";
const CLIMATE = "Climate Science and Solutions";

// ---------------------------------------------------------------------------
// Policy resolution
// ---------------------------------------------------------------------------

describe("resolvePolicy", () => {
  it("returns the plain defaults for a certificate with no policy block", () => {
    expect(resolvePolicy("CERT_HUMAN_RIGHTS")).toEqual({
      overlapCap: 2,
      zeroOverlap: false,
      overlapMinLevel: null,
      sameDeptCap: null,
      minGrade: null,
      ineligibleMajors: [],
      extraForms: [],
      nonCourseRequirements: [],
      sourceNote: "",
    });
  });

  it("merges a certificate's overrides over the defaults", () => {
    const policy = resolvePolicy("CERT_QUANTUM");
    expect(policy.overlapCap).toBe(2);
    expect(policy.overlapMinLevel).toBe(3000);
    expect(policy.minGrade).toBe("C");
    // Untouched fields still come from the defaults.
    expect(policy.zeroOverlap).toBe(false);
    expect(policy.sameDeptCap).toBeNull();
    expect(policy.ineligibleMajors).toEqual([]);
  });

  it("resolves the zero-overlap certificates the data actually encodes", () => {
    expect(resolvePolicy("CERT_DATA_SCIENCE").zeroOverlap).toBe(true);
    expect(resolvePolicy("CERT_DATA_SCIENCE").overlapCap).toBe(0);
    expect(resolvePolicy("CERT_DATA_SCIENCE").minGrade).toBe("B-");
    expect(resolvePolicy("CERT_PROGRAMMING").zeroOverlap).toBe(true);
    expect(resolvePolicy("CERT_PROGRAMMING").overlapCap).toBe(0);
    expect(resolvePolicy("CERT_PROGRAMMING").ineligibleMajors).toContain(
      "CPSC_BS"
    );
    expect(resolvePolicy("CERT_PROGRAMMING").ineligibleMajors).toContain(
      "CPSC_BA"
    );
    expect(resolvePolicy("CERT_TRANSLATION_STUDIES").sameDeptCap).toBe(3);
    expect(resolvePolicy("CERT_CLIMATE_SCIENCE").sameDeptCap).toBe(4);
  });

  it("falls back to defaults for an id the catalog has never heard of", () => {
    expect(resolvePolicy("CERT_NOT_A_REAL_ID").overlapCap).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Matrix 1
// ---------------------------------------------------------------------------

describe("SPEC 9.1: zero overlap between a major and Data Science", () => {
  const existing = [
    alloc("CPSC 2230", major("CPSC_BS"), "Core Courses"),
  ];

  it("blocks a course the CS major already claims", () => {
    const verdict = evaluateAllocation({
      courseCode: "CPSC 2230",
      target: {
        type: "certificate",
        id: "CERT_DATA_SCIENCE",
        requirementTitle: "Computation and Machine Learning",
      },
      existing,
      majorIds: ["CPSC_BS"],
      certificateIds: ["CERT_DATA_SCIENCE"],
    });

    expect(verdict.allowed).toBe(false);
    expect(verdict).toMatchObject({
      kind: "blocked",
      code: "zero-overlap",
      reason: `Already counts toward your ${CS_BS} major. ${DATA_SCIENCE} allows no overlap with a major.`,
    });
  });

  it("blocks the legacy three-digit spelling of the same course", () => {
    const verdict = evaluateAllocation({
      courseCode: "CPSC 223",
      target: {
        type: "certificate",
        id: "CERT_DATA_SCIENCE",
        requirementTitle: "Computation and Machine Learning",
      },
      existing,
      majorIds: ["CPSC_BS"],
      certificateIds: ["CERT_DATA_SCIENCE"],
    });

    expect(verdict).toMatchObject({ allowed: false, code: "zero-overlap" });
  });

  it("allows a course no major has claimed", () => {
    const verdict = evaluateAllocation({
      courseCode: "S&DS 2620",
      target: {
        type: "certificate",
        id: "CERT_DATA_SCIENCE",
        requirementTitle: "Computation and Machine Learning",
      },
      existing,
      majorIds: ["CPSC_BS"],
      certificateIds: ["CERT_DATA_SCIENCE"],
    });

    expect(verdict).toEqual({ allowed: true, kind: "ok" });
  });

  it("keeps the major off a course a zero-overlap certificate already holds", () => {
    const verdict = evaluateAllocation({
      courseCode: "CPSC 2230",
      target: {
        type: "major",
        id: "CPSC_BS",
        requirementTitle: "Core Courses",
      },
      existing: [
        alloc(
          "CPSC 2230",
          cert("CERT_DATA_SCIENCE"),
          "Computation and Machine Learning"
        ),
      ],
      majorIds: ["CPSC_BS"],
      certificateIds: ["CERT_DATA_SCIENCE"],
    });

    expect(verdict).toMatchObject({ allowed: false, code: "zero-overlap" });
  });
});

// ---------------------------------------------------------------------------
// Matrix 2
// ---------------------------------------------------------------------------

describe("SPEC 9.2: ineligible major warns but never blocks", () => {
  it("reports a CS major as ineligible for the Programming certificate", () => {
    expect(certificateEligibility("CERT_PROGRAMMING", ["CPSC_BS"])).toEqual({
      eligible: false,
      warning: `Yale does not award ${PROGRAMMING} to ${CS_BS} majors. Keep it only if you might switch majors.`,
    });
  });

  it("reports an unaffected major as eligible", () => {
    expect(certificateEligibility("CERT_PROGRAMMING", ["PHYS_BS"])).toEqual({
      eligible: true,
    });
  });

  it("reports every major as eligible for a certificate that bars none", () => {
    expect(certificateEligibility("CERT_QUANTUM", ["CPSC_BS"])).toEqual({
      eligible: true,
    });
  });

  it("still allows the allocation, as a warn verdict", () => {
    const verdict = evaluateAllocation({
      courseCode: "CPSC 2010",
      target: {
        type: "certificate",
        id: "CERT_PROGRAMMING",
        requirementTitle: "Required Courses",
      },
      existing: [],
      majorIds: ["CPSC_BS"],
      certificateIds: ["CERT_PROGRAMMING"],
    });

    expect(verdict.allowed).toBe(true);
    expect(verdict).toMatchObject({
      kind: "warn",
      code: "ineligible-major",
      reason: `Yale does not award ${PROGRAMMING} to ${CS_BS} majors. Keep it only if you might switch majors.`,
    });
  });
});

// ---------------------------------------------------------------------------
// Matrix 3
// ---------------------------------------------------------------------------

describe("SPEC 9.3: the university ceiling of two programs", () => {
  it("blocks a third program for a course held by a major and a certificate", () => {
    const verdict = evaluateAllocation({
      courseCode: "PHYS 3200",
      target: {
        type: "certificate",
        id: "CERT_ENERGY_STUDIES",
        requirementTitle: "Electives",
      },
      existing: [
        alloc("PHYS 3200", major("PHYS_BS"), "Core Courses"),
        alloc("PHYS 3200", cert("CERT_QUANTUM"), "Electives"),
      ],
      majorIds: ["PHYS_BS"],
      certificateIds: ["CERT_QUANTUM", "CERT_ENERGY_STUDIES"],
    });

    expect(verdict).toEqual({
      allowed: false,
      kind: "blocked",
      code: "three-programs",
      reason: "A course can count toward at most two programs at Yale.",
    });
  });

  it("takes precedence over the target certificate's own rules", () => {
    // Data Science would otherwise answer zero-overlap here; the ceiling wins.
    const verdict = evaluateAllocation({
      courseCode: "CPSC 2230",
      target: {
        type: "certificate",
        id: "CERT_DATA_SCIENCE",
        requirementTitle: "Computation and Machine Learning",
      },
      existing: [
        alloc("CPSC 2230", major("CPSC_BS"), "Core Courses"),
        alloc("CPSC 2230", cert("CERT_COMPUTING_CULTURE_SOCIETY"), "Electives"),
      ],
      majorIds: ["CPSC_BS"],
      certificateIds: ["CERT_COMPUTING_CULTURE_SOCIETY", "CERT_DATA_SCIENCE"],
    });

    expect(verdict).toMatchObject({ allowed: false, code: "three-programs" });
  });
});

// ---------------------------------------------------------------------------
// Matrix 4
// ---------------------------------------------------------------------------

describe("SPEC 9.4: Quantum level band and overlap cap", () => {
  it("blocks a 2000-level overlap even though the budget is free", () => {
    const verdict = evaluateAllocation({
      courseCode: "PHYS 2010",
      target: {
        type: "certificate",
        id: "CERT_QUANTUM",
        requirementTitle: "Electives",
      },
      existing: [alloc("PHYS 2010", major("PHYS_BS"), "Core Courses")],
      majorIds: ["PHYS_BS"],
      certificateIds: ["CERT_QUANTUM"],
    });

    expect(overlapBudget("CERT_QUANTUM", [
      alloc("PHYS 2010", major("PHYS_BS"), "Core Courses"),
    ])).toMatchObject({ used: 0, cap: 2 });

    expect(verdict).toEqual({
      allowed: false,
      kind: "blocked",
      code: "level-band",
      reason: `${QUANTUM} only shares 3000-level or higher courses with a major.`,
    });
  });

  it("allows a 3000-level overlap and reports the budget as 1 of 2", () => {
    const verdict = evaluateAllocation({
      courseCode: "PHYS 3200",
      target: {
        type: "certificate",
        id: "CERT_QUANTUM",
        requirementTitle: "Electives",
      },
      existing: [alloc("PHYS 3200", major("PHYS_BS"), "Core Courses")],
      majorIds: ["PHYS_BS"],
      certificateIds: ["CERT_QUANTUM"],
    });

    expect(verdict).toEqual({
      allowed: true,
      kind: "overlap-ok",
      budget: { used: 1, cap: 2 },
    });
  });

  it("blocks a third 3000-level overlap once two are accepted", () => {
    const existing = [
      alloc("PHYS 3200", major("PHYS_BS"), "Core Courses"),
      alloc("PHYS 3200", cert("CERT_QUANTUM"), "Electives"),
      alloc("PHYS 3420", major("PHYS_BS"), "Core Courses"),
      alloc("PHYS 3420", cert("CERT_QUANTUM"), "Electives"),
      alloc("PHYS 4000", major("PHYS_BS"), "Advanced Work"),
    ];

    expect(overlapBudget("CERT_QUANTUM", existing)).toEqual({
      used: 2,
      cap: 2,
      courses: ["PHYS 3200", "PHYS 3420"],
    });

    const verdict = evaluateAllocation({
      courseCode: "PHYS 4000",
      target: {
        type: "certificate",
        id: "CERT_QUANTUM",
        requirementTitle: "Advanced Elective",
      },
      existing,
      majorIds: ["PHYS_BS"],
      certificateIds: ["CERT_QUANTUM"],
    });

    expect(verdict).toEqual({
      allowed: false,
      kind: "blocked",
      code: "overlap-cap",
      reason: "Overlap limit reached: 2 of 2 shared courses already used.",
    });
  });

  it("does not spend budget on a course no other program claims", () => {
    const verdict = evaluateAllocation({
      courseCode: "PHYS 4000",
      target: {
        type: "certificate",
        id: "CERT_QUANTUM",
        requirementTitle: "Advanced Elective",
      },
      existing: [
        alloc("PHYS 3200", major("PHYS_BS"), "Core Courses"),
        alloc("PHYS 3200", cert("CERT_QUANTUM"), "Electives"),
        alloc("PHYS 3420", major("PHYS_BS"), "Core Courses"),
        alloc("PHYS 3420", cert("CERT_QUANTUM"), "Electives"),
      ],
      majorIds: ["PHYS_BS"],
      certificateIds: ["CERT_QUANTUM"],
    });

    expect(verdict).toEqual({ allowed: true, kind: "ok" });
  });
});

// ---------------------------------------------------------------------------
// Matrix 5
// ---------------------------------------------------------------------------

describe("SPEC 9.5: same-department caps within a certificate", () => {
  it("blocks the fourth course from one subject in Translation Studies", () => {
    const existing = [
      alloc("ENGL 0820", cert("CERT_TRANSLATION_STUDIES"), "Elective 1"),
      alloc("ENGL 0839", cert("CERT_TRANSLATION_STUDIES"), "Elective 2"),
      alloc("ENGL 0890", cert("CERT_TRANSLATION_STUDIES"), "Elective 3"),
    ];

    const verdict = evaluateAllocation({
      courseCode: "ENGL 1014",
      target: {
        type: "certificate",
        id: "CERT_TRANSLATION_STUDIES",
        requirementTitle: "Elective 4",
      },
      existing,
      majorIds: ["ENGL_BA"],
      certificateIds: ["CERT_TRANSLATION_STUDIES"],
    });

    expect(verdict).toEqual({
      allowed: false,
      kind: "blocked",
      code: "same-dept-cap",
      reason: `${TRANSLATION} caps courses from one department at 3. ENGL is full.`,
    });
  });

  it("still allows the third course from that subject", () => {
    const verdict = evaluateAllocation({
      courseCode: "ENGL 0890",
      target: {
        type: "certificate",
        id: "CERT_TRANSLATION_STUDIES",
        requirementTitle: "Elective 3",
      },
      existing: [
        alloc("ENGL 0820", cert("CERT_TRANSLATION_STUDIES"), "Elective 1"),
        alloc("ENGL 0839", cert("CERT_TRANSLATION_STUDIES"), "Elective 2"),
      ],
      majorIds: [],
      certificateIds: ["CERT_TRANSLATION_STUDIES"],
    });

    expect(verdict).toEqual({ allowed: true, kind: "ok" });
  });

  it("blocks the fifth course from one subject in Climate Science", () => {
    const existing = [
      alloc("EVST 0020", cert("CERT_CLIMATE_SCIENCE"), "Elective 1"),
      alloc("EVST 0040", cert("CERT_CLIMATE_SCIENCE"), "Elective 2"),
      alloc("EVST 1120", cert("CERT_CLIMATE_SCIENCE"), "Elective 3"),
      alloc("EVST 1144", cert("CERT_CLIMATE_SCIENCE"), "Elective 4"),
    ];

    const verdict = evaluateAllocation({
      courseCode: "EVST 2200",
      target: {
        type: "certificate",
        id: "CERT_CLIMATE_SCIENCE",
        requirementTitle: "Elective 5",
      },
      existing,
      majorIds: [],
      certificateIds: ["CERT_CLIMATE_SCIENCE"],
    });

    expect(verdict).toEqual({
      allowed: false,
      kind: "blocked",
      code: "same-dept-cap",
      reason: `${CLIMATE} caps courses from one department at 4. EVST is full.`,
    });
  });

  it("still allows the fourth course from that subject in Climate Science", () => {
    const verdict = evaluateAllocation({
      courseCode: "EVST 1144",
      target: {
        type: "certificate",
        id: "CERT_CLIMATE_SCIENCE",
        requirementTitle: "Elective 4",
      },
      existing: [
        alloc("EVST 0020", cert("CERT_CLIMATE_SCIENCE"), "Elective 1"),
        alloc("EVST 0040", cert("CERT_CLIMATE_SCIENCE"), "Elective 2"),
        alloc("EVST 1120", cert("CERT_CLIMATE_SCIENCE"), "Elective 3"),
      ],
      majorIds: [],
      certificateIds: ["CERT_CLIMATE_SCIENCE"],
    });

    expect(verdict).toEqual({ allowed: true, kind: "ok" });
  });

  it("never blocks on department for a certificate with no sameDeptCap", () => {
    const verdict = evaluateAllocation({
      courseCode: "EVST 2200",
      target: {
        type: "certificate",
        id: "CERT_ENERGY_STUDIES",
        requirementTitle: "Elective 5",
      },
      existing: [
        alloc("EVST 0020", cert("CERT_ENERGY_STUDIES"), "Elective 1"),
        alloc("EVST 0040", cert("CERT_ENERGY_STUDIES"), "Elective 2"),
        alloc("EVST 1120", cert("CERT_ENERGY_STUDIES"), "Elective 3"),
        alloc("EVST 1144", cert("CERT_ENERGY_STUDIES"), "Elective 4"),
      ],
      majorIds: [],
      certificateIds: ["CERT_ENERGY_STUDIES"],
    });

    expect(resolvePolicy("CERT_ENERGY_STUDIES").sameDeptCap).toBeNull();
    expect(verdict).toEqual({ allowed: true, kind: "ok" });
  });
});

// ---------------------------------------------------------------------------
// Matrix 6
// ---------------------------------------------------------------------------

describe("SPEC 9.6: one course fills one slot per certificate", () => {
  it("blocks a second slot and names the requirement already filled", () => {
    const verdict = evaluateAllocation({
      courseCode: "S&DS 2650",
      target: {
        type: "certificate",
        id: "CERT_DATA_SCIENCE",
        requirementTitle: "Statistical Methodology and Data Analysis",
      },
      existing: [
        alloc(
          "S&DS 2650",
          cert("CERT_DATA_SCIENCE"),
          "Computation and Machine Learning"
        ),
      ],
      majorIds: [],
      certificateIds: ["CERT_DATA_SCIENCE"],
    });

    expect(verdict).toEqual({
      allowed: false,
      kind: "blocked",
      code: "same-slot",
      reason:
        'Already fills "Computation and Machine Learning" in this certificate.',
    });
  });

  it("matches the held slot through normalization", () => {
    const verdict = evaluateAllocation({
      courseCode: "S&DS 265",
      target: {
        type: "certificate",
        id: "CERT_DATA_SCIENCE",
        requirementTitle: "Statistical Methodology and Data Analysis",
      },
      existing: [
        alloc(
          "S&DS 2650",
          cert("CERT_DATA_SCIENCE"),
          "Computation and Machine Learning"
        ),
      ],
      majorIds: [],
      certificateIds: ["CERT_DATA_SCIENCE"],
    });

    expect(verdict).toMatchObject({ allowed: false, code: "same-slot" });
  });

  it("does not apply the single-slot rule across two certificates", () => {
    const verdict = evaluateAllocation({
      courseCode: "EVST 2200",
      target: {
        type: "certificate",
        id: "CERT_ENERGY_STUDIES",
        requirementTitle: "Elective",
      },
      existing: [
        alloc("EVST 2200", cert("CERT_CLIMATE_SCIENCE"), "Elective"),
      ],
      majorIds: [],
      certificateIds: ["CERT_CLIMATE_SCIENCE", "CERT_ENERGY_STUDIES"],
    });

    expect(verdict).toEqual({
      allowed: true,
      kind: "overlap-ok",
      budget: { used: 1, cap: 2 },
    });
  });
});

// ---------------------------------------------------------------------------
// Overlap budget
// ---------------------------------------------------------------------------

describe("overlapBudget", () => {
  it("counts distinct overlapping courses and sorts them", () => {
    const budget = overlapBudget("CERT_QUANTUM", [
      alloc("PHYS 3420", cert("CERT_QUANTUM"), "Elective 2"),
      alloc("PHYS 3420", major("PHYS_BS"), "Core Courses"),
      alloc("PHYS 3200", cert("CERT_QUANTUM"), "Elective 1"),
      alloc("PHYS 3200", major("PHYS_BS"), "Core Courses"),
      // A duplicate row must not inflate the count.
      alloc("PHYS 320", major("MATH_PHYS_BS"), "Core Courses"),
      // Certificate-only and major-only courses are not overlaps.
      alloc("PHYS 4000", cert("CERT_QUANTUM"), "Elective 3"),
      alloc("PHYS 4010", major("PHYS_BS"), "Advanced Work"),
    ]);

    expect(budget).toEqual({
      used: 2,
      cap: 2,
      courses: ["PHYS 3200", "PHYS 3420"],
    });
  });

  it("reports the certificate's own cap, including zero", () => {
    expect(overlapBudget("CERT_DATA_SCIENCE", []).cap).toBe(0);
    expect(overlapBudget("CERT_HUMAN_RIGHTS", []).cap).toBe(2);
    expect(overlapBudget("CERT_QUANTUM", [])).toEqual({
      used: 0,
      cap: 2,
      courses: [],
    });
  });
});

// ---------------------------------------------------------------------------
// Reason copy
// ---------------------------------------------------------------------------

describe("SPEC 5: reason copy", () => {
  it("produces the sealed sentence for every code", () => {
    expect(REASONS.zeroOverlap("Computer Science", "Data Science")).toBe(
      "Already counts toward your Computer Science major. Data Science allows no overlap with a major."
    );
    expect(REASONS.overlapCap(2)).toBe(
      "Overlap limit reached: 2 of 2 shared courses already used."
    );
    expect(REASONS.threePrograms()).toBe(
      "A course can count toward at most two programs at Yale."
    );
    expect(REASONS.levelBand("Quantum Science and Engineering", 3000)).toBe(
      "Quantum Science and Engineering only shares 3000-level or higher courses with a major."
    );
    expect(REASONS.sameDeptCap("Translation Studies", 3, "ENGL")).toBe(
      "Translation Studies caps courses from one department at 3. ENGL is full."
    );
    expect(REASONS.sameSlot("Core Courses")).toBe(
      'Already fills "Core Courses" in this certificate.'
    );
    expect(REASONS.ineligibleMajor("Programming", "Computer Science")).toBe(
      "Yale does not award Programming to Computer Science majors. Keep it only if you might switch majors."
    );
    expect(REASONS.minGrade("Data Science", "B-")).toBe(
      "Data Science requires at least a B- in each certificate course."
    );
  });

  it("carries no dash punctuation in the copy", () => {
    const produced = [
      REASONS.zeroOverlap("A", "B"),
      REASONS.zeroOverlapFromCertificate("B"),
      REASONS.overlapCap(2),
      REASONS.threePrograms(),
      REASONS.levelBand("B", 3000),
      REASONS.sameDeptCap("B", 3, "ENGL"),
      REASONS.sameSlot("R"),
      REASONS.ineligibleMajor("B", "A"),
      REASONS.minGrade("B", "C"),
    ];
    for (const sentence of produced) {
      expect(sentence).not.toMatch(/[\u2013\u2014]/);
    }
  });
});

// ---------------------------------------------------------------------------
// Grade floor
// ---------------------------------------------------------------------------

describe("gradeMeetsFloor", () => {
  // Written as an escape on purpose: the catalog prints "B" plus U+2013.
  const EN_DASH_FLOOR = `B${String.fromCharCode(0x2013)}`;

  it("treats a catalog en dash floor as the hyphen form", () => {
    expect(gradeMeetsFloor("B-", EN_DASH_FLOOR)).toBe(true);
    expect(gradeMeetsFloor("B-", "B-")).toBe(true);
    expect(gradeMeetsFloor("C+", EN_DASH_FLOOR)).toBe(false);
    expect(gradeMeetsFloor("C+", "B-")).toBe(false);
    expect(gradeMeetsFloor("A", EN_DASH_FLOOR)).toBe(true);
  });

  it("accepts lowercase and padded input", () => {
    expect(gradeMeetsFloor(" a- ", "B-")).toBe(true);
    expect(gradeMeetsFloor("d", "B-")).toBe(false);
  });

  it("never warns on a grade it does not recognize", () => {
    expect(gradeMeetsFloor("CR", "B-")).toBe(true);
    expect(gradeMeetsFloor("", "B-")).toBe(true);
    expect(gradeMeetsFloor("B", "PASS")).toBe(true);
  });

  it("warns through evaluateAllocation without blocking", () => {
    const verdict = evaluateAllocation({
      courseCode: "S&DS 2620",
      target: {
        type: "certificate",
        id: "CERT_DATA_SCIENCE",
        requirementTitle: "Computation and Machine Learning",
      },
      existing: [],
      majorIds: ["PHYS_BS"],
      certificateIds: ["CERT_DATA_SCIENCE"],
      grade: "C+",
    });

    expect(verdict).toEqual({
      allowed: true,
      kind: "warn",
      code: "min-grade",
      reason: `${DATA_SCIENCE} requires at least a B- in each certificate course.`,
    });
  });

  it("stays silent when no grade is supplied", () => {
    const verdict = evaluateAllocation({
      courseCode: "S&DS 2620",
      target: {
        type: "certificate",
        id: "CERT_DATA_SCIENCE",
        requirementTitle: "Computation and Machine Learning",
      },
      existing: [],
      majorIds: ["PHYS_BS"],
      certificateIds: ["CERT_DATA_SCIENCE"],
    });

    expect(verdict).toEqual({ allowed: true, kind: "ok" });
  });
});

// ---------------------------------------------------------------------------
// Matrix 8
// ---------------------------------------------------------------------------

describe("SPEC 9.8: auditing stored allocations", () => {
  const storedDoubleCount: Allocation[] = [
    alloc("CPSC 2230", major("CPSC_BS"), "Core Courses"),
    alloc(
      "CPSC 2230",
      cert("CERT_DATA_SCIENCE"),
      "Computation and Machine Learning"
    ),
  ];

  it("flags exactly one violation, on the certificate side", () => {
    const violations = findExistingViolations(
      storedDoubleCount,
      ["CPSC_BS"],
      ["CERT_DATA_SCIENCE"]
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]).toEqual({
      courseCode: "CPSC 2230",
      program: { type: "certificate", id: "CERT_DATA_SCIENCE" },
      requirementTitle: "Computation and Machine Learning",
      code: "zero-overlap",
      reason: `Already counts toward your ${CS_BS} major. ${DATA_SCIENCE} allows no overlap with a major.`,
    });
  });

  it("reports nothing when the stored data is clean", () => {
    expect(
      findExistingViolations(
        [
          alloc("CPSC 2230", major("CPSC_BS"), "Core Courses"),
          alloc(
            "S&DS 2650",
            cert("CERT_DATA_SCIENCE"),
            "Computation and Machine Learning"
          ),
        ],
        ["CPSC_BS"],
        ["CERT_DATA_SCIENCE"]
      )
    ).toEqual([]);
  });

  it("returns the identical result when the input order is shuffled", () => {
    const allocations: Allocation[] = [
      alloc("CPSC 2230", major("CPSC_BS"), "Core Courses"),
      alloc(
        "CPSC 2230",
        cert("CERT_DATA_SCIENCE"),
        "Computation and Machine Learning"
      ),
      alloc("PHYS 3200", major("PHYS_BS"), "Core Courses"),
      alloc("PHYS 3200", cert("CERT_QUANTUM"), "Elective 1"),
      alloc("PHYS 3420", major("PHYS_BS"), "Core Courses"),
      alloc("PHYS 3420", cert("CERT_QUANTUM"), "Elective 2"),
      alloc("PHYS 4000", major("PHYS_BS"), "Advanced Work"),
      alloc("PHYS 4000", cert("CERT_QUANTUM"), "Elective 3"),
      alloc("PHYS 2010", major("PHYS_BS"), "Core Courses"),
      alloc("PHYS 2010", cert("CERT_QUANTUM"), "Elective 4"),
    ];

    const majorIds = ["CPSC_BS", "PHYS_BS"];
    const certIds = ["CERT_DATA_SCIENCE", "CERT_QUANTUM"];
    const baseline = findExistingViolations(allocations, majorIds, certIds);

    // Three shuffles, all deterministic so the test itself never flakes.
    const shuffles = [
      [9, 3, 0, 7, 1, 5, 2, 8, 4, 6],
      [4, 2, 8, 6, 9, 1, 3, 0, 5, 7],
      [1, 0, 3, 2, 5, 4, 7, 6, 9, 8],
    ];

    expect(baseline.length).toBeGreaterThan(0);
    for (const order of shuffles) {
      const shuffled = order.map((i) => allocations[i]);
      expect(findExistingViolations(shuffled, majorIds, certIds)).toEqual(
        baseline
      );
    }
  });

  it("excludes the blocked course from certificate progress but not the major", () => {
    const violations = findExistingViolations(
      storedDoubleCount,
      ["CPSC_BS"],
      ["CERT_DATA_SCIENCE"]
    );
    const blockedForCertificate = violations.map((v) => v.courseCode);
    expect(blockedForCertificate).toEqual(["CPSC 2230"]);

    const certificateWithoutBlocking = calculateCertificateProgress(
      "CERT_DATA_SCIENCE",
      ["CPSC 2230"],
      [],
      [],
      [],
      [],
      []
    );
    const certificateWithBlocking = calculateCertificateProgress(
      "CERT_DATA_SCIENCE",
      ["CPSC 2230"],
      [],
      [],
      [],
      [],
      blockedForCertificate
    );

    expect(certificateWithoutBlocking.completedCredits).toBeGreaterThan(0);
    expect(certificateWithBlocking.completedCredits).toBe(0);

    const majorProgress = calculateMajorProgress(
      "CPSC_BS",
      ["CPSC 2230"],
      [],
      [],
      [],
      [],
      []
    );
    expect(majorProgress.completedCredits).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Verdict to UI
// ---------------------------------------------------------------------------

describe("presentVerdict", () => {
  it("renders a blocked verdict as disabled and neutral with its reason", () => {
    expect(
      presentVerdict({
        allowed: false,
        kind: "blocked",
        code: "zero-overlap",
        reason: "nope",
      })
    ).toEqual({ disabled: true, tone: "neutral", reason: "nope" });
  });

  it("renders a warn verdict as selectable and amber with its reason", () => {
    expect(
      presentVerdict({
        allowed: true,
        kind: "warn",
        code: "ineligible-major",
        reason: "careful",
      })
    ).toEqual({ disabled: false, tone: "amber", reason: "careful" });
  });

  it("renders a plain ok verdict as selectable, neutral, and reasonless", () => {
    expect(presentVerdict({ allowed: true, kind: "ok" })).toEqual({
      disabled: false,
      tone: "neutral",
    });
  });
});
