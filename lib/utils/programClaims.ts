/**
 * Helpers for major and certificate course claims.
 *
 * A claim is a stored ManualRequirement on a course doc (`major_id` vs
 * `certificate_id`). These helpers turn claims into the blocked-code lists that
 * the progress calculations already accept as their 7th argument, and into the
 * violation list the conflict chips render.
 *
 * The rule used to be blanket exclusivity: any certificate claim blocked every
 * major and vice versa. It is now whatever lib/certificatePolicy.ts says, which
 * for most certificates means up to two shared courses are perfectly legal.
 * Nothing in here decides policy on its own; it only assembles inputs for the
 * engine and translates the engine's answers back into the shapes the existing
 * calculations understand.
 */

import { Course, ManualRequirement } from "@/lib/types";
import { getCanonicalCode, normalizeCourseCode } from "@/lib/courseCatalog";
import { getCertificate } from "@/lib/certificates";
import { majorRequirements } from "@/lib/majors";
import {
  findExistingViolations,
  overlapBudget,
  resolvePolicy,
  type Allocation,
  type ProgramRef,
  type Violation,
} from "@/lib/certificatePolicy";

export function isMajorManual(m: ManualRequirement): boolean {
  return Boolean(m.major_id) && !m.certificate_id;
}

export function isCertificateManual(m: ManualRequirement): boolean {
  return Boolean(m.certificate_id);
}

export function getCodesClaimedByMajors(courses: Course[]): Set<string> {
  const codes = new Set<string>();
  for (const course of courses) {
    const manuals = course.manualRequirementsFulfilled || [];
    if (manuals.some(isMajorManual)) {
      codes.add(getCanonicalCode(course.code) || course.code);
    }
  }
  return codes;
}

export function getCodesClaimedByCertificates(courses: Course[]): Set<string> {
  const codes = new Set<string>();
  for (const course of courses) {
    const manuals = course.manualRequirementsFulfilled || [];
    if (manuals.some(isCertificateManual)) {
      codes.add(getCanonicalCode(course.code) || course.code);
    }
  }
  return codes;
}

export function courseHasCertificateClaim(
  course: Course,
  certificateId?: string
): boolean {
  return (course.manualRequirementsFulfilled || []).some(
    (m) =>
      isCertificateManual(m) &&
      (!certificateId || m.certificate_id === certificateId)
  );
}

export function courseHasMajorClaim(course: Course, majorId?: string): boolean {
  return (course.manualRequirementsFulfilled || []).some(
    (m) => isMajorManual(m) && (!majorId || m.major_id === majorId)
  );
}

// ---------------------------------------------------------------------------
// Policy context
// ---------------------------------------------------------------------------

export type ProgramClaimOptions = {
  /** The student's declared majors, so eligibility warnings can resolve. */
  majorIds?: string[];
  /** The student's declared certificates, including ones with no claims yet. */
  certificateIds?: string[];
  /**
   * Allocations that exist outside the stored course docs. The Simulator uses
   * this for plan-scoped manual assignments and auto-matched planned courses.
   */
  extraAllocations?: Allocation[];
};

export type ProgramClaimContext = {
  allocations: Allocation[];
  majorIds: string[];
  certificateIds: string[];
  violations: Violation[];
};

/** Every stored claim, as engine allocations. */
export function buildAllocations(courses: Course[]): Allocation[] {
  const allocations: Allocation[] = [];
  for (const course of courses) {
    for (const manual of course.manualRequirementsFulfilled || []) {
      const program: ProgramRef | null = manual.certificate_id
        ? { type: "certificate", id: manual.certificate_id }
        : manual.major_id
        ? { type: "major", id: manual.major_id }
        : null;
      if (!program) continue;
      allocations.push({
        courseCode: course.code,
        program,
        requirementTitle: manual.requirement_title,
      });
    }
  }
  return allocations;
}

