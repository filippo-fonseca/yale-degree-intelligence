/**
 * How far a student is through one requirement, measured the way the
 * requirement data is written.
 *
 * `required` in lib/data/all_reqs.json and lib/data/all_certificates.json is a
 * COURSE COUNT: "2 terms of independent research", "3 advanced electives",
 * "1 advanced lab". calculateMajorProgress and calculateCertificateProgress
 * both count courses against it, so anything that recomputes a requirement's
 * progress from its options has to count courses too.
 *
 * The progress boards used to sum the options' credits instead, which is a
 * different unit the moment a requirement is filled by anything other than a
 * one-credit course. Every half-credit lab was then unreachable: PHYS 2060L is
 * the only course that can satisfy Physics Advanced Lab I, it is worth 0.5, and
 * 0.5 never reaches a `required` of 1, so the card sat in Remaining forever.
 */

export type RequirementOptionState = {
  completed?: boolean;
  inProgress?: boolean;
};

export type RequirementTally = {
  /** Options the student has finished (a skip counts as settled). */
  completed: number;
  /** Options currently under way, or planned in the simulator. */
  inProgress: number;
};

export function tallyRequirementOptions(
  options: RequirementOptionState[] | undefined,
): RequirementTally {
  let completed = 0;
  let inProgress = 0;
  for (const option of options || []) {
    if (option?.completed) completed += 1;
    else if (option?.inProgress) inProgress += 1;
  }
  return { completed, inProgress };
}
