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
  status: "completed" | "in-progress" | "skipped" | "not-taken";
  credits: number;
  skipped?: boolean; // Add this new property
  manualRequirementsFulfilled?: ManualRequirement[];
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
  };
  statsSnapshot: {
    gpa: string;
    totalCredits: number;
    completedCourses: number;
  };
  createdAt: string;
}
