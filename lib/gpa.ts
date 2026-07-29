import { gradePoints } from "@/lib/constants";

export interface GPAEntry {
  grade: string | null;
  credits: number;
}

export interface GPAResult {
  gpa: number | null;
  totalCredits: number;
  gradedCredits: number;
}

export function computeGPA(entries: GPAEntry[]): GPAResult {
  let totalCredits = 0;
  let gradedCredits = 0;
  let weightedPoints = 0;

  for (const { grade, credits } of entries) {
    const c = typeof credits === "number" && credits > 0 ? credits : 0;
    totalCredits += c;
    if (grade != null && grade in gradePoints && c > 0) {
      gradedCredits += c;
      weightedPoints += gradePoints[grade] * c;
    }
  }

  const gpa =
    gradedCredits > 0 ? Math.round((weightedPoints / gradedCredits) * 100) / 100 : null;

  return { gpa, totalCredits, gradedCredits };
}

export function computeProjectedGPA(
  completed: GPAEntry[],
  planned: GPAEntry[],
): { cumulative: GPAResult; plannedOnly: GPAResult } {
  return {
    cumulative: computeGPA([...completed, ...planned]),
    plannedOnly: computeGPA(planned),
  };
}

export interface GPATimelineTerm {
  key: string;
  label: string;
  kind: "completed" | "planned" | "mixed";
  termGPA: GPAResult; // GPA of this term's entries
  cumulativeGPA: GPAResult; // running GPA of all entries up to & including this term
  hasPlanned: boolean;
}

export interface GPATimeline {
  terms: GPATimelineTerm[];
  baseline: GPAResult; // cumulative of COMPLETED entries only
  projected: GPAResult; // cumulative of ALL entries
  delta: number | null; // round2(projected.gpa - baseline.gpa) or null
}

// Pure. `terms` must arrive chronologically ordered.
export function computeGPATimeline(
  terms: { key: string; label: string; completed: GPAEntry[]; planned: GPAEntry[] }[],
): GPATimeline {
  const running: GPAEntry[] = [];
  const timelineTerms: GPATimelineTerm[] = terms.map((t) => {
    const entries = [...t.completed, ...t.planned];
    running.push(...entries);
    const hasCompleted = t.completed.length > 0;
    const hasPlanned = t.planned.length > 0;
    const kind: GPATimelineTerm["kind"] =
      hasCompleted && hasPlanned ? "mixed" : hasPlanned ? "planned" : "completed";
    return {
      key: t.key,
      label: t.label,
      kind,
      termGPA: computeGPA(entries),
      cumulativeGPA: computeGPA([...running]),
      hasPlanned,
    };
  });

  const baseline = computeGPA(terms.flatMap((t) => t.completed));
  const projected = computeGPA(terms.flatMap((t) => [...t.completed, ...t.planned]));
  const delta =
    baseline.gpa == null || projected.gpa == null
      ? null
      : Math.round((projected.gpa - baseline.gpa) * 100) / 100;

  return { terms: timelineTerms, baseline, projected, delta };
}