/** Normalized codes of every course option a certificate lists. */
function certificateOptionCodes(certId: string): Map<string, string> {
  const byCode = new Map<string, string>();
  const certificate = getCertificate(certId);
  if (!certificate) return byCode;
  for (const requirement of certificate.requirements) {
    for (const option of requirement.options) {
      const codes =
        option.type === "course" ? [option.code] : option.options ?? [];
      for (const code of codes) {
        const normalized = normalizeCourseCode(code);
        if (!byCode.has(normalized)) byCode.set(normalized, requirement.name);
      }
    }
  }
  return byCode;
}

/**
 * The same list for a major, keyed by normalized code and valued with the first
 * requirement that offers the course. Majors carry hundreds of options each and
 * the map is rebuilt on every render otherwise, so the result is cached: the
 * catalog is static JSON and cannot change inside a session.
 */
const majorOptionCache = new Map<string, Map<string, string>>();

function majorOptionCodes(majorId: string): Map<string, string> {
  const cached = majorOptionCache.get(majorId);
  if (cached) return cached;

  const byCode = new Map<string, string>();
  const major = majorRequirements[majorId];
  for (const requirement of major?.requirements ?? []) {
    for (const option of requirement.options ?? []) {
      const codes =
        option.type === "course" ? [option.code] : option.options ?? [];
      for (const code of codes) {
        const normalized = normalizeCourseCode(code);
        if (!byCode.has(normalized)) byCode.set(normalized, requirement.name);
      }
    }
  }

  majorOptionCache.set(majorId, byCode);
  return byCode;
}

/**
 * Most major credit is never stored. The progress calculations auto match a
 * student's courses against the major's option lists, so a course can count
 * toward a major while producing no allocation at all, and the engine then
 * never learns the major is holding it: zero overlap, the overlap cap, and the
 * two program ceiling all quietly stop firing. Materializing those auto
 * matches is what makes the engine judge the same picture the student sees.
 *
 * Only the student's own courses may produce an implied claim. An option list
 * runs to hundreds of codes and none of the rest is credit anybody holds.
 */
function withImpliedMajorClaims(
  allocations: Allocation[],
  majorIds: string[],
  courseCodes: string[]
): Allocation[] {
  const result = [...allocations];

  const studentCodes = Array.from(
    new Set(courseCodes.map((code) => normalizeCourseCode(code)))
  ).sort();
  if (studentCodes.length === 0) return result;

  for (const majorId of majorIds) {
    const options = majorOptionCodes(majorId);
    if (options.size === 0) continue;

    // A stored manual claim already speaks for this major, so re-adding the
    // course would double count it against the overlap budget.
    const claimedHere = new Set(
      allocations
        .filter(
          (allocation) =>
            allocation.program.type === "major" &&
            allocation.program.id === majorId
        )
        .map((allocation) => normalizeCourseCode(allocation.courseCode))
    );

    for (const code of studentCodes) {
      if (claimedHere.has(code)) continue;
      const requirementTitle = options.get(code);
      if (!requirementTitle) continue;
      result.push({
        courseCode: code,
        program: { type: "major", id: majorId },
        requirementTitle,
      });
    }
  }

  return result;
}

/**
 * A course claimed by another program that also appears in a certificate's
 * option list counts toward that certificate automatically, so it is a real
 * overlap even though nothing stored says so. Materializing those as
 * allocations is what keeps the overlap meter and the blocking in agreement.
 *
 * Runs after withImpliedMajorClaims on purpose. An auto-matched major course
 * that also sits in a certificate's option list is a genuine double count, and
 * only the implied major claim makes it visible here.
 */
