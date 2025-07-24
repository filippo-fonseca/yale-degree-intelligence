export type ManualRequirement = {
  major_id: string;
  requirement_title: string;
}

// src/lib/types.ts
export type Course = {
  id: string;
  code: string;
  grade: string | null;
  semester: string;
  year: number;
  userId: string;
  status: "completed" | "in-progress";
  credits: number;
  skipped?: boolean; // Add this new property
  manualRequirementsFulfilled?: ManualRequirement[];
};
  
export type Semester = {
  season: string;
  year: number;
  courses: Course[];
};