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

const EPS = 1e-9;

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

/**
 * One pass of the matcher: the courses to place, and how many credits each
 * requirement may hold during this pass. Later passes keep everything earlier
 * passes placed (a placed course can be moved to another requirement it is
 * eligible for, but never unplaced), so ordering the passes ranks the courses.
 */
export type AllocationStage = {
  courses: Course[];
  /** Credit capacity per requirement. Missing requirements default to 0. */
  caps: Record<string, number>;
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

function byCode(a: Course, b: Course): number {
  return (
    (a.code || "").localeCompare(b.code || "") ||
    courseKey(a).localeCompare(courseKey(b))
  );
}

/**
 * Allocate each course to a single area/skill requirement.
 *
 * - `auto`: ignore overrides and compute the assignment that fills the most
 *   requirement slots.
 * - manual (`auto` false): honor `overrides` (course code -> req code) as fixed
 *   assignments, then auto-fill everything else around them.
 *
 * The fill is a maximum matching, found with augmenting paths: when a course's
 * requirements are all full, a course already sitting in one of them is moved
 * to another requirement it qualifies for, if that frees the room. A greedy
 * pass cannot do that, so a "Hu, WR" course placed first could strand a later
 * Hu-only course with nowhere to go.
 *
 * `stages` lets a caller rank courses (for example, completed coursework before
 * planned coursework, or one checkpoint's minimums before the graduation
 * totals). Without it there is one stage holding every course at the graduation
 * targets.
 *
 * Courses that cannot be matched into an open slot are still attached to their
 * first eligible requirement as "extra" so nothing silently disappears.
 */
export function allocateDistributionals(
  courses: Course[],
  opts: {
    auto: boolean;
    overrides: Record<string, string>;
    stages?: AllocationStage[];
  },
): DistAllocation {
  const { auto, overrides } = opts;

  const candidates = courses
    .filter((c) => !c.skipped && eligibleOptions(c).length > 0)
    .slice()
    .sort(byCode);

  const optionsByCourseKey: Record<string, string[]> = {};
  const byKey: Record<string, Course> = {};
  candidates.forEach((c) => {
    const k = courseKey(c);
    optionsByCourseKey[k] = eligibleOptions(c);
    byKey[k] = c;
  });

  const reqByCourseKey: Record<string, string> = {};
  const load: Record<string, number> = {};
  const members: Record<string, string[]> = {};
  ALLOC_REQ_CODES.forEach((c) => {
    load[c] = 0;
    members[c] = [];
  });
  const fixed = new Set<string>();

  const place = (k: string, req: string) => {
    reqByCourseKey[k] = req;
    load[req] += courseDistCredits(byKey[k]);
    members[req].push(k);
  };
  const unplace = (k: string) => {
    const req = reqByCourseKey[k];
    if (!req) return;
    load[req] -= courseDistCredits(byKey[k]);
    members[req] = members[req].filter((m) => m !== k);
    delete reqByCourseKey[k];
  };

  if (!auto) {
    candidates.forEach((c) => {
      const k = courseKey(c);
      const ov = overrides[c.code];
      if (ov && optionsByCourseKey[k].includes(ov)) {
        place(k, ov);
        fixed.add(k);
      }
    });
  }

  let caps: Record<string, number> = { ...TARGET };
  const room = (req: string) => (caps[req] ?? 0) - load[req];

  /**
   * Find room for course `k` in one of its requirements, moving other courses
   * along an augmenting path when every requirement it qualifies for is full.
   */
  const tryPlace = (k: string, visited: Set<string>): boolean => {
    const options = optionsByCourseKey[k];
    // Prefer the requirement with the most room, so ties spread evenly.
    const open = options
      .filter((req) => room(req) > EPS)
      .sort((a, b) => room(b) - room(a));
    if (open.length > 0) {
      place(k, open[0]);
      return true;
    }
    for (const req of options) {
      if (visited.has(req)) continue;
      visited.add(req);
      for (const other of [...members[req]]) {
        if (fixed.has(other)) continue;
        // Moving `other` out must actually open room for `k`.
        if (room(req) + courseDistCredits(byKey[other]) <= EPS) continue;
        unplace(other);
        if (tryPlaceElsewhere(other, req, visited)) {
          place(k, req);
          return true;
        }
        place(other, req);
      }
    }
    return false;
  };

  /** Re-place a displaced course anywhere except the requirement it left. */
  const tryPlaceElsewhere = (
    k: string,
    leaving: string,
    visited: Set<string>,
  ): boolean => {
    const saved = optionsByCourseKey[k];
    optionsByCourseKey[k] = saved.filter((r) => r !== leaving);
    try {
      return tryPlace(k, visited);
    } finally {
      optionsByCourseKey[k] = saved;
    }
  };

  // Most-constrained courses first, then a stable order by code.
  const order = (list: Course[]) =>
    list
      .filter((c) => byKey[courseKey(c)])
      .slice()
      .sort(
        (a, b) =>
          optionsByCourseKey[courseKey(a)].length -
            optionsByCourseKey[courseKey(b)].length || byCode(a, b),
      );

  const stages: AllocationStage[] = opts.stages ?? [
    { courses: candidates, caps: TARGET },
  ];
  stages.forEach((stage) => {
    caps = { ...stage.caps };
    order(stage.courses).forEach((c) => {
      const k = courseKey(c);
      if (reqByCourseKey[k]) return;
      tryPlace(k, new Set());
    });
  });

  // Anything still unplaced counts as extra credit toward its first option.
  candidates.forEach((c) => {
    const k = courseKey(c);
    if (!reqByCourseKey[k]) place(k, optionsByCourseKey[k][0]);
  });

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
