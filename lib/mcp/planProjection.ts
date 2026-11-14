/**
 * The Simulator's projection, outside React. SERVER SAFE (pure).
 *
 * Mirrors the live preview in components/Simulator/Simulator.tsx so a number
 * an agent reads from `get_plan_progress` is the number the student sees on
 * the canvas: same reconcile, same planned/in-progress split, same policy
 * engine inputs. If the Simulator's preview changes, change this with it.
 */
import type { Course } from "@/lib/types";
import type { Plan } from "@/components/Simulator/planTypes";
import {
  calculatePreviewMajorProgressByMajors,
  majorRequirements,
  type MajorProgress,
  type ManualRequirementEntry,
} from "@/lib/majors";
import {
  calculatePreviewCertificateProgressByCertificates,
  certificateRequirements,
} from "@/lib/certificates";
import { isCurrentTerm } from "@/lib/academicTerm";
import { reconcilePlanSemesters, type PlanSemester } from "@/lib/simulatorPlanReconcile";
import { buildSimulatorPolicyInputs, findMatchedRequirements } from "@/lib/simulatorPolicy";
import {
  blockedCodesFromViolations,
  buildProgramClaimContext,
  filterCertificateManualEntries,
  getMajorBlockedCodes,
  settleAllocations,
} from "@/lib/utils/programClaims";
import {
  evaluatePlannedCourseAdmission,
  type PlannedCourseAdmission,
} from "@/lib/utils/plannedCourseAdmission";
import { distributionalResolverFor } from "@/lib/utils/effectiveDistributionals";
import { isCreditDFailCourse } from "@/lib/utils/creditDFail";
import { buildDistributionalTallyInputs } from "@/lib/simulatorMilestones";
import { tallyDistributionals, type DistTallyResult } from "@/lib/distributionalTally";

export type ProjectionProfile = {
  majors: string[];
  certificates: string[];
  graduationYear: number;
  distributionalAutoAllocate: boolean;
  distributionalAllocations: Record<string, string>;
  englishSatisfiesLanguage: boolean;
};

export type PlanContext = {
  semesters: PlanSemester[];
  takenForProjection: Course[];
  completedCodes: string[];
  inProgressCodes: string[];
  plannedCodes: string[];
};

/** The plan as the canvas shows it, with the derived course sets. */
export function planContext(
  plan: Plan,
  transcript: Course[],
  graduationYear: number,
  now: Date = new Date(),
): PlanContext {
  const semesters = reconcilePlanSemesters(plan.semesters, transcript, graduationYear, now);
  const planTaken = semesters.flatMap((s) =>
    s.courses.filter((c) => c?.code && c.status !== "not-taken"),
  );
  const seen = new Set(planTaken.map((c) => c.code));
  const takenForProjection = [
    ...planTaken,
    ...transcript.filter((c) => c.status === "completed" && !seen.has(c.code)),
  ];
  const completedCodes = takenForProjection
    .filter((c) => c.status === "completed")
    .map((c) => c.code);
  const inProgressCodes = semesters.flatMap((s) =>
    s.courses
      .filter(
        (c) =>
          c?.code &&
          c.status !== "completed" &&
          (c.status === "in-progress" || isCurrentTerm(s.name, now)),
      )
      .map((c) => c.code),
  );
  const planned = new Set<string>();
  for (const s of semesters) {
    if (isCurrentTerm(s.name, now)) continue;
    for (const c of s.courses) {
      if (c?.code && c.status === "not-taken") planned.add(c.code);
    }
  }
  return {
    semesters,
    takenForProjection,
    completedCodes,
    inProgressCodes,
    plannedCodes: Array.from(planned),
  };
}

function permanentManuals(
  transcript: Course[],
  majorIds: string[],
  certificateIds: string[],
): { major: ManualRequirementEntry[]; certificate: ManualRequirementEntry[] } {
  const major: ManualRequirementEntry[] = [];
  const certificate: ManualRequirementEntry[] = [];
  for (const course of transcript) {
    for (const m of course.manualRequirementsFulfilled ?? []) {
      const base = { code: course.code, requirement: m.requirement_title, credits: course.credits || 1 };
      if (m.certificate_id && certificateIds.includes(m.certificate_id)) {
        certificate.push({ ...base, programType: "certificate", programId: m.certificate_id });
      } else if (m.major_id && !m.certificate_id && majorIds.includes(m.major_id)) {
        major.push({ ...base, programType: "major", programId: m.major_id });
      }
    }
  }
  return { major, certificate };
}

