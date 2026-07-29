export interface UserProfile {
  majors: string[];
  certificates?: string[];
  graduationYear: number;
  updatedAt: Date;
  bio?: string;
  // Shared courses the user has manually marked as prerequisites, which are
  // exempt from the cross-major overlap warning (Yale's prereq data is spotty).
  prereqOverrides?: string[];
  // Onboarding flags: whether the user has seen the guided tour and the v3
  // welcome modal. Persisted so we don't re-show them on every visit.
  hasSeenTutorial?: boolean;
  hasSeenV3Welcome?: boolean;
}
