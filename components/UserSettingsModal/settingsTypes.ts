import { User } from "firebase/auth";

/**
 * The stored profile as it arrives from the caller. `certificates` is optional
 * because the Firestore document predates certificates, so older documents
 * simply do not carry the field.
 */
export interface UserProfile {
  majors: string[];
  certificates?: string[];
  graduationYear: number;
  bio?: string;
  updatedAt: Date;
}

/** Local editing state, where the certificate list is always materialized. */
export type EditableProfile = UserProfile & { certificates: string[] };

export interface UserSettingsModalProps {
  user: User;
  userProfile: UserProfile | null;
  friendsEnabled: boolean;
  onClose: () => void;
  onSave: (updatedProfile: Partial<UserProfile>) => Promise<void>;
  onToggleFriends: (enabled: boolean) => Promise<void>;
  onLogout: () => void;
  onDeleteAccount: () => Promise<void>;
  onReplayTour?: () => void;
  /** Dev-only: reset both onboarding flags and replay the new-user welcome. */
  onReplayWelcome?: () => void;
  /** Dev-only: reset the tutorial flag and replay the guided tour. */
  onReplayTutorial?: () => void;
}
