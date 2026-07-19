import { User } from "firebase/auth";

export interface UserProfile {
  majors: string[];
  graduationYear: number;
  bio?: string;
  updatedAt: Date;
  danWriteActionsEnabled?: boolean;
}

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
