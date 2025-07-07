export type Course = {
    id: string;
    code: string;
    name: string;
    grade: string | null; // null for in-progress courses
    semester: string;
    year: number;
    userId: string;
    status: 'completed' | 'in-progress';
  };
  
  export type Semester = {
    season: string;
    year: number;
    courses: Course[];
  };