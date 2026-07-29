/**
 * Manual requirement assignment on a course.
 * - Majors use `major_id` (legacy + current)
 * - Certificates use `certificate_id`
 * A course should not carry both for exclusivity (cert ↔ major).
 */
export type ManualRequirement = {
  major_id?: string;
  certificate_id?: string;
  requirement_title: string;
};

// src/lib/types.ts
export type Course = {
  id: string;
  code: string;
  grade: string | null;
  semester: string;
  year: number;
  userId: string;
  status: "completed" | "in-progress" | "skipped" | "not-taken";
  credits: number;
  skipped?: boolean; // Add this new property
  manualRequirementsFulfilled?: ManualRequirement[];
  excludedFromRequirements?: ManualRequirement[]; // Courses excluded from fulfilling specific requirements
  distributionals?: string[]; // manually assigned: "Hu", "So", "Sc", "QR", "WR", "L1"-"L5"
};
  
export type Semester = {
  season: string;
  year: number;
  courses: Course[];
};

export type MessageRole = "system" | "user" | "assistant";
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string; // ISO string for Firestore compatibility
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// For CleoAI conversation context summary (stored to avoid re-sending full context)
export interface ConversationContext {
  userSnapshot: {
    name: string;
    email: string;
    graduationYear: number;
    majors: string[];
    certificates?: string[];
  };
  statsSnapshot: {
    gpa: string;
    totalCredits: number;
    completedCourses: number;
  };
  createdAt: string;
}

// Friends feature - public course data (NO grades)
export interface PublicCourse {
  code: string;
  semester: string;
  year: number;
  credits: number;
  status: "completed" | "in-progress" | "skipped";
  skipped?: boolean; // Explicit flag for skipped courses (counts toward requirements)
  manualRequirementsFulfilled?: ManualRequirement[]; // For tracking manually assigned requirements
  distributionals?: string[]; // Hu, So, Sc, QR, WR, L1-L5 — never grades
}

export interface FriendsProfileVisibility {
  showBio?: boolean;
  showStats?: boolean;
  showDistributionals?: boolean;
  showCourses?: boolean;
}

export const DEFAULT_FRIENDS_PROFILE_VISIBILITY: Required<FriendsProfileVisibility> = {
  showBio: true,
  showStats: true,
  showDistributionals: true,
  showCourses: true,
};

export function resolveFriendsProfileVisibility(
  visibility?: FriendsProfileVisibility,
): Required<FriendsProfileVisibility> {
  return {
    showBio: visibility?.showBio ?? true,
    showStats: visibility?.showStats ?? true,
    showDistributionals: visibility?.showDistributionals ?? true,
    showCourses: visibility?.showCourses ?? true,
  };
}

export interface FriendsPublicData {
  userId: string;
  enabled: boolean;
  enabledAt: Date | null;
  updatedAt: Date;
  displayName?: string;
  email?: string;
  photoURL?: string;
  majors: string[];
  certificates?: string[];
  graduationYear?: number;
  bio?: string;
  visibility?: FriendsProfileVisibility;
  courses: PublicCourse[];
}

export interface FriendsLookup {
  users: [string, string];
  createdAt: Date;
}
