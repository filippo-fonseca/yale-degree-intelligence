import { Course } from "@/lib/types";
import { calculateMajorProgress, MAJORS, type MajorProgress } from "@/lib/majors";
import { getCanonicalCode } from "@/lib/courseCatalog";
import { bucketCourses } from "@/lib/utils/courseBuckets";

interface UserProfile {
  majors: string[];
  graduationYear: number;
  updatedAt: Date;
  prereqOverrides?: string[];
}

export interface SharedCourse {
  code: string;
  credits: number;
  majors: { majorId: string; majorName: string; requirements: string[] }[];
  // True when the user has marked this course as a prerequisite, exempting it
  // from the overlap warning.
  isPrereqOverride: boolean;
  // True when the course only exists on the simulated plan, not the transcript.
  planned: boolean;
}

export interface SharedCoursesResult {
  courses: SharedCourse[];
  // Credits that actually count toward the overlap warning (excludes overrides).
  totalCredits: number;
  // Credits the user has waived via prerequisite overrides.
  overriddenCredits: number;
  // Yale lets at most this many credits count toward two majors at once.
  cap: number;
  // True when the counted credits are over the cap.
  exceeded: boolean;
}

/** Yale's ceiling on credits that may count toward two majors at once. */
export const MAJOR_OVERLAP_CAP = 2;

export interface FindSharedMajorCoursesOptions {
  /** Credit values keyed by course code, used ahead of the requirement option's own. */
  creditsByCode?: Record<string, number>;
  /** Course codes the user marked as prerequisites, exempt from the cap. */
  prereqOverrides?: string[];
  /** Codes sitting on the simulated plan, used to flag a course as `planned`. */
  plannedCodes?: string[];
  /** Count options that are only in progress (the simulator folds planned into these). */
  includeInProgress?: boolean;
  /**
   * Which requirement buckets to walk. "all" (the default) also picks up a
   * course counting toward a requirement that is not satisfied yet, which is
   * what the plan-wide simulator view wants. "satisfied" keeps the older
   * transcript-side behaviour of only reading completed requirements.
   */
  buckets?: "all" | "satisfied";
}

const canon = (code: string): string => getCanonicalCode(code) || code;

/**
 * Core overlap check: given per-major progress, find the courses that count
 * toward more than one major and total the credits against Yale's 2-credit cap.
 *
 * Pure, so both the transcript view and the simulator can share it. Codes are
 * canonicalised so a cross-listing counted under two different numbers still
 * resolves to a single shared course.
 */
