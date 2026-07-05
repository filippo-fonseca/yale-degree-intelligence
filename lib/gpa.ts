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
