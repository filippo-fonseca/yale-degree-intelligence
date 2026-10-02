import { ALLOC_REQS } from "@/lib/distributionalAllocation";

const LANGUAGE_LEVELS = ["L1", "L2", "L3", "L4", "L5"] as const;

const REQ_LABELS: Record<string, string> = {
  Hu: "Humanities",
  So: "Social Sciences",
  Sc: "Sciences",
  QR: "Quantitative Reasoning",
  WR: "Writing",
};

export interface DistTallyRequirement {
  key: string;
  label?: string;
  count: number;
  /** Of `count`, the credits that are only planned. */
  planned: number;
  target?: number;
}

export interface DistTallyResult {
  counts: Record<string, number>;
  /** Of `counts`, the credits that are only planned. */
  plannedCounts: Record<string, number>;
  byRequirement: DistTallyRequirement[];
}

/**
 * Assignment entry: plain tag list (1 credit each) or tags with explicit
 * credits. `planned` marks a course that is on the plan but not yet taken.
 */
export type DistTallyInput =
  | string[]
  | { codes: string[]; credits?: number; planned?: boolean };

export function tallyDistributionals(
  assignments: DistTallyInput[],
): DistTallyResult {
  const counts: Record<string, number> = {};
  const plannedCounts: Record<string, number> = {};
  for (const entry of assignments) {
    const codes = Array.isArray(entry) ? entry : entry.codes;
    const credits = Array.isArray(entry) ? 1 : entry.credits ?? 1;
    const planned = !Array.isArray(entry) && !!entry.planned;
    for (const code of codes || []) {
      counts[code] = (counts[code] || 0) + credits;
      if (planned) plannedCounts[code] = (plannedCounts[code] || 0) + credits;
    }
  }

  const byRequirement: DistTallyRequirement[] = ALLOC_REQS.map((r) => ({
    key: r.code,
    label: REQ_LABELS[r.code],
    count: counts[r.code] || 0,
    planned: plannedCounts[r.code] || 0,
    target: r.target,
  }));

  for (const level of LANGUAGE_LEVELS) {
    if (counts[level]) {
      byRequirement.push({
        key: level,
        count: counts[level],
        planned: plannedCounts[level] || 0,
      });
    }
  }

  return { counts, plannedCounts, byRequirement };
}
