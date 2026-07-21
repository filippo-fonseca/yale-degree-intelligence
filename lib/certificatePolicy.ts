/**
 * Certificate policy engine.
 *
 * Pure and deterministic: no React, no Firebase, no network. Every surface that
 * needs to know whether a course may count toward a certificate calls in here,
 * so the progress calculations, the manual-assign pickers, and the overlap
 * meters can never disagree with each other.
 *
 * Rule hierarchy, in order of authority:
 *   1. University-wide ceiling, always enforced:
 *      R1 a single course credit may never count toward more than TWO
 *         curricular programs (major, second major, certificate, degree);
 *      R2 within one certificate, a course fills exactly one requirement slot.
 *   2. Certificate-specific policy from the catalog data (zero overlap, level
 *      bands, department caps, eligibility). It may only be stricter.
 *   3. The default cap when a certificate states nothing: up to two courses may
 *      overlap with the student's other programs.
 *
 * Overlap accounting counts COURSES, not credits: one course is treated as one
 * credit, which matches how Yale states the rule for the standard 1-credit
 * course and is the only simplification in here.
 */

import {
  CERTIFICATES,
  DEFAULT_CERTIFICATE_POLICY,
  getCertificate,
  type ResolvedPolicy,
} from "./certificates";
import { MAJORS } from "./majors";
import {
  courseLevel,
  courseSubject,
  normalizeCourseCode,
} from "./courseCatalog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProgramRef = { type: "major" | "certificate"; id: string };

export type Allocation = {
  courseCode: string;
  program: ProgramRef;
  requirementTitle: string;
};

export type BlockedCode =
  | "zero-overlap"
  | "overlap-cap"
  | "three-programs"
  | "level-band"
  | "same-slot"
  | "same-dept-cap";

export type WarnCode = "ineligible-major" | "min-grade";

export type Verdict =
  | { allowed: true; kind: "ok" }
  | { allowed: true; kind: "overlap-ok"; budget: { used: number; cap: number } }
  | { allowed: true; kind: "warn"; code: WarnCode; reason: string }
  | { allowed: false; kind: "blocked"; code: BlockedCode; reason: string };

/** A stored allocation that the engine would refuse if it were made today. */
export type Violation = {
  courseCode: string;
  program: ProgramRef;
  requirementTitle: string;
  code: BlockedCode;
  reason: string;
};

export type EvaluateAllocationInput = {
  courseCode: string;
  target: ProgramRef & { requirementTitle: string };
  /** Every current allocation, both program types. */
  existing: Allocation[];
  majorIds: string[];
  certificateIds: string[];
  /**
   * Optional letter grade for the course. Supplied only when the caller has
   * one; the min-grade rule is advisory and never blocks, so an absent grade
   * simply produces no warning.
   */
  grade?: string | null;
};

// ---------------------------------------------------------------------------
// Reason copy (SPEC section 5, verbatim)
// ---------------------------------------------------------------------------

