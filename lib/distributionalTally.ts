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
  target?: number;
}

export interface DistTallyResult {
  counts: Record<string, number>;
  byRequirement: DistTallyRequirement[];
}

export function tallyDistributionals(assignments: string[][]): DistTallyResult {
  const counts: Record<string, number> = {};
  for (const codes of assignments) {
    for (const code of codes || []) {
      counts[code] = (counts[code] || 0) + 1;
    }
  }

  const byRequirement: DistTallyRequirement[] = ALLOC_REQS.map((r) => ({
    key: r.code,
    label: REQ_LABELS[r.code],
    count: counts[r.code] || 0,
    target: r.target,
  }));

  for (const level of LANGUAGE_LEVELS) {
    if (counts[level]) {
      byRequirement.push({ key: level, count: counts[level] });
    }
  }

  return { counts, byRequirement };
}
