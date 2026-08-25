/**
 * Certificate requirements + progress engine for Degree Intelligence v3.
 *
 * Data: YCPS catalog → lib/data/all_certificates.json
 * Progress logic mirrors lib/majors.ts (manual assign, skip, exclusions, blocked codes).
 */

import {
  getCourseInfo,
  getCanonicalCode,
} from "./courseCatalog";
import allCertificates from "./data/all_certificates.json";
import type {
  ExcludedRequirementEntry,
  MajorProgress,
  ManualRequirementEntry,
} from "./majors";

export type CertificateRequirementOption =
  | {
      type: "course";
      code: string;
    }
  | {
      type: "group";
      options: string[];
      required: number;
      description?: string;
    };

export type CertificateRequirementBucket = {
  name: string;
  description?: string;
  required: number;
  options: CertificateRequirementOption[];
};

/**
 * Per-certificate overlap / eligibility policy, encoded in
 * `lib/data/certificates/structured/{ID}.json` under `policy` and merged into
 * `lib/data/all_certificates.json`. See SCHEMA.md for the authoring rules.
 *
 * Every field is optional in the data. Anything omitted falls back to
 * DEFAULT_CERTIFICATE_POLICY, so a certificate with no special rules carries no
 * `policy` block at all. The policy engine is the only thing that should read
 * these fields directly; UI and progress calcs go through it.
 */
export type CertificatePolicy = {
  /** Max certificate courses that may also count toward another program. */
  overlapCap?: number;
  /** true when no certificate course may count toward any other program. */
  zeroOverlap?: boolean;
  /** Only courses at or above this level may overlap (e.g. 3000 for Quantum). */
  overlapMinLevel?: number | null;
  /** Max certificate courses that may share one subject prefix. */
  sameDeptCap?: number | null;
  /** Advisory minimum grade, e.g. "B-". Warns, never blocks. */
  minGrade?: string | null;
  /** Major IDs Yale bars from this certificate. Warns, never blocks. */
  ineligibleMajors?: string[];
  /** Forms or applications outside the course plan. Informational only. */
  extraForms?: string[];
  /** Non-course obligations (talks, lectures, write-ups). Informational only. */
  nonCourseRequirements?: string[];
  /** One line citing the catalog rule this block encodes. */
  sourceNote?: string;
};

/**
 * A CertificatePolicy with every field filled in: what the policy engine works
 * with after merging a certificate's overrides over the defaults below.
 */
export type ResolvedPolicy = Required<CertificatePolicy>;

/**
 * Applied to any certificate field left unset. `overlapCap: 2` is Yale's
 * baseline: up to two certificate courses may also count toward the student's
 * other programs. The university-wide ceiling (a course may count toward at
 * most two curricular programs, and fills exactly one slot within a
 * certificate) always applies on top and is not expressible here.
 */
export const DEFAULT_CERTIFICATE_POLICY: ResolvedPolicy = {
  overlapCap: 2,
  zeroOverlap: false,
  overlapMinLevel: null,
  sameDeptCap: null,
  minGrade: null,
  ineligibleMajors: [],
  extraForms: [],
  nonCourseRequirements: [],
  sourceNote: "",
};

export type Certificate = {
  id: string;
  name: string;
  description?: string;
  category: "advanced_language" | "interdisciplinary" | "skills_based" | string;
  sourceUrl?: string;
  requiresApplication?: boolean;
  parentProgram?: string | null;
  creditRequirements: {
    total: number;
  };
  notes?: string[];
  policy?: CertificatePolicy;
  requirements: CertificateRequirementBucket[];
};

export const certificateRequirements = allCertificates as Record<
  string,
  Certificate
>;

/** id → display name (mirrors MAJORS) */
export const CERTIFICATES: Record<string, string> = Object.values(
  certificateRequirements
).reduce((acc, cert) => {
  acc[cert.id] = cert.name;
  return acc;
}, {} as Record<string, string>);

export const CERTIFICATE_LIST: Certificate[] = Object.values(
  certificateRequirements
).sort((a, b) => a.name.localeCompare(b.name));

export const CERTIFICATE_CATEGORY_LABELS: Record<string, string> = {
  advanced_language: "Advanced Language",
  interdisciplinary: "Interdisciplinary",
  skills_based: "Skills-Based",
};

export function getCertificate(id: string): Certificate | undefined {
  return certificateRequirements[id];
}

