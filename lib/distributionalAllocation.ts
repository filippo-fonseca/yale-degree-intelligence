import { Course } from "@/lib/types";
import { effectiveDistributionals } from "@/lib/utils/effectiveDistributionals";

// The five Yale area + skill distributional requirements that compete for a
// single course. A course tagged with more than one of these may only count
// toward ONE of them, so we have to decide which. Language levels (L1-L5) are a
// separate axis and are intentionally NOT part of this allocation.
export const ALLOC_REQS = [
  { code: "Hu", target: 2 },
  { code: "So", target: 2 },
  { code: "Sc", target: 2 },
  { code: "QR", target: 2 },
  { code: "WR", target: 2 },
] as const;

export const ALLOC_REQ_CODES: readonly string[] = ALLOC_REQS.map((r) => r.code);

const TARGET: Record<string, number> = Object.fromEntries(
  ALLOC_REQS.map((r) => [r.code, r.target]),
);

/** Credits a course contributes toward a distributional requirement. */
export function courseDistCredits(course: Course): number {
  return course.credits > 0 ? course.credits : 1;
}

export function sumCourseCredits(courses: Course[]): number {
  return courses.reduce((sum, c) => sum + courseDistCredits(c), 0);
}

export type DistAllocation = {
  /** Stable course key -> the requirement code it is counted toward. */
  reqByCourseKey: Record<string, string>;
  /** Requirement code -> courses allocated to it (deterministic order). */
  coursesByReq: Record<string, Course[]>;
  /** Stable course key -> the area/skill requirements it is eligible for (>=1). */
  optionsByCourseKey: Record<string, string[]>;
  /** Stable course key by course (mirror of the key function for callers). */
  keyOf: (course: Course) => string;
};

/** A course's identity for allocation. Prefer the firestore id, fall back to code. */
function courseKey(course: Course): string {
  return course.id || course.code;
}

/** The area/skill requirement codes a course is tagged with (intersection). */
function eligibleOptions(course: Course): string[] {
  const tags = effectiveDistributionals(course);
  return ALLOC_REQ_CODES.filter((c) => tags.includes(c));
}

/**
 * Allocate each course to a single area/skill requirement.
 *
 * - `auto`: ignore overrides and compute the assignment that fills the most
 *   requirement slots (maximum bipartite matching with per-requirement capacity).
 * - manual (`auto` false): honor `overrides` (course code -> req code) as fixed
 *   assignments, then auto-fill everything else around them.
 *
 * Courses that cannot be matched into an open slot are still attached to their
 * first eligible requirement as "extra" so nothing silently disappears.
 */
export function allocateDistributionals(
  courses: Course[],
  opts: { auto: boolean; overrides: Record<string, string> },
): DistAllocation {
  const { auto, overrides } = opts;

  const candidates = courses
    .filter((c) => !c.skipped && eligibleOptions(c).length > 0)
    .slice()
    .sort(
      (a, b) =>
        (a.code || "").localeCompare(b.code || "") ||
        courseKey(a).localeCompare(courseKey(b)),
    );

  const optionsByCourseKey: Record<string, string[]> = {};
  const byKey: Record<string, Course> = {};
  candidates.forEach((c) => {
    const k = courseKey(c);
    optionsByCourseKey[k] = eligibleOptions(c);
    byKey[k] = c;
  });

  const reqByCourseKey: Record<string, string> = {};
  const remaining: Record<string, number> = {};
  ALLOC_REQ_CODES.forEach((c) => {
    remaining[c] = TARGET[c];
  });

  const toMatch: Course[] = [];

  if (!auto) {
    candidates.forEach((c) => {
      const k = courseKey(c);
      const ov = overrides[c.code];
      if (ov && optionsByCourseKey[k].includes(ov)) {
        reqByCourseKey[k] = ov;
        remaining[ov] = Math.max(0, remaining[ov] - courseDistCredits(c));
      } else {
        toMatch.push(c);
      }
    });
  } else {
    candidates.forEach((c) => toMatch.push(c));
  }

  // Greedy credit-based assignment: most-constrained courses first.
  const sorted = [...toMatch].sort((a, b) => {
    const optsA = optionsByCourseKey[courseKey(a)].length;
    const optsB = optionsByCourseKey[courseKey(b)].length;
    return (
      optsA - optsB ||
      courseKey(a).localeCompare(courseKey(b))
    );
  });

  for (const c of sorted) {
    const k = courseKey(c);
    const opts = optionsByCourseKey[k];
    const credits = courseDistCredits(c);
    const open = opts
      .filter((req) => remaining[req] > 0)
      .sort((a, b) => remaining[b] - remaining[a]);

    if (open.length > 0) {
      const req = open[0];
      reqByCourseKey[k] = req;
      remaining[req] = Math.max(0, remaining[req] - credits);
    } else {
      reqByCourseKey[k] = opts[0];
    }
  }

  const coursesByReq: Record<string, Course[]> = {};
  ALLOC_REQ_CODES.forEach((c) => {
    coursesByReq[c] = [];
  });
  candidates.forEach((c) => {
    const req = reqByCourseKey[courseKey(c)];
    if (req) coursesByReq[req].push(c);
  });

  return {
    reqByCourseKey,
    coursesByReq,
    optionsByCourseKey,
    keyOf: courseKey,
  };
}
