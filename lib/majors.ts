// src/lib/majors.ts
import { CourseInfo, getCourseInfo, getCanonicalCode, isValidCourseCode } from "./courseCatalog";
import allReqs from './data/all_reqs.json';

export type RequirementOption = {
  type: 'course';
  /** Canonical catalog code, i.e. getCanonicalCode(code) === code. */
  code: string;
} | {
  type: 'group';
  /** Canonical catalog codes the student may choose between. */
  options: string[];
  /** How many COURSES from this group count. Nothing beyond it does. */
  required: number;
  description?: string;
};

export type MajorRequirement = {
  id: string;
  name: string;
  description?: string;
  requirements: {
    name: string;
    description?: string;
    /**
     * How many COURSES the requirement needs — never credits. A half-credit lab
     * that has to be taken once is 1. `creditRequirements.total` is the only
     * field denominated in credits.
     *
     * When a requirement offers more options than it needs, they have to sit in
     * a single `group`: loose `course` options are all counted, with no ceiling.
     */
    required: number;
    /** Empty when the rule is a category rather than a list of courses. */
    options: RequirementOption[];
  }[];
  creditRequirements: {
    /** Total course credits, including any prerequisites listed above. */
    total: number;
  };
};

// Create a typed version of allReqs
export const majorRequirements: Record<string, MajorRequirement> = allReqs as Record<string, MajorRequirement>;

export const MAJORS = Object.values(majorRequirements).reduce((acc, major) => {
  acc[major.id] = major.name;
  return acc;
}, {} as Record<string, string>);

type CompletedRequirement = {
  name: string;
  description?: string;
  completed: number;
  required: number;
  satisfied: boolean;
  options: {
    code: string;
    name: string;
    completed: boolean;
    inProgress: boolean;
    required: boolean;
    credits: number;
    skipped?: boolean;
    manual?: boolean;
  }[];
};

export type MajorProgress = {
  completedRequirements: CompletedRequirement[];
  inProgressRequirements: CompletedRequirement[];
  remainingRequirements: CompletedRequirement[];
  completedCredits: number;
  inProgressCredits: number;
  remainingCredits: number;
  totalCredits: number;
  percentage: number;
  inProgressPercentage: number;
};

export type ExcludedRequirementEntry = {
  code: string;
  requirement: string;
};

/**
 * Courses done / underway on one requirement, measured the same way `required`
 * in lib/data/all_reqs.json is: in courses, never in credits.
 *
 * The distinction is the whole ballgame for half-credit courses. PHYS 2060L is
 * worth 0.5 credits and is the only way to satisfy the Physics advanced lab, so
 * a view that adds up credits and compares the sum to `required` leaves that
 * requirement reading "0.5/1" no matter what the student takes. Both numbers
 * are clamped to `required` as well, so a requirement that lists more options
 * than it needs — the four alternative introductory Physics sequences, say —
 * cannot read "4/2".
 */
export function countReqProgress(
  options: { completed?: boolean; inProgress?: boolean }[] | undefined,
  required: number,
): { reqCompleted: number; reqInProgress: number } {
  const opts = options ?? [];
  const completed = opts.filter((o) => o.completed).length;
  const inProgress = opts.filter((o) => o.inProgress && !o.completed).length;
  if (required <= 0) {
    return { reqCompleted: completed, reqInProgress: inProgress };
  }
  const reqCompleted = Math.min(completed, required);
  return {
    reqCompleted,
    reqInProgress: Math.min(inProgress, required - reqCompleted),
  };
}