function withImpliedCertificateOverlaps(
  allocations: Allocation[],
  certificateIds: string[]
): Allocation[] {
  const result = [...allocations];

  for (const certId of certificateIds) {
    const options = certificateOptionCodes(certId);
    if (options.size === 0) continue;

    const claimedElsewhere = new Set<string>();
    const claimedHere = new Set<string>();
    for (const allocation of allocations) {
      const code = normalizeCourseCode(allocation.courseCode);
      if (
        allocation.program.type === "certificate" &&
        allocation.program.id === certId
      ) {
        claimedHere.add(code);
      } else {
        claimedElsewhere.add(code);
      }
    }

    const implied = Array.from(claimedElsewhere)
      .filter((code) => options.has(code) && !claimedHere.has(code))
      .sort();

    for (const code of implied) {
      result.push({
        courseCode: code,
        program: { type: "certificate", id: certId },
        requirementTitle: options.get(code) as string,
      });
    }
  }

  return result;
}

/**
 * Assembles every allocation the engine should see and audits it once. Callers
 * derive blocked lists, violations, and budgets from the single result so the
 * surfaces can never disagree.
 *
 * "Every allocation" means three things, in this order: what the student stored
 * plus whatever the caller passed in, then the major credit that is only ever
 * auto matched, then the certificate credit that is only ever auto matched.
 */
export function buildProgramClaimContext(
  courses: Course[],
  options: ProgramClaimOptions = {}
): ProgramClaimContext {
  const stored = buildAllocations(courses);
  const base = [...stored, ...(options.extraAllocations ?? [])];

  const majorIds = Array.from(
    new Set([
      ...(options.majorIds ?? []),
      ...base
        .filter((a) => a.program.type === "major")
        .map((a) => a.program.id),
    ])
  ).sort();

  const certificateIds = Array.from(
    new Set([
      ...(options.certificateIds ?? []),
      ...base
        .filter((a) => a.program.type === "certificate")
        .map((a) => a.program.id),
    ])
  ).sort();

  // Auto-matched major credit first, so the certificate pass below can see it.
  const studentCourseCodes = [
    ...courses.map((course) => course.code),
    ...(options.extraAllocations ?? []).map(
      (allocation) => allocation.courseCode
    ),
  ];
  const withMajors = withImpliedMajorClaims(
    base,
    majorIds,
    studentCourseCodes
  );

  const allocations = withImpliedCertificateOverlaps(withMajors, certificateIds);
  const violations = findExistingViolations(
    allocations,
    majorIds,
    certificateIds
  );

  return { allocations, majorIds, certificateIds, violations };
}

/** One allocation's identity: same course, same program, same slot. */
function allocationIdentity(allocation: Allocation): string {
  return `${allocation.program.type}:${allocation.program.id}::${normalizeCourseCode(
    allocation.courseCode
  )}::${allocation.requirementTitle}`;
}

/**
 * The claims that survive the audit, which is what any picker asking "may this
 * course go here?" should hand the engine.
 *
 * A refused claim has already been resolved against the program that lost it,
 * so leaving it in the list would report the overlap budget as fuller than it
 * is and would make a picker answer with the wrong sentence: a course that
 * auto-matches both a major and a zero-overlap certificate would read as
 * already filling a slot in that certificate, and the major would read as
 * refused for a course it in fact keeps.
 */
export function settleAllocations(
  context: Pick<ProgramClaimContext, "allocations" | "violations">
): Allocation[] {
  const lost = new Set(
    context.violations.map((violation) =>
      allocationIdentity({
        courseCode: violation.courseCode,
        program: violation.program,
        requirementTitle: violation.requirementTitle,
      })
    )
  );
  return context.allocations.filter(
    (allocation) => !lost.has(allocationIdentity(allocation))
  );
}

/** Every stored conflict, optionally narrowed to one certificate. */
export function getCertificateViolations(
  courses: Course[],
  certificateId?: string,
  options: ProgramClaimOptions = {}
): Violation[] {
  const { violations } = buildProgramClaimContext(courses, options);
  if (!certificateId) return violations;
  return violations.filter(
    (v) => v.program.type === "certificate" && v.program.id === certificateId
  );
}