export function findSharedMajorCourses(
  majorIds: string[],
  progressByMajor: Record<string, MajorProgress>,
  options: FindSharedMajorCoursesOptions = {}
): SharedCoursesResult {
  const {
    creditsByCode = {},
    prereqOverrides = [],
    plannedCodes = [],
    includeInProgress = false,
    buckets = "all",
  } = options;

  const empty: SharedCoursesResult = {
    courses: [],
    totalCredits: 0,
    overriddenCredits: 0,
    cap: MAJOR_OVERLAP_CAP,
    exceeded: false,
  };

  if (majorIds.length <= 1) return empty;

  const overrideSet = new Set(prereqOverrides.map(canon));
  const plannedSet = new Set(plannedCodes.map(canon));
  const creditLookup = new Map<string, number>();
  for (const [code, credits] of Object.entries(creditsByCode)) {
    creditLookup.set(canon(code), credits);
  }

  // code -> majorId -> requirement names it satisfies there
  const byCode = new Map<string, Map<string, string[]>>();
  // Codes with real transcript evidence (completed or skipped), so a course on
  // the plan that the student has already taken is not mislabelled as planned.
  const onTranscript = new Set<string>();
  const creditsSeen = new Map<string, number>();

  for (const majorId of majorIds) {
    const progress = progressByMajor[majorId];
    if (!progress) continue;

    const requirements =
      buckets === "satisfied"
        ? progress.completedRequirements
        : [
            ...progress.completedRequirements,
            ...progress.inProgressRequirements,
            ...progress.remainingRequirements,
          ];

    for (const req of requirements) {
      for (const opt of req.options) {
        const counts =
          opt.completed || opt.skipped || (includeInProgress && opt.inProgress);
        if (!counts) continue;

        const code = canon(opt.code);
        if (opt.completed || opt.skipped) onTranscript.add(code);
        if (!creditsSeen.has(code) && typeof opt.credits === "number") {
          creditsSeen.set(code, opt.credits);
        }

        let perMajor = byCode.get(code);
        if (!perMajor) {
          perMajor = new Map<string, string[]>();
          byCode.set(code, perMajor);
        }
        const names = perMajor.get(majorId) || [];
        if (!names.includes(req.name)) names.push(req.name);
        perMajor.set(majorId, names);
      }
    }
  }

  const sharedCourses: SharedCourse[] = [];

  for (const [code, perMajor] of Array.from(byCode.entries())) {
    // Preserve the caller's major order so the list reads consistently.
    const majorsWithCourse = majorIds.filter((majorId) => perMajor.has(majorId));
    if (majorsWithCourse.length <= 1) continue;

    sharedCourses.push({
      code,
      credits: creditLookup.get(code) ?? creditsSeen.get(code) ?? 1,
      isPrereqOverride: overrideSet.has(code),
      planned: !onTranscript.has(code) && plannedSet.has(code),
      majors: majorsWithCourse.map((majorId) => ({
        majorId,
        majorName: MAJORS[majorId] || majorId,
        requirements: perMajor.get(majorId) || [],
      })),
    });
  }

  // Sort overridden (prereq) courses to the bottom so active conflicts surface.
  sharedCourses.sort(
    (a, b) => Number(a.isPrereqOverride) - Number(b.isPrereqOverride)
  );

  const totalCredits = sharedCourses.reduce(
    (sum, c) => (c.isPrereqOverride ? sum : sum + c.credits),
    0
  );
  const overriddenCredits = sharedCourses.reduce(
    (sum, c) => (c.isPrereqOverride ? sum + c.credits : sum),
    0
  );

  return {
    courses: sharedCourses,
    totalCredits,
    overriddenCredits,
    cap: MAJOR_OVERLAP_CAP,
    exceeded: totalCredits > MAJOR_OVERLAP_CAP,
  };
}

/**
 * Calculate shared courses between majors (for double/triple majors) from the
 * transcript alone. Planned and in-progress work is deliberately excluded here;
 * the simulator calls `findSharedMajorCourses` directly for the whole plan.
 */
export function getSharedCourses(
  userProfile: UserProfile | null,
  courses: Course[]
): SharedCoursesResult {
  if (!userProfile || userProfile.majors.length <= 1) {
    return {
      courses: [],
      totalCredits: 0,
      overriddenCredits: 0,
      cap: MAJOR_OVERLAP_CAP,
      exceeded: false,
    };
  }

  const { completedCourseCodes, inProgressCourseCodes, skippedCourseCodes } =
    bucketCourses(courses);

  const progressByMajor: Record<string, MajorProgress> = {};

  for (const major of userProfile.majors) {
    const manualRequirements = courses.flatMap((course) =>
      (course.manualRequirementsFulfilled || [])
        .filter((m) => m.major_id === major)
        .map((m) => ({
          code: course.code,
          requirement: m.requirement_title,
          credits: course.credits || 1,
        }))
    );

    const excludedRequirements = courses.flatMap((course) =>
      (course.excludedFromRequirements || [])
        .filter((m) => m.major_id === major)
        .map((m) => ({
          code: course.code,
          requirement: m.requirement_title,
        }))
    );

    progressByMajor[major] = calculateMajorProgress(
      major,
      completedCourseCodes,
      inProgressCourseCodes,
      skippedCourseCodes,
      manualRequirements,
      excludedRequirements
    );
  }

  const creditsByCode: Record<string, number> = {};
  for (const course of courses) {
    if (course.code) creditsByCode[course.code] = course.credits || 1;
  }

  return findSharedMajorCourses(userProfile.majors, progressByMajor, {
    creditsByCode,
    prereqOverrides: userProfile.prereqOverrides || [],
    includeInProgress: false,
    buckets: "satisfied",
  });
}