export const calculateMajorProgress = (
  majorId: string,
  completedCourseCodes: string[],
  inProgressCourseCodes: string[] = [],
  skippedCourseCodes: string[] = [],
  manualRequirements: ManualRequirementEntry[] = [],
  excludedRequirements: ExcludedRequirementEntry[] = [],
  /** Courses claimed by certificates (or otherwise blocked from counting toward majors). */
  blockedCourseCodes: string[] = []
): MajorProgress => {
  const major = majorRequirements[majorId];
  if (!major) throw new Error(`Major ${majorId} not found`);

  // Normalize all course codes
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

  // Build a set of exclusions for quick lookup: "reqName:code"
  const exclusionSet = new Set(
    excludedRequirements.map(e => `${e.requirement}:${getCanonicalCode(e.code) || e.code}`)
  );

  // Helper to check if a course is excluded from a requirement
  const isExcluded = (reqName: string, code: string): boolean => {
    const canonical = getCanonicalCode(code) || code;
    return exclusionSet.has(`${reqName}:${code}`) || exclusionSet.has(`${reqName}:${canonical}`);
  };

  // Group manual requirements by requirement name
  const manualByRequirement: Record<string, {code: string, credits: number, isPlanned?: boolean}[]> = {};
  manualRequirements.forEach(m => {

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

  /**
   * Details for one option, falling back for a code the catalog has never heard
   * of. Dropping such an option would leave `required` counting a slot nothing
   * can fill, which is how a mistyped code turns into a requirement no student
   * can ever finish. Showing it keeps the requirement visible and leaves the
   * "Fulfill manually" and "Mark as skipped" escape hatches usable.
   * lib/majorRequirementsData.test.ts is what stops such a code from shipping.
   */
  const optionDetails = (code: string) => {
    const course = getCourseInfo(code);
    return {
      name: course?.name ?? code,
      credits: course?.credits ?? 1,
    };
  };

  for (const req of major.requirements) {
    let reqCompleted = 0;
    let reqInProgress = 0;
    const reqOptions: CompletedRequirement['options'] = [];

    // Check for manual fulfillments for this requirement
    const manualFulfillments = manualByRequirement[req.name] || [];

    // Process manual fulfillments
    manualFulfillments.forEach(({code, credits, isPlanned}) => {
      reqOptions.push({
        code,
        name: getCourseInfo(code)?.name || code,
        completed: !isPlanned, // Planned manuals are not yet completed
        inProgress: !!isPlanned, // Planned manuals show as in-progress
        required: true,
        credits: credits,
        manual: true
      });
      if (isPlanned) {
        reqInProgress += 1;
        totalInProgressCredits += credits;
      } else {
        reqCompleted += 1;
        totalCompletedCredits += credits;
      }
    });

    // Process regular requirements
    for (const option of req.options) {
      if (option.type === 'course') {
        const code = option.code;
        // Skip if this course was already added manually
        if (manualFulfillments.some(m => m.code === code)) continue;

        const { name, credits } = optionDetails(code);

        // Check if this course is excluded from this requirement
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
          name,
          completed: completed || skipped,
          inProgress: inProgress && !completed && !skipped,
          required: true,
          credits,
          skipped
        });

        if (completed || skipped) {
          reqCompleted += 1;
          totalCompletedCredits += credits;
        } else if (inProgress) {
          reqInProgress += 1;
          totalInProgressCredits += credits;
        }
      } else if (option.type === 'group') {
        let groupCompleted = 0;
        let groupInProgress = 0;
        let groupCredits = 0;

        option.options.forEach((code: string) => {
          // Skip if this course was already added manually
          if (manualFulfillments.some(m => m.code === code)) return;

          const { name, credits } = optionDetails(code);

          // Check if this course is excluded from this requirement
          const excluded = isExcluded(req.name, code);

          const completed = canonicalCompleted.includes(code) && !excluded;
          const inProgress = canonicalInProgress.includes(code) && !excluded;
          // See the note on the course branch above: a skip outranks an
          // exclusion, so skipping an excluded option is not a no-op.
          const skipped = canonicalSkipped.includes(code);

          reqOptions.push({
            code,
            name,
            completed: completed || skipped,
            inProgress: inProgress && !completed && !skipped,
            required: (groupCompleted + groupInProgress) < option.required,
            credits,
            skipped
          });

          if ((completed || skipped) && groupCompleted < option.required) {
            groupCompleted++;
            groupCredits += credits;
          } else if (inProgress && (groupCompleted + groupInProgress) < option.required) {
            groupInProgress++;
          }
        });

        reqCompleted += groupCompleted;
        reqInProgress += groupInProgress;
        totalCompletedCredits += groupCredits;
      }
    }

    // Only count permanent (non-planned) manuals toward satisfaction
    const permanentManualCount = manualFulfillments.filter(m => !m.isPlanned).length;

    requirementProgress.push({
      name: req.name,
      description: req.description,
      completed: reqCompleted,
      required: req.required,
      satisfied: reqCompleted >= req.required || permanentManualCount >= (req.required - reqCompleted),
      options: reqOptions
    });
  }

  // Categorize requirements - each requirement appears in exactly ONE section
  // Priority: Satisfied > In Progress > Remaining

  // Satisfied: fully satisfied requirements only
  const completedReqs = requirementProgress.filter(r => r.satisfied);

  // In Progress: NOT satisfied, but has in-progress courses (real or planned)
  const inProgressReqs = requirementProgress.filter(r =>
    !r.satisfied && r.options.some(o => o.inProgress)
  );

  // Remaining: NOT satisfied AND no in-progress courses
  const remainingReqs = requirementProgress.filter(r =>
    !r.satisfied && !r.options.some(o => o.inProgress)
  );

  // Calculate percentages
  const percentage = Math.min(100, (totalCompletedCredits / major.creditRequirements.total) * 100);
  const inProgressPercentage = Math.min(100, 
    ((totalCompletedCredits + totalInProgressCredits) / major.creditRequirements.total) * 100
  );

  return {
    completedRequirements: completedReqs,
    inProgressRequirements: inProgressReqs,
    remainingRequirements: remainingReqs,
    completedCredits: totalCompletedCredits,
    inProgressCredits: totalInProgressCredits,
    remainingCredits: Math.max(0, major.creditRequirements.total - totalCompletedCredits - totalInProgressCredits),
    totalCredits: major.creditRequirements.total,
    percentage,
    inProgressPercentage
  };
};