export const REASONS = {
  zeroOverlap: (major: string, cert: string) =>
    `Already counts toward your ${major} major. ${cert} allows no overlap with a major.`,
  /**
   * Mirror of the above for the opposite direction, where the course is
   * already held by the zero-overlap certificate and a major is the target.
   * The second sentence is the sealed copy; the first names the certificate
   * because naming the major there would state something untrue.
   */
  zeroOverlapFromCertificate: (cert: string) =>
    `Already counts toward your ${cert} certificate. ${cert} allows no overlap with a major.`,
  overlapCap: (cap: number) =>
    `Overlap limit reached: ${cap} of ${cap} shared courses already used.`,
  threePrograms: () => `A course can count toward at most two programs at Yale.`,
  levelBand: (cert: string, level: number) =>
    `${cert} only shares ${level}-level or higher courses with a major.`,
  sameDeptCap: (cert: string, n: number, subject: string) =>
    `${cert} caps courses from one department at ${n}. ${subject} is full.`,
  sameSlot: (requirement: string) =>
    `Already fills "${requirement}" in this certificate.`,
  ineligibleMajor: (cert: string, major: string) =>
    `Yale does not award ${cert} to ${major} majors. Keep it only if you might switch majors.`,
  minGrade: (cert: string, grade: string) =>
    `${cert} requires at least a ${grade} in each certificate course.`,
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const programKey = (program: ProgramRef): string =>
  `${program.type}:${program.id}`;

export function programLabel(program: ProgramRef): string {
  if (program.type === "major") return MAJORS[program.id] ?? program.id;
  return CERTIFICATES[program.id] ?? program.id;
}

/** Best to worst. Anything outside this list is treated as ungraded. */
const GRADE_ORDER = [
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "F",
];

/**
 * Catalog pages print grade floors with an en dash ("B–") while the data and
 * every UI use a hyphen. Normalize both before comparing so the two forms are
 * the same grade.
 */
const normalizeGrade = (grade: string): string =>
  grade.replace(/[–—]/g, "-").toUpperCase().trim();

/** True when `grade` is at or above `floor`. Unknown grades never warn. */
export function gradeMeetsFloor(grade: string, floor: string): boolean {
  const gradeRank = GRADE_ORDER.indexOf(normalizeGrade(grade));
  const floorRank = GRADE_ORDER.indexOf(normalizeGrade(floor));
  if (gradeRank === -1 || floorRank === -1) return true;
  return gradeRank <= floorRank;
}

// ---------------------------------------------------------------------------
// Policy resolution
// ---------------------------------------------------------------------------

/**
 * A certificate's policy with every field filled in. The data deliberately
 * omits anything that matches the default, so a plain spread is correct.
 */
export function resolvePolicy(certId: string): ResolvedPolicy {
  return {
    ...DEFAULT_CERTIFICATE_POLICY,
    ...(getCertificate(certId)?.policy ?? {}),
  };
}

/**
 * Warn but allow. Yale bars a few major/certificate combinations outright, and
 * we surface that everywhere the certificate appears without ever removing the
 * option: a student who plans to switch majors still needs to see it.
 */
export function certificateEligibility(
  certId: string,
  majorIds: string[]
): { eligible: boolean; warning?: string } {
  const barred = resolvePolicy(certId).ineligibleMajors;
  if (barred.length === 0) return { eligible: true };
  const offending = majorIds.find((id) => barred.includes(id));
  if (!offending) return { eligible: true };
  return {
    eligible: false,
    warning: REASONS.ineligibleMajor(
      programLabel({ type: "certificate", id: certId }),
      programLabel({ type: "major", id: offending })
    ),
  };
}

// ---------------------------------------------------------------------------
// Overlap budget
// ---------------------------------------------------------------------------

/**
 * Courses that count toward `certId` and toward at least one other program.
 *
 * `existing` is taken at face value: callers that want the budget a student
 * actually has left should strip findExistingViolations first, otherwise a
 * stored over-cap conflict reports as used budget. lib/utils/programClaims.ts
 * does exactly that for the UI surfaces.
 */
export function overlapBudget(
  certId: string,
  existing: Allocation[]
): { used: number; cap: number; courses: string[] } {
  const cap = resolvePolicy(certId).overlapCap;
  const certKey = programKey({ type: "certificate", id: certId });

  const certCodes = new Set<string>();
  const foreignCodes = new Set<string>();
  for (const allocation of existing) {
    const code = normalizeCourseCode(allocation.courseCode);
    if (programKey(allocation.program) === certKey) certCodes.add(code);
    else foreignCodes.add(code);
  }

  const courses = Array.from(certCodes)
    .filter((code) => foreignCodes.has(code))
    .sort();

  return { used: courses.length, cap, courses };
}

// ---------------------------------------------------------------------------
// The verdict
// ---------------------------------------------------------------------------

const blocked = (code: BlockedCode, reason: string): Verdict => ({
  allowed: false,
  kind: "blocked",
  code,
  reason,
});

/**
 * Decides whether one course may be allocated to one requirement slot.
 *
 * Order of authority, and the reason each step comes where it does:
 *   1. three-programs, the university ceiling, which no certificate can relax.
 *   2. same-slot, the within-certificate single-use rule.
 *   3. the target certificate's own overlap rules: zero overlap, then the
 *      level band (a course below the band is refused even with budget to
 *      spare), then the cap itself.
 *   4. the within-certificate department cap, which is independent of overlap.
 *   5. warnings, which never block: ineligibility first, then the grade floor.
 *   6. overlap-ok when the assignment consumes budget, otherwise plain ok.
 */
export function evaluateAllocation(input: EvaluateAllocationInput): Verdict {
  const code = normalizeCourseCode(input.courseCode);
  const targetRef: ProgramRef = { type: input.target.type, id: input.target.id };
  const targetKey = programKey(targetRef);
  const targetName = programLabel(targetRef);

  const sameCourse = input.existing.filter(
    (allocation) => normalizeCourseCode(allocation.courseCode) === code
  );

  const otherPrograms: ProgramRef[] = [];
  const seenPrograms = new Set<string>();
  let heldByTarget: Allocation | null = null;
  for (const allocation of sameCourse) {
    const key = programKey(allocation.program);
    if (key === targetKey) {
      if (!heldByTarget) heldByTarget = allocation;
      continue;
    }
    if (seenPrograms.has(key)) continue;
    seenPrograms.add(key);
    otherPrograms.push(allocation.program);
  }

  // R1. Two programs is the ceiling, so a third refuses regardless of policy.
  if (otherPrograms.length >= 2) {
    return blocked("three-programs", REASONS.threePrograms());
  }

  // R2. Within one certificate a course fills exactly one slot.
  if (targetRef.type === "certificate" && heldByTarget) {
    return blocked(
      "same-slot",
      REASONS.sameSlot(heldByTarget.requirementTitle)
    );
  }

  const conflictingMajor = otherPrograms.find((p) => p.type === "major");
  const isOverlap = otherPrograms.length > 0;

  if (targetRef.type === "major") {
    // Majors win every contested course, with one exception: a certificate
    // that permits no overlap at all also keeps the major off the course.
    const zeroOverlapCert = otherPrograms.find(
      (p) => p.type === "certificate" && resolvePolicy(p.id).zeroOverlap
    );
    if (zeroOverlapCert) {
      return blocked(
        "zero-overlap",
        REASONS.zeroOverlapFromCertificate(programLabel(zeroOverlapCert))
      );
    }
    return { allowed: true, kind: "ok" };
  }

  const policy = resolvePolicy(targetRef.id);

  if (isOverlap) {
    // zeroOverlap always arrives with overlapCap 0, so the cap check below
    // catches the certificate-to-certificate case with the cap copy. This
    // branch exists to give the major case its own, more specific sentence.
    if (policy.zeroOverlap && conflictingMajor) {
      return blocked(
        "zero-overlap",
        REASONS.zeroOverlap(programLabel(conflictingMajor), targetName)
      );
    }

    if (policy.overlapMinLevel != null) {
      const level = courseLevel(code);
      if (level == null || level < policy.overlapMinLevel) {
        return blocked(
          "level-band",
          REASONS.levelBand(targetName, policy.overlapMinLevel)
        );
      }
    }

    const budget = overlapBudget(targetRef.id, input.existing);
    const alreadyCounted = budget.courses.includes(code);
    if (!alreadyCounted && budget.used >= policy.overlapCap) {
      return blocked("overlap-cap", REASONS.overlapCap(policy.overlapCap));
    }
  }

  if (policy.sameDeptCap != null) {
    const subject = courseSubject(code);
    if (subject) {
      const sameSubject = new Set<string>();
      for (const allocation of input.existing) {
        if (programKey(allocation.program) !== targetKey) continue;
        const otherCode = normalizeCourseCode(allocation.courseCode);
        if (otherCode === code) continue;
        if (courseSubject(otherCode) === subject) sameSubject.add(otherCode);
      }
      if (sameSubject.size + 1 > policy.sameDeptCap) {
        return blocked(
          "same-dept-cap",
          REASONS.sameDeptCap(targetName, policy.sameDeptCap, subject)
        );
      }
    }
  }

  const eligibility = certificateEligibility(targetRef.id, input.majorIds);
  if (!eligibility.eligible && eligibility.warning) {
    return {
      allowed: true,
      kind: "warn",
      code: "ineligible-major",
      reason: eligibility.warning,
    };
  }

  if (
    input.grade != null &&
    policy.minGrade &&
    !gradeMeetsFloor(input.grade, policy.minGrade)
  ) {
    return {
      allowed: true,
      kind: "warn",
      code: "min-grade",
      reason: REASONS.minGrade(targetName, policy.minGrade),
    };
  }

  if (isOverlap) {
    const budget = overlapBudget(targetRef.id, input.existing);
    const alreadyCounted = budget.courses.includes(code);
    return {
      allowed: true,
      kind: "overlap-ok",
      budget: {
        used: alreadyCounted ? budget.used : budget.used + 1,
        cap: policy.overlapCap,
      },
    };
  }

  return { allowed: true, kind: "ok" };
}

// ---------------------------------------------------------------------------
// Audit of stored data
// ---------------------------------------------------------------------------

/**
 * Replays every stored allocation through the engine and returns the ones it
 * would refuse today. This is what powers the conflict chips on data created
 * before the engine existed.
 *
 * Resolution is deterministic and always the same: majors are admitted first
 * and keep every contested course, then certificates are replayed in
 * certificate-id order, and within a certificate in course-code order, so the
 * same stored data always yields the same winners.
 */
export function findExistingViolations(
  allocations: Allocation[],
  majorIds: string[],
  certIds: string[]
): Violation[] {
  const accepted: Allocation[] = [];
  const violations: Violation[] = [];

  for (const allocation of allocations) {
    if (allocation.program.type === "major") accepted.push(allocation);
  }

  const certificateIds = Array.from(
    new Set([
      ...certIds,
      ...allocations
        .filter((a) => a.program.type === "certificate")
        .map((a) => a.program.id),
    ])
  ).sort();

  for (const certId of certificateIds) {
    const own = allocations
      .filter(
        (a) => a.program.type === "certificate" && a.program.id === certId
      )
      .sort((a, b) => {
        const codeCompare = normalizeCourseCode(a.courseCode).localeCompare(
          normalizeCourseCode(b.courseCode)
        );
        if (codeCompare !== 0) return codeCompare;
        return a.requirementTitle.localeCompare(b.requirementTitle);
      });

    for (const allocation of own) {
      const verdict = evaluateAllocation({
        courseCode: allocation.courseCode,
        target: {
          type: "certificate",
          id: certId,
          requirementTitle: allocation.requirementTitle,
        },
        existing: accepted,
        majorIds,
        certificateIds,
      });

      if (verdict.allowed) {
        accepted.push(allocation);
        continue;
      }

      violations.push({
        courseCode: normalizeCourseCode(allocation.courseCode),
        program: allocation.program,
        requirementTitle: allocation.requirementTitle,
        code: verdict.code,
        reason: verdict.reason,
      });
    }
  }

  return violations;
}
