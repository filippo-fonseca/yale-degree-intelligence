import type { User } from "firebase/auth";
import { setUserFlag } from "@/lib/userFlags";
import type { UserProfile } from "./types";

interface UseDashboardOverlayActionsOptions {
  user: User | null;
  /** Operator status, resolved server-side via /api/me. */
  isAdmin: boolean;
  hasData: boolean;
  setShowSettings: (open: boolean) => void;
  setShowMajorSelection: (open: boolean) => void;
  setShowUpdateModal: (open: boolean) => void;
  setShowManualEntryModal: (open: boolean) => void;
  setManualEntryPreselectSemester: (semester: string | undefined) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setWelcomeOpen: (open: boolean) => void;
  setTourOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  handleTabChange: (tab: string) => void;
  handleProfileUpdate: (updated: Partial<UserProfile>) => Promise<void>;
  logout: () => void;
}

export function useDashboardOverlayActions({
  user,
  hasData,
  setShowSettings,
  setShowMajorSelection,
  setShowUpdateModal,
  setShowManualEntryModal,
  setManualEntryPreselectSemester,
  setCommandPaletteOpen,
  setWelcomeOpen,
  setTourOpen,
  setActiveTab,
  handleTabChange,
  handleProfileUpdate,
  logout,
  isAdmin,
}: UseDashboardOverlayActionsOptions) {
  return {
    onMajorSelectionComplete: () => setShowMajorSelection(false),
    onCloseSettings: () => setShowSettings(false),
    onProfileSave: async (updated: Partial<UserProfile>) => {
      await handleProfileUpdate(updated);
      setShowSettings(false);
    },
    onReplayTour: () => {
      setShowSettings(false);
      setTourOpen(true);
    },
    onReplayWelcome: () => {
      // Creator-only Dev tool (settings UI is also gated via isAdminEmail).
      if (!user || !isAdmin) return;
      void setUserFlag(user.uid, "hasSeenV3Welcome", false);
      void setUserFlag(user.uid, "hasSeenTutorial", false);
      setShowSettings(false);
      setTourOpen(false);
      setWelcomeOpen(true);
    },
    onReplayTutorial: () => {
      // Creator-only Dev tool (settings UI is also gated via isAdminEmail).
      if (!user || !isAdmin) return;
      void setUserFlag(user.uid, "hasSeenTutorial", false);
      setShowSettings(false);
      setWelcomeOpen(false);
      setTourOpen(true);
    },
    onLogout: () => {
      setShowSettings(false);
      setActiveTab("upload");
      logout();
    },
    onDeleteAccount: async () => {
      if (!user) return;
      const idToken = await user.getIdToken();
      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!response.ok) throw new Error("Failed to delete account");
      setShowSettings(false);
      setActiveTab("upload");
      logout();
    },
    onCloseUpdateModal: () => setShowUpdateModal(false),
    onCloseManualEntry: () => {
      setShowManualEntryModal(false);
      setManualEntryPreselectSemester(undefined);
    },
    onCloseCommandPalette: () => setCommandPaletteOpen(false),
    onImportTranscript: () => {
      handleTabChange("upload");
      if (hasData) setShowUpdateModal(true);
    },
    onManualAdd: () => setShowManualEntryModal(true),
    onCloseWelcome: () => {
      setWelcomeOpen(false);
      if (user?.uid) void setUserFlag(user.uid, "hasSeenV3Welcome");
    },
    onStartTour: () => {
      setWelcomeOpen(false);
      if (user?.uid) void setUserFlag(user.uid, "hasSeenV3Welcome");
      setTourOpen(true);
    },
    onCloseTour: () => {
      setTourOpen(false);
      if (user?.uid) void setUserFlag(user.uid, "hasSeenTutorial");
    },
    onCompleteTour: () => {
      if (user?.uid) void setUserFlag(user.uid, "hasSeenTutorial");
    },
  };
}
