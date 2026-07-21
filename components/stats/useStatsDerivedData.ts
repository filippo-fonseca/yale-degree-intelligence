import { useMemo } from "react";
import { Course } from "@/lib/types";
import { gradePoints } from "@/lib/constants";
import { computeGPA } from "@/lib/gpa";
import {
  getGPAEligibleCourses,
  getInProgressCount,
  toGPAEntry,
  gradeDistributionColor,
} from "@/lib/utils/academicStats";
import { getCourseDepartmentFromCode } from "@/lib/courseCatalog";
import { DEPT_COLORS, seasonOrder } from "./chartTheme";

export interface SemesterDataEntry {
  semester: string;
  gpa: number;
  credits: number;
  courseCount: number;
}

export interface CumulativeDataEntry {
  semester: string;
  cumulativeGpa: number;
  credits: number;
}

export interface DepartmentDataEntry {
  department: string;
  gpa: number;
  credits: number;
  courseCount: number;
}

export interface GradeDistributionEntry {
  grade: string;
  count: number;
}

export interface CreditPieDatum {
  id: number;
  value: number;
  label: string;
  color: string;
}

export interface GradePieData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
    borderColor: string[];
    borderWidth: number;
  }[];
}

export interface StatsDerivedData {
  activeCourses: Course[];
  inProgressCount: number;
  overallGpa: number;
  summary: {
    totalCredits: number;
    totalGradePoints: number;
  };
  gradeDistribution: GradeDistributionEntry[];
  filteredGradeDistribution: GradeDistributionEntry[];
  sortedSemData: SemesterDataEntry[];
  cumulativeData: CumulativeDataEntry[];
  departmentData: DepartmentDataEntry[];
  progressToGraduation: number;
  bestSem: SemesterDataEntry | null;
  avgCreditsPerSem: number;
  gpaDelta: number;
  creditPieData: CreditPieDatum[];
  gradePieData: GradePieData;
  cumulativeGpas: number[];
  semesterGpas: number[];
  canRenderCumulativeChart: boolean;
  canRenderSemesterChart: boolean;
  nonSummerSems: SemesterDataEntry[];
}

