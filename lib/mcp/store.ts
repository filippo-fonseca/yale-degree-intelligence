/**
 * Per-student data access for the MCP tools. SERVER ONLY.
 *
 * A DegreeStore is constructed for exactly one uid, taken from the verified
 * access token, and every method is scoped to it. Tools never receive a uid
 * from their arguments, so one student's agent cannot name another student's
 * data: a course id that belongs to someone else reads as "not found".
 *
 * Two implementations: Firestore (Admin SDK, production) and memory (tests).
 */
import type { Course } from "@/lib/types";
import type { Plan } from "@/components/Simulator/planTypes";

/** The fields of users/{uid} the tools read and write. */
export type UserDoc = {
  displayName?: string;
  email?: string;
  photoURL?: string;
  majors?: string[];
  certificates?: string[];
  graduationYear?: number;
  bio?: string;
  prereqOverrides?: string[];
  distributionalAutoAllocate?: boolean;
  distributionalAllocations?: Record<string, string>;
  englishSatisfiesLanguage?: boolean;
  savedPlans?: Plan[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type NewCourse = Omit<Course, "id">;

export interface DegreeStore {
  readonly uid: string;
  getUser(): Promise<UserDoc | null>;
  /** Merge-writes top-level fields of the user document. */
  updateUser(patch: Partial<UserDoc>): Promise<void>;
  /**
   * Read-modify-write of the user document in a transaction, so a plan edit
   * cannot clobber a concurrent edit from the app or another agent.
   */
  transactUser<T>(
    fn: (current: UserDoc | null) => { patch: Partial<UserDoc> | null; result: T },
  ): Promise<T>;

  listCourses(): Promise<Course[]>;
  /** Creates courses; a provided id is used as the document id (placed-out courses). */
  createCourses(courses: Array<NewCourse & { id?: string }>): Promise<string[]>;
  /** `remove` lists optional fields to delete rather than set. */
  updateCourse(id: string, patch: Partial<NewCourse>, remove?: (keyof NewCourse)[]): Promise<void>;
  deleteCourses(ids: string[]): Promise<void>;

  /** Keeps the friend-facing projection current after a write, when it is on. */
  afterWrite(): Promise<void>;
}

export class NotFoundError extends Error {}