export function getCertificatesByCategory(
  category: Certificate["category"]
): Certificate[] {
  return CERTIFICATE_LIST.filter((c) => c.category === category);
}

export function getFullCertificateNameById(certificateId: string): string {
  return certificateRequirements[certificateId]?.name ?? "Unknown Certificate";
}

export function getCertificateDescriptionById(certificateId: string): string {
  return (
    certificateRequirements[certificateId]?.description ??
    "Certificate in Yale College."
  );
}

export type CertificateProgress = MajorProgress;

type CompletedRequirement = MajorProgress["completedRequirements"][number];

export const calculateCertificateProgress = (
  certificateId: string,
  completedCourseCodes: string[],
  inProgressCourseCodes: string[] = [],
  skippedCourseCodes: string[] = [],
  manualRequirements: ManualRequirementEntry[] = [],
  excludedRequirements: ExcludedRequirementEntry[] = [],
  /** Courses claimed by majors (or otherwise blocked from counting toward certificates). */
  blockedCourseCodes: string[] = []
): CertificateProgress => {
  const certificate = certificateRequirements[certificateId];
  if (!certificate) {
    throw new Error(`Certificate ${certificateId} not found`);
  }

  const blockedSet = new Set(
    blockedCourseCodes.map((code) => getCanonicalCode(code) || code)
  );
  const stripBlocked = (codes: string[]) =>
    codes
      .map((code) => getCanonicalCode(code) || code)
      .filter((code) => !blockedSet.has(code));

  const canonicalCompleted = stripBlocked(completedCourseCodes);
  const canonicalInProgress = stripBlocked(inProgressCourseCodes);
  const canonicalSkipped = stripBlocked(skippedCourseCodes);

  const exclusionSet = new Set(
    excludedRequirements.map(
      (e) => `${e.requirement}:${getCanonicalCode(e.code) || e.code}`
    )
  );

  const isExcluded = (reqName: string, code: string): boolean => {
    const canonical = getCanonicalCode(code) || code;
    return (
      exclusionSet.has(`${reqName}:${code}`) ||
      exclusionSet.has(`${reqName}:${canonical}`)
    );
  };

  const manualByRequirement: Record<
    string,
    { code: string; credits: number; isPlanned?: boolean }[]
  > = {};
  manualRequirements.forEach((m) => {
    if (!manualByRequirement[m.requirement]) {
      manualByRequirement[m.requirement] = [];
    }
    manualByRequirement[m.requirement].push({
      code: m.code,
      credits: m.credits,
      isPlanned: m.isPlanned,
    });
  });

  let totalCompletedCredits = 0;
  let totalInProgressCredits = 0;
  const requirementProgress: CompletedRequirement[] = [];

  for (const req of certificate.requirements) {
    let reqCompleted = 0;
    let reqInProgress = 0;
    const reqOptions: CompletedRequirement["options"] = [];

    const manualFulfillments = manualByRequirement[req.name] || [];

    manualFulfillments.forEach(({ code, credits, isPlanned }) => {
      reqOptions.push({
        code,
        name: getCourseInfo(code)?.name || code,
        completed: !isPlanned,
        inProgress: !!isPlanned,
        required: true,
        credits,
        manual: true,
      });
      if (isPlanned) {
        reqInProgress += 1;
        totalInProgressCredits += credits;
      } else {
        reqCompleted += 1;
        totalCompletedCredits += credits;
      }
    });

    for (const option of req.options) {
      if (option.type === "course") {
        const code = option.code;
        if (manualFulfillments.some((m) => m.code === code)) continue;

        const course = getCourseInfo(code);
        if (!course) continue;

        const excluded = isExcluded(req.name, code);
        const completed = canonicalCompleted.includes(code) && !excluded;
        const inProgress = canonicalInProgress.includes(code) && !excluded;
        // An exclusion says "this course I took should not count here". A skip
        // says "count this option as settled, I am not taking it" and is the
        // student's most recent word on the option, so it is not suppressed by
        // an older exclusion: otherwise "Mark as skipped" silently does nothing
        // on any option the student had excluded first.
        const skipped = canonicalSkipped.includes(code);

        reqOptions.push({
          code,
          name: course.name,
          completed: completed || skipped,
          inProgress: inProgress && !completed && !skipped,
          required: true,
          credits: course.credits,
          skipped,
        });

        if (completed || skipped) {
          reqCompleted += 1;
          totalCompletedCredits += course.credits;
        } else if (inProgress) {
          reqInProgress += 1;
          totalInProgressCredits += course.credits;
        }
      } else if (option.type === "group") {
        let groupCompleted = 0;
        let groupInProgress = 0;
        let groupCredits = 0;

        option.options.forEach((code: string) => {
          if (manualFulfillments.some((m) => m.code === code)) return;

          const course = getCourseInfo(code);
          if (!course) return;

          const excluded = isExcluded(req.name, code);
          const completed = canonicalCompleted.includes(code) && !excluded;
          const inProgress = canonicalInProgress.includes(code) && !excluded;
          // See the note on the course branch above: a skip outranks an
          // exclusion, so skipping an excluded option is not a no-op.
          const skipped = canonicalSkipped.includes(code);

          reqOptions.push({
            code,
            name: course.name,
            completed: completed || skipped,
            inProgress: inProgress && !completed && !skipped,
            required: groupCompleted + groupInProgress < option.required,
            credits: course.credits,
            skipped,
          });

          if ((completed || skipped) && groupCompleted < option.required) {
            groupCompleted++;
            groupCredits += course.credits;
          } else if (
            inProgress &&
            groupCompleted + groupInProgress < option.required
          ) {
            groupInProgress++;
          }
        });

        reqCompleted += groupCompleted;
        reqInProgress += groupInProgress;
        totalCompletedCredits += groupCredits;
      }
    }

    const permanentManualCount = manualFulfillments.filter(
      (m) => !m.isPlanned
    ).length;

    requirementProgress.push({
      name: req.name,
      description: req.description,
      completed: reqCompleted,
      required: req.required,
      satisfied:
        reqCompleted >= req.required ||
        permanentManualCount >= req.required - reqCompleted,
      options: reqOptions,
    });
  }

  const completedReqs = requirementProgress.filter((r) => r.satisfied);
  const inProgressReqs = requirementProgress.filter(
    (r) => !r.satisfied && r.options.some((o) => o.inProgress)
  );
  const remainingReqs = requirementProgress.filter(
    (r) => !r.satisfied && !r.options.some((o) => o.inProgress)
  );

  const total = certificate.creditRequirements.total || 1;
  const percentage = Math.min(100, (totalCompletedCredits / total) * 100);
  const inProgressPercentage = Math.min(
    100,
    ((totalCompletedCredits + totalInProgressCredits) / total) * 100
  );

  return {
    completedRequirements: completedReqs,
    inProgressRequirements: inProgressReqs,
    remainingRequirements: remainingReqs,
    completedCredits: totalCompletedCredits,
    inProgressCredits: totalInProgressCredits,
    remainingCredits: Math.max(
      0,
      total - totalCompletedCredits - totalInProgressCredits
    ),
    totalCredits: total,
    percentage,
    inProgressPercentage,
  };
};

