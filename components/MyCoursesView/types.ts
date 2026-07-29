import { Course } from "@/lib/types";

export interface ConfirmDeleteState {
  open: boolean;
  course: Course | null;
}

export interface CourseModalState {
  isOpen: boolean;
  course: {
    id: string;
    code: string;
    name: string;
    status: "completed" | "in-progress" | "not-taken" | "skipped";
    skipped: boolean;
    distributionals: string[];
  } | null;
}

export interface MyCoursesViewProps {
  courses: Course[];
  hasData: boolean;
  coursesLoading: boolean;
  user: {
    displayName: string | null;
    uid: string;
  } | null;
  isBrandNew: boolean;
  /** Handlers lifted from page.tsx */
  onManualAdd: (semester?: string) => void;
  onReupload: () => void;
  onUploadSuccess: (text: string) => Promise<void>;
  onDeleteCourse: (course: Course) => Promise<void>;
  onToggleDistributional: (courseId: string, dist: string) => Promise<void>;
  /** Class of 2030 shortcut into Simulator without a transcript. */
  onOpenSimulator?: () => void;
}

export type SortKey = "semester" | "code" | "grade" | "credits";
export type StatusFilter = "all" | "completed" | "in-progress" | "skipped";

export interface SemesterOpenPrefs {
  openSemesters: string[];
  knownSemesters: string[];
}
