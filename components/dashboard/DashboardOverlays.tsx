"use client";

import type { User } from "firebase/auth";
import { Course } from "@/lib/types";
import { setUserFlag } from "@/lib/userFlags";
import UserSettingsModal from "@/components/UserSettingsModal/UserSettingsModal";
import CommandPalette from "@/components/CommandPalette/CommandPalette";
import V3WelcomeModal from "@/components/V3Welcome/V3WelcomeModal";
import AppTour from "@/components/Tutorial/AppTour";
import ManualCourseEntryModal from "@/components/ManualCourseEntryModal";
import CourseModal from "@/components/MajorProgressView/CourseModal";
import { MajorSelectionFlow } from "./dynamicTabs";
import { UpdateTranscriptModal } from "./UpdateTranscriptModal";
import type { UserProfile } from "./types";

interface DashboardOverlaysProps {
  user: User;
  userProfile: UserProfile | null;
  courses: Course[];
  selectedMajor: string;
  selectedCertificate: string;
  hasData: boolean;
  friendsEnabled: boolean;
  showMajorSelection: boolean;
  showSettings: boolean;
  showUpdateModal: boolean;
  showManualEntryModal: boolean;
  manualEntryPreselectSemester?: string;
  commandPaletteOpen: boolean;
  welcomeOpen: boolean;
  tourOpen: boolean;
  modalOpen: {
    isOpen: boolean;
    course: {
      id: string;
      code: string;
      name: string;
      status: "completed" | "in-progress" | "not-taken" | "skipped";
      skipped: boolean;
      distributionals: string[];
    } | null;
  };
  onMajorSelectionComplete: () => void;
  onCloseSettings: () => void;
  onProfileSave: (updated: Partial<UserProfile>) => Promise<void>;
  onToggleFriends: (enabled: boolean) => Promise<void>;
  onReplayTour: () => void;
  onReplayWelcome: () => void;
  onReplayTutorial: () => void;
  onLogout: () => void;
  onDeleteAccount: () => Promise<void>;
  onCloseUpdateModal: () => void;
  onUploadSuccess: (extractedText: string) => Promise<void>;
  onCloseManualEntry: () => void;
  onManualCourseEntry: (courses: Omit<Course, "id">[]) => Promise<void>;
  onCloseCommandPalette: () => void;
  onNavigate: (tabId: string) => void;
  onImportTranscript: () => void;
  onManualAdd: () => void;
  onToggleTheme: () => void;
  onCloseWelcome: () => void;
  onStartTour: () => void;
  onCloseTour: () => void;
  onCompleteTour: () => void;
  onCloseCourseModal: () => void;
  onToggleDistributional: (courseId: string, dist: string) => void;
  onUpdateModalCourseDistributional: (
    courseId: string,
    dist: string,
  ) => void;
}

export function DashboardOverlays({
  user,
  userProfile,
  courses,
  selectedMajor,
  selectedCertificate,
  hasData,
  friendsEnabled,
  showMajorSelection,
  showSettings,
  showUpdateModal,
  showManualEntryModal,
  manualEntryPreselectSemester,
  commandPaletteOpen,
  welcomeOpen,
  tourOpen,
  modalOpen,
  onMajorSelectionComplete,
  onCloseSettings,
  onProfileSave,
  onToggleFriends,
  onReplayTour,
  onReplayWelcome,
  onReplayTutorial,
  onLogout,
  onDeleteAccount,
  onCloseUpdateModal,
  onUploadSuccess,
  onCloseManualEntry,
  onManualCourseEntry,
  onCloseCommandPalette,
  onNavigate,
  onImportTranscript,
  onManualAdd,
  onToggleTheme,
  onCloseWelcome,
  onStartTour,
  onCloseTour,
  onCompleteTour,
  onCloseCourseModal,
  onToggleDistributional,
  onUpdateModalCourseDistributional,
}: DashboardOverlaysProps) {
  return (
    <>
      {showMajorSelection && (
        <MajorSelectionFlow onComplete={onMajorSelectionComplete} />
      )}

      {showSettings && userProfile && (
        <UserSettingsModal
          user={user}
          userProfile={userProfile}
          friendsEnabled={friendsEnabled}
          onClose={onCloseSettings}
          onSave={onProfileSave}
          onToggleFriends={onToggleFriends}
          onReplayTour={onReplayTour}
          onReplayWelcome={onReplayWelcome}
          onReplayTutorial={onReplayTutorial}
          onLogout={onLogout}
          onDeleteAccount={onDeleteAccount}
        />
      )}

      <UpdateTranscriptModal
        open={showUpdateModal}
        onClose={onCloseUpdateModal}
        onUploadSuccess={onUploadSuccess}
      />

      <ManualCourseEntryModal
        isOpen={showManualEntryModal}
        onClose={onCloseManualEntry}
        onSubmit={onManualCourseEntry}
        userId={user.uid}
        initialSemester={manualEntryPreselectSemester}
      />

      <CourseModal
        isOpen={modalOpen.isOpen}
        course={modalOpen.course}
        onClose={onCloseCourseModal}
        allowSkip={false}
        onToggleDistributional={(courseId, dist) => {
          onToggleDistributional(courseId, dist);
          onUpdateModalCourseDistributional(courseId, dist);
        }}
      />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={onCloseCommandPalette}
        courses={courses}
        selectedMajor={selectedMajor}
        selectedCertificate={selectedCertificate}
        hasData={hasData}
        onNavigate={onNavigate}
        onImportTranscript={onImportTranscript}
        onManualAdd={onManualAdd}
        onToggleTheme={onToggleTheme}
      />

      <V3WelcomeModal
        open={welcomeOpen}
        onClose={onCloseWelcome}
        onStartTour={onStartTour}
      />

      <AppTour
        open={tourOpen}
        onClose={onCloseTour}
        onComplete={onCompleteTour}
        onNavigate={onNavigate}
      />
    </>
  );
}