export function useStatsDerivedData(
  courses: Course[],
  pieBorderColor: string,
): StatsDerivedData {
  return useMemo(() => {
    const activeCourses = getGPAEligibleCourses(courses);
    const inProgressCount = getInProgressCount(courses);
    const gpaResult = computeGPA(activeCourses.map(toGPAEntry));
    const overallGpa = gpaResult.gpa ?? 0;
    const summary = {
      totalCredits: gpaResult.gradedCredits,
      totalGradePoints:
        gpaResult.gpa != null ? gpaResult.gpa * gpaResult.gradedCredits : 0,
    };

    const allGrades = Object.keys(gradePoints);
    const gradeDistribution = allGrades.map((grade) => {
      const count = activeCourses.filter((c) => c.grade === grade).length;
      return { grade, count };
    });
    const filteredGradeDistribution = gradeDistribution.filter((g) => g.count > 0);

    const semesterGroups = activeCourses.reduce(
      (acc, c) => {
        const key = `${c.semester} ${c.year}`;
        if (!acc[key]) acc[key] = { credits: 0, points: 0, courses: [] };
        acc[key].credits += c.credits;
        acc[key].points += gradePoints[c.grade!] * c.credits;
        acc[key].courses.push(c);
        return acc;
      },
      {} as Record<string, { credits: number; points: number; courses: Course[] }>,
    );

    const semesterData = Object.entries(semesterGroups)
      .map(([semester, { credits, points, courses: semCourses }]) => ({
        semester,
        gpa: credits > 0 ? parseFloat((points / credits).toFixed(2)) : 0,
        credits,
        courseCount: semCourses.length,
      }))
      .filter((item) => item.credits > 0);

    const sortedSemData = semesterData.sort((a, b) => {
      const [sa, ya] = a.semester.split(" ");
      const [sb, yb] = b.semester.split(" ");
      const na = +ya,
        nb = +yb;
      if (na !== nb) return na - nb;
      return (seasonOrder[sa] || 0) - (seasonOrder[sb] || 0);
    });

    let cumCreds = 0,
      cumPts = 0;
    const cumulativeData = sortedSemData.map((entry) => {
      const semCourses = activeCourses.filter(
        (c) => `${c.semester} ${c.year}` === entry.semester,
      );
      const sc = semCourses.reduce((s, c) => s + c.credits, 0);
      const sp = semCourses.reduce(
        (s, c) => s + gradePoints[c.grade!] * c.credits,
        0,
      );
      cumCreds += sc;
      cumPts += sp;
      return {
        semester: entry.semester,
        cumulativeGpa: parseFloat((cumPts / cumCreds).toFixed(2)),
        credits: cumCreds,
      };
    });

    const departmentData = Object.entries(
      activeCourses.reduce(
        (acc, c) => {
          const prefix = c.code.split(" ")[0];
          const dept =
            getCourseDepartmentFromCode(c.code) ??
            (prefix === "EENG" ? "ECE" : prefix);
          if (!acc[dept]) acc[dept] = { creds: 0, pts: 0, count: 0 };
          acc[dept].creds += c.credits;
          acc[dept].pts += gradePoints[c.grade!] * c.credits;
          acc[dept].count += 1;
          return acc;
        },
        {} as Record<string, { creds: number; pts: number; count: number }>,
      ),
    )
      .map(([dept, d]) => ({
        department: dept,
        gpa: d.creds > 0 ? parseFloat((d.pts / d.creds).toFixed(2)) : 0,
        credits: d.creds,
        courseCount: d.count,
      }))
      .filter((dept) => dept.credits > 0)
      .sort((a, b) => b.credits - a.credits);

    const progressToGraduation = Math.min(100, (summary.totalCredits / 36) * 100);

    const nonSummerSems = sortedSemData.filter(
      (s) => !s.semester.includes("Summer"),
    );
    const bestSem =
      nonSummerSems.length > 0
        ? nonSummerSems.reduce((best, s) => (s.gpa > best.gpa ? s : best))
        : null;

    const avgCreditsPerSem =
      nonSummerSems.length > 0
        ? nonSummerSems.reduce((acc, s) => acc + s.credits, 0) /
          nonSummerSems.length
        : 0;

    const gpaDelta =
      cumulativeData.length > 1
        ? cumulativeData[cumulativeData.length - 1].cumulativeGpa -
          cumulativeData[cumulativeData.length - 2].cumulativeGpa
        : 0;

    const creditPieData = departmentData.map((d, i) => ({
      id: i,
      value: d.credits,
      label: d.department,
      color: DEPT_COLORS[i % DEPT_COLORS.length],
    }));

    const gradePieData = {
      labels: filteredGradeDistribution.map((g) => g.grade),
      datasets: [
        {
          data: filteredGradeDistribution.map((g) => g.count),
          backgroundColor: filteredGradeDistribution.map((g) =>
            gradeDistributionColor(g.grade),
          ),
          borderColor: Array(filteredGradeDistribution.length).fill(pieBorderColor),
          borderWidth: 2,
        },
      ],
    };

    const cumulativeGpas = cumulativeData.map((d) => d.cumulativeGpa);
    const semesterGpas = sortedSemData.map((d) => d.gpa);
    const canRenderCumulativeChart =
      cumulativeGpas.length >= 2 && cumulativeGpas.every(Number.isFinite);
    const canRenderSemesterChart =
      semesterGpas.length > 0 && semesterGpas.every(Number.isFinite);

    return {
      activeCourses,
      inProgressCount,
      overallGpa,
      summary,
      gradeDistribution,
      filteredGradeDistribution,
      sortedSemData,
      cumulativeData,
      departmentData,
      progressToGraduation,
      bestSem,
      avgCreditsPerSem,
      gpaDelta,
      creditPieData,
      gradePieData,
      cumulativeGpas,
      semesterGpas,
      canRenderCumulativeChart,
      canRenderSemesterChart,
      nonSummerSems,
    };
  }, [courses, pieBorderColor]);
}
