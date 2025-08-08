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
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}
