import { Course } from "@/lib/types";

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
  const tags = course.distributionals || [];
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
        remaining[ov] = Math.max(0, remaining[ov] - 1);
      } else {
        toMatch.push(c);
      }
    });
  } else {
    candidates.forEach((c) => toMatch.push(c));
  }

  // --- Maximum bipartite matching with per-requirement capacity (Kuhn's). ---
  // Each requirement is expanded into `remaining[req]` open slots.
  const slotKeys: Record<string, string[]> = {};
  const slotOwner: Record<string, string | null> = {};
  ALLOC_REQ_CODES.forEach((req) => {
    slotKeys[req] = [];
    for (let i = 0; i < remaining[req]; i++) {
      const key = `${req}#${i}`;
      slotKeys[req].push(key);
      slotOwner[key] = null;
    }
  });

  const assignedSlot: Record<string, string> = {};

  const augment = (ck: string, visited: Set<string>): boolean => {
    for (const req of optionsByCourseKey[ck]) {
      for (const slot of slotKeys[req]) {
        if (visited.has(slot)) continue;
        visited.add(slot);
        const owner = slotOwner[slot];
        if (owner === null || augment(owner, visited)) {
          slotOwner[slot] = ck;
          assignedSlot[ck] = slot;
          return true;
        }
      }
    }
    return false;
  };

  toMatch.forEach((c) => {
    augment(courseKey(c), new Set<string>());
  });

  // Record matched assignments.
  Object.entries(assignedSlot).forEach(([ck, slot]) => {
    reqByCourseKey[ck] = slot.split("#")[0];
  });

  // Anything still unallocated (slots were full) attaches to its first option.
  toMatch.forEach((c) => {
    const k = courseKey(c);
    if (!reqByCourseKey[k]) {
      reqByCourseKey[k] = optionsByCourseKey[k][0];
    }
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
