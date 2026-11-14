// Which requirements a course could fill, and the policy inputs a Simulator
// plan hands the certificate policy engine. Lifted out of
// components/Simulator/Simulator.tsx unchanged so code that judges a plan
// without rendering it (the MCP server's plan tools) uses the same rules as
// the canvas.

import { getCanonicalCode } from "@/lib/courseCatalog";
import { majorRequirements, type ManualRequirementEntry } from "@/lib/majors";
import { certificateRequirements } from "@/lib/certificates";
import type { Allocation } from "@/lib/certificatePolicy";
import type { ProgramClaimOptions } from "@/lib/utils/programClaims";

export type MatchedRequirement = {
  programType: "major" | "certificate";
  programId: string;
  programName: string;
  requirementName: string;
};

export function collectRequirementOptionCodes(
  requirements: { options: Array<{ type: string; code?: string; options?: string[] }> }[],
): Set<string> {
  const codes = new Set<string>();
  for (const req of requirements) {
    for (const opt of req.options) {
      if (opt.type === "course" && opt.code) {
        codes.add(opt.code);
        const canon = getCanonicalCode(opt.code);
        if (canon) codes.add(canon);
      } else if (opt.type === "group" && opt.options) {
        for (const code of opt.options) {
          codes.add(code);
          const canon = getCanonicalCode(code);
          if (canon) codes.add(canon);
        }
      }
    }
  }
  return codes;
}

export function courseMatchesOptionCodes(
  courseCode: string,
  optionCodes: Set<string>,
): boolean {
  const canon = getCanonicalCode(courseCode) || courseCode;
  return optionCodes.has(courseCode) || optionCodes.has(canon);
}

export function findMatchedRequirements(
  courseCode: string,
  majorIds: string[],
  certificateIds: string[],
): MatchedRequirement[] {
  const matches: MatchedRequirement[] = [];
  const canon = getCanonicalCode(courseCode) || courseCode;

  for (const majorId of majorIds) {
    const major = majorRequirements[majorId];
    if (!major) continue;

    for (const req of major.requirements) {
      let found = false;
      for (const opt of req.options) {
        if (opt.type === "course") {
          const optCanon = getCanonicalCode(opt.code) || opt.code;
          if (
            opt.code === courseCode ||
            opt.code === canon ||
            optCanon === courseCode ||
            optCanon === canon
          ) {
            found = true;
            break;
          }
        } else if (opt.type === "group") {
          for (const code of (opt as { type: "group"; options: string[] })
            .options) {
            const codeCanon = getCanonicalCode(code) || code;
            if (
              code === courseCode ||
              code === canon ||
              codeCanon === courseCode ||
              codeCanon === canon
            ) {
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }
      if (found) {
        matches.push({
          programType: "major",
          programId: majorId,
          programName: major.name,
          requirementName: req.name,
        });
      }
    }
  }

  for (const certId of certificateIds) {
    const cert = certificateRequirements[certId];
    if (!cert) continue;

    for (const req of cert.requirements) {
      const optionCodes = collectRequirementOptionCodes([req]);
      if (courseMatchesOptionCodes(courseCode, optionCodes)) {
        matches.push({
          programType: "certificate",
          programId: certId,
          programName: cert.name,
          requirementName: req.name,
        });
      }
    }
  }

  return matches;
}

/**
 * Everything the policy engine needs to judge a plan.
 *
 * Plan-scoped assignments live only in simulator state, so they reach the
 * engine as extra allocations: the preview, the assign modal, and the
 * requirements breakdown then all rest on the same picture the student is
 * looking at, and none of them has to work out policy on its own.
 *
 * Planned courses that auto-match a major become major allocations, because
 * auto-matching prefers majors. The ones that only match a certificate are
 * returned separately: they cannot count toward a major at all, which is a
 * blocked code rather than an allocation.
 */
export function buildSimulatorPolicyInputs(
  majorIds: string[],
  certificateIds: string[],
  simulatorManualReqs: ManualRequirementEntry[],
  plannedCodes: string[],
): {
  policyOptions: ProgramClaimOptions;
  majorManuals: ManualRequirementEntry[];
  certificateManuals: ManualRequirementEntry[];
  certificateOnlyPlannedCodes: string[];
} {
  const majorManuals = simulatorManualReqs.filter(
    (m) => m.programType === "major" || !m.programType,
  );
  const certificateManuals = simulatorManualReqs.filter(
    (m) => m.programType === "certificate",
  );

  // Prefer majors for auto-matched planned courses that hit both catalogs.
  // Explicit certificate assignment still wins via certificateManuals.
  const certAssignedCodes = new Set(
    certificateManuals.map((m) => getCanonicalCode(m.code) || m.code),
  );
  const majorAssignedCodes = new Set(
    majorManuals.map((m) => getCanonicalCode(m.code) || m.code),
  );
  const plannedAutoMajorAllocations: Allocation[] = [];
  const certificateOnlyPlannedCodes: string[] = [];
  for (const code of plannedCodes) {
    const canon = getCanonicalCode(code) || code;
    if (certAssignedCodes.has(canon) || majorAssignedCodes.has(canon)) continue;
    const matches = findMatchedRequirements(code, majorIds, certificateIds);
    const majorMatch = matches.find((m) => m.programType === "major");
    const certMatch = matches.find((m) => m.programType === "certificate");
    if (majorMatch) {
      plannedAutoMajorAllocations.push({
        courseCode: canon,
        program: { type: "major", id: majorMatch.programId },
        requirementTitle: majorMatch.requirementName,
      });
    } else if (certMatch) {
      certificateOnlyPlannedCodes.push(canon);
    }
  }

  return {
    policyOptions: {
      majorIds,
      certificateIds,
      extraAllocations: [
        ...majorManuals.map((m) => ({
          courseCode: m.code,
          program: {
            type: "major" as const,
            id: m.programId ?? majorIds[0] ?? "",
          },
          requirementTitle: m.requirement,
        })),
        ...certificateManuals.map((m) => ({
          courseCode: m.code,
          program: {
            type: "certificate" as const,
            id: m.programId ?? certificateIds[0] ?? "",
          },
          requirementTitle: m.requirement,
        })),
        ...plannedAutoMajorAllocations,
      ],
    },
    majorManuals,
    certificateManuals,
    certificateOnlyPlannedCodes,
  };
}