export const getFullMajorNameById = (majorId: string): string => {
  const major = majorRequirements[majorId];
  return major ? major.name : "Unknown Major";
};

export const getMajorDescriptionById = (majorId: string): string => {
  const major = majorRequirements[majorId];
  return major.description ? major.description : "Major at Yale University.";
};

export const getReqsForMajor = (majorId: string): MajorRequirement | null => {
  return majorRequirements[majorId] || null;
}

// --- Live preview helper (treat planned as in-progress) ---

export type ManualRequirementEntry = {
  code: string;
  requirement: string;
  credits: number;
  isPlanned?: boolean; // true = simulator planning (future), false/undefined = permanent (My Major)
  /** Optional program context for simulator dual major/certificate assignment. */
  programType?: "major" | "certificate";
  programId?: string;
};

/**
 * Builds a MajorProgress map for the given majors, where plannedCourseCodes
 * are treated as "in-progress" on top of the user's real in-progress set.
 *
 * This mirrors the "Including In Progress Credits" logic but also includes
 * anything the user has currently placed on the Simulator grid.
 */
export function calculatePreviewMajorProgressByMajors(
  majorIds: string[],
  completedCourseCodes: string[],
  inProgressCourseCodes: string[] = [],
  skippedCourseCodes: string[] = [],
  manualRequirements: ManualRequirementEntry[] = [],
  plannedCourseCodes: string[] = [],
  blockedCourseCodes: string[] = []
): Record<string, MajorProgress> {
  // Canonicalize + dedupe planned into inProgress (without overriding completed/skipped)
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

  // planned that are not already completed/skipped/blocked
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

  const out: Record<string, MajorProgress> = {};
  for (const majorId of majorIds) {
    out[majorId] = calculateMajorProgress(
      majorId,
      completedCanon,
      inProgressCanon,
      skippedCanon,
      manualRequirements,
      [], // excludedRequirements - not used in simulator preview
      blockedCanon
    );
  }
  return out;
}
