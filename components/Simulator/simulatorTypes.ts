import { Course } from "@/lib/types";
import { MajorProgress, ManualRequirementEntry } from "@/lib/majors";

export interface Semester {
  id: string;
  name: string; // e.g. "Fall 2026"
  courses: Course[];
}

export interface SimulatorProps {
  remainingCourses: Course[];
  completedCourses: Course[];
  graduationYear: number;
  userMajors: string[];
  onRegisterNavCheck?: (fn: ((cb: () => void) => void) | null) => void;
}

export type Plan = {
  name: string;
  semesters: Semester[];
  manualRequirements?: ManualRequirementEntry[];
  createdAt: string; // ISO
  isDefault?: boolean;
  showDistributionals?: boolean;
  showGrades?: boolean;
};

export type PreviewProgressMap = Record<string, MajorProgress>;

export type PlannedCoursePick = Pick<Course, "code" | "status"> & {
  status: "in-progress"; // coerced for preview semantics
};

export type MaybeCreditFields = Partial<{
  credits: number | string;
  credit: number | string;
  units: number | string;
  yaleCredits: number | string;
  ECTS: number | string;
}>;
