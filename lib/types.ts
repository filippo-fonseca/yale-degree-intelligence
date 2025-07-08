// src/lib/types.ts
export type Course = {
  id: string;
  code: string;
  name: string;
  grade: string | null;
  semester: string;
  year: number;
  userId: string;
  status: "completed" | "in-progress";
  credits: number;
};
  
export type Semester = {
  season: string;
  year: number;
  courses: Course[];
};