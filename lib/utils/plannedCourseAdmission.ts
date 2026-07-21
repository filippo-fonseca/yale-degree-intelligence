/**
 * May a course be planned at all?
 *
 * The simulator lets a student drop any course from the pool onto any future
 * semester, and until now nothing asked the policy engine first: a course the
 * engine would refuse everywhere landed on the grid and only announced itself
 * afterwards, as a refused chip in the breakdown.
 *
 * The rule this encodes is deliberately narrow. A course is refused entry only
 * when EVERY program that could take it refuses it, which is the one case where
 * planning it buys the student nothing. A course the major still wants is
 * always admitted even when a certificate refuses it, because majors win
 * contested courses and no student should be stopped from planning a course
 * their major needs; the certificate side then shows the not-counted treatment.
 *
 * Pure and deterministic, like the engine it calls. It decides no policy of its
 * own: every verdict and every reason string comes from evaluateAllocation.
 */

import {
  evaluateAllocation,
  type Allocation,
  type ProgramRef,
} from "@/lib/certificatePolicy";

/** One requirement slot the course could go to. */
export type CandidateSlot = {
  program: ProgramRef;
  requirementTitle: string;
};

/** A slot the engine refused, carrying the engine's own sentence. */
export type SlotRefusal = CandidateSlot & { reason: string };

export type PlannedCourseAdmission = {
  /** False only when every candidate slot was refused. */
  admitted: boolean;
  /**
   * Every refusal, in candidate order, deduplicated by program and reason.
   * Populated whether or not the course was admitted; the caller shows them
   * only when it blocks.
   */
  refusals: SlotRefusal[];
};

export type PlannedCourseAdmissionInput = {
  courseCode: string;
  /**
   * The slots the course auto-matches today. An empty list means no program
   * lists the course, which is the manual-assignment case rather than a
   * refusal, so it is admitted.
   */
  candidates: CandidateSlot[];
  /** The claims that survive the audit. See settleAllocations. */
  existing: Allocation[];
  majorIds: string[];
  certificateIds: string[];
  grade?: string | null;
};

export function evaluatePlannedCourseAdmission(
  input: PlannedCourseAdmissionInput,
): PlannedCourseAdmission {
  if (input.candidates.length === 0) {
    return { admitted: true, refusals: [] };
  }

  const refusals: SlotRefusal[] = [];
  const seen = new Set<string>();
  let admitted = false;

  for (const candidate of input.candidates) {
    const verdict = evaluateAllocation({
      courseCode: input.courseCode,
      target: {
        type: candidate.program.type,
        id: candidate.program.id,
        requirementTitle: candidate.requirementTitle,
      },
      existing: input.existing,
      majorIds: input.majorIds,
      certificateIds: input.certificateIds,
      grade: input.grade,
    });

    if (verdict.allowed) {
      admitted = true;
      continue;
    }

    const key = `${candidate.program.type}:${candidate.program.id}::${verdict.reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refusals.push({ ...candidate, reason: verdict.reason });
  }

  return { admitted, refusals };
}