/**
 * Codes that should be blocked from major auto-matching / counting.
 *
 * Majors win every contested course, so the only thing that keeps a major off
 * a course is a certificate that permits no overlap at all, and then only when
 * the student has not also claimed the course for a major. Students with no
 * certificates get an empty list, exactly as before.
 */
export function getMajorBlockedCodes(
  courses: Course[],
  options: ProgramClaimOptions = {}
): string[] {
  const { allocations } = buildProgramClaimContext(courses, options);

  const claimedByMajors = new Set<string>();
  const claimedByZeroOverlapCerts = new Set<string>();
  for (const allocation of allocations) {
    const code = normalizeCourseCode(allocation.courseCode);
    if (allocation.program.type === "major") {
      claimedByMajors.add(code);
    } else if (resolvePolicy(allocation.program.id).zeroOverlap) {
      claimedByZeroOverlapCerts.add(code);
    }
  }

  return Array.from(claimedByZeroOverlapCerts)
    .filter((code) => !claimedByMajors.has(code))
    .sort();
}

/**
 * Codes that should be blocked from a certificate's auto-matching / counting.
 *
 * Pass `certificateId` whenever it is known: blocking is per certificate now,
 * and the union across every certificate over-blocks. The union is kept only so
 * the legacy single-argument call shape still means something sensible.
 *
 * same-slot conflicts are left out. They mean one course was assigned to two
 * requirements of the same certificate, which is resolved by dropping the
 * duplicate entry, not by taking the course away from the certificate.
 */
export function getCertificateBlockedCodes(
  courses: Course[],
  certificateId?: string,
  options: ProgramClaimOptions = {}
): string[] {
  const { violations } = buildProgramClaimContext(courses, options);
  return blockedCodesFromViolations(violations, certificateId);
}

/** The blocked-code list a set of violations implies. See the note above. */
export function blockedCodesFromViolations(
  violations: Violation[],
  certificateId?: string
): string[] {
  return Array.from(
    new Set(
      violations
        .filter(
          (v) =>
            v.program.type === "certificate" &&
            v.code !== "same-slot" &&
            (!certificateId || v.program.id === certificateId)
        )
        .map((v) => v.courseCode)
    )
  ).sort();
}

/**
 * Manual fulfillments bypass the blocked-code filter inside the progress
 * calculations, so a conflicting manual would otherwise always win. Drop the
 * violating entries before they reach the calculation. The certificate side
 * loses, matching the engine's resolution default.
 */
export function filterCertificateManualEntries<
  T extends { code: string; requirement: string }
>(entries: T[], certificateId: string, violations: Violation[]): T[] {
  const conflicted = new Set(
    violations
      .filter(
        (v) => v.program.type === "certificate" && v.program.id === certificateId
      )
      .map((v) => `${v.courseCode}::${v.requirementTitle}`)
  );
  if (conflicted.size === 0) return entries;
  return entries.filter(
    (entry) =>
      !conflicted.has(`${normalizeCourseCode(entry.code)}::${entry.requirement}`)
  );
}

/**
 * The overlap budget a student actually has left on a certificate: stored
 * conflicts are resolved away first, so a course the certificate has already
 * lost does not read as spent budget.
 */
export function getCertificateOverlapBudget(
  courses: Course[],
  certificateId: string,
  options: ProgramClaimOptions = {}
): { used: number; cap: number; courses: string[] } {
  const { allocations, violations } = buildProgramClaimContext(
    courses,
    options
  );
  const lost = new Set(
    violations
      .filter(
        (v) => v.program.type === "certificate" && v.program.id === certificateId
      )
      .map((v) => `${v.courseCode}::${v.requirementTitle}`)
  );
  const resolved = allocations.filter((allocation) => {
    if (
      allocation.program.type !== "certificate" ||
      allocation.program.id !== certificateId
    ) {
      return true;
    }
    return !lost.has(
      `${normalizeCourseCode(allocation.courseCode)}::${allocation.requirementTitle}`
    );
  });
  return overlapBudget(certificateId, resolved);
}