export type PlanProjection = {
  context: PlanContext;
  majors: Record<string, MajorProgress>;
  certificates: Record<string, MajorProgress>;
  distributionals: DistTallyResult;
};

export function projectPlan(
  plan: Plan,
  transcript: Course[],
  profile: ProjectionProfile,
  now: Date = new Date(),
): PlanProjection {
  const ctx = planContext(plan, transcript, profile.graduationYear, now);
  const majorIds = profile.majors.filter((id) => majorRequirements[id]);
  const certificateIds = profile.certificates.filter((id) => certificateRequirements[id]);
  const simulatorManuals = plan.manualRequirements ?? [];

  const distributionals = tallyDistributionals(
    buildDistributionalTallyInputs({
      taken: ctx.takenForProjection,
      semesters: ctx.semesters,
      auto: profile.distributionalAutoAllocate,
      overrides: profile.distributionalAllocations,
      englishSatisfiesLanguage: profile.englishSatisfiesLanguage,
    }),
  );

  if (majorIds.length === 0 && certificateIds.length === 0) {
    return { context: ctx, majors: {}, certificates: {}, distributionals };
  }

  const distributionalsFor = distributionalResolverFor(ctx.takenForProjection);
  const creditDFailCodes = ctx.takenForProjection.filter(isCreditDFailCourse).map((c) => c.code);
  const { policyOptions, majorManuals, certificateManuals, certificateOnlyPlannedCodes } =
    buildSimulatorPolicyInputs(majorIds, certificateIds, simulatorManuals, ctx.plannedCodes);
  const claimContext = buildProgramClaimContext(ctx.takenForProjection, policyOptions);
  const majorBlockedCodes = [
    ...getMajorBlockedCodes(ctx.takenForProjection, policyOptions),
    ...certificateOnlyPlannedCodes,
  ];

  const planCodes = new Set([...ctx.completedCodes, ...ctx.inProgressCodes, ...ctx.plannedCodes]);
  const permanent = permanentManuals(transcript, majorIds, certificateIds);
  const majorManualReqs = [
    ...permanent.major.filter((m) => planCodes.has(m.code)),
    ...majorManuals.map((m) => ({ ...m, isPlanned: true })),
  ];
  const certificateManualReqs = [
    ...permanent.certificate.filter((m) => planCodes.has(m.code)),
    ...certificateManuals.map((m) => ({ ...m, isPlanned: true })),
  ];

  const majors =
    majorIds.length > 0
      ? calculatePreviewMajorProgressByMajors(
          majorIds,
          ctx.completedCodes,
          ctx.inProgressCodes,
          [],
          majorManualReqs,
          ctx.plannedCodes,
          majorBlockedCodes,
          distributionalsFor,
          creditDFailCodes,
        )
      : {};

  const certificates: Record<string, MajorProgress> = {};
  for (const certId of certificateIds) {
    const violations = claimContext.violations.filter(
      (v) => v.program.type === "certificate" && v.program.id === certId,
    );
    Object.assign(
      certificates,
      calculatePreviewCertificateProgressByCertificates(
        [certId],
        ctx.completedCodes,
        ctx.inProgressCodes,
        [],
        filterCertificateManualEntries(certificateManualReqs, certId, violations),
        ctx.plannedCodes,
        blockedCodesFromViolations(violations),
      ),
    );
  }

  return { context: ctx, majors, certificates, distributionals };
}

/**
 * The Simulator's admission check for dropping a course on the plan: whether
 * the certificate policy engine lets it count anywhere it auto-matches.
 */
export function admitPlannedCourse(
  code: string,
  grade: string | null,
  plan: Plan,
  transcript: Course[],
  profile: ProjectionProfile,
  now: Date = new Date(),
): PlannedCourseAdmission {
  const ctx = planContext(plan, transcript, profile.graduationYear, now);
  const majorIds = profile.majors.filter((id) => majorRequirements[id]);
  const certificateIds = profile.certificates.filter((id) => certificateRequirements[id]);
  const { policyOptions } = buildSimulatorPolicyInputs(
    majorIds,
    certificateIds,
    plan.manualRequirements ?? [],
    ctx.plannedCodes,
  );
  const candidates = findMatchedRequirements(code, majorIds, certificateIds).map((match) => ({
    program: { type: match.programType, id: match.programId },
    requirementTitle: match.requirementName,
  }));
  const context = buildProgramClaimContext(ctx.takenForProjection, policyOptions);
  return evaluatePlannedCourseAdmission({
    courseCode: code,
    candidates,
    existing: settleAllocations(context),
    majorIds: context.majorIds,
    certificateIds: context.certificateIds,
    grade,
  });
}