export function calculatePreviewCertificateProgressByCertificates(
  certificateIds: string[],
  completedCourseCodes: string[],
  inProgressCourseCodes: string[] = [],
  skippedCourseCodes: string[] = [],
  manualRequirements: ManualRequirementEntry[] = [],
  plannedCourseCodes: string[] = [],
  blockedCourseCodes: string[] = []
): Record<string, CertificateProgress> {
  const canon = (arr: string[]) =>
    Array.from(
      new Set(
        arr
          .map((c) => getCanonicalCode(c) || c)
          .filter((c) => typeof c === "string" && c.length > 0)
      )
    );

  const blockedCanon = canon(blockedCourseCodes);
  const completedCanon = canon(completedCourseCodes).filter(
    (c) => !blockedCanon.includes(c)
  );
  const skippedCanon = canon(skippedCourseCodes).filter(
    (c) => !blockedCanon.includes(c)
  );
  const plannedCanon = canon(plannedCourseCodes).filter(
    (c) =>
      !completedCanon.includes(c) &&
      !skippedCanon.includes(c) &&
      !blockedCanon.includes(c)
  );
  const inProgressCanon = Array.from(
    new Set(
      [...canon(inProgressCourseCodes), ...plannedCanon].filter(
        (c) => !blockedCanon.includes(c)
      )
    )
  );

  const out: Record<string, CertificateProgress> = {};
  for (const certificateId of certificateIds) {
    out[certificateId] = calculateCertificateProgress(
      certificateId,
      completedCanon,
      inProgressCanon,
      skippedCanon,
      manualRequirements,
      [],
      blockedCanon
    );
  }
  return out;
}
