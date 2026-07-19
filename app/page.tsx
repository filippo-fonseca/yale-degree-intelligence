"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { setUserFlag } from "@/lib/userFlags";
import CustomLoader from "@/components/ui/CustomLoader";
import PublicFacingPage from "@/screens/PublicFacingPage";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import type { UserProfile } from "@/components/dashboard/types";
import { createNavItems } from "@/components/dashboard/navItems";
import { getMajorProgress as computeMajorProgress } from "@/components/dashboard/getMajorProgress";
import { useCommandPaletteHotkey } from "@/components/dashboard/useCommandPaletteHotkey";
import { useSidebarState } from "@/components/dashboard/useSidebarState";
import { useOnboarding } from "@/components/dashboard/useOnboarding";
import { useDashboardNav } from "@/components/dashboard/useDashboardNav";
import { useUserProfile } from "@/components/dashboard/useUserProfile";
import { useFriendsFeature } from "@/components/dashboard/useFriendsFeature";
import { useCoursesData } from "@/components/dashboard/useCoursesData";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MobileSidebar } from "@/components/dashboard/MobileSidebar";
import { DesktopSidebar } from "@/components/dashboard/DesktopSidebar";
import { DashboardTabPanels } from "@/components/dashboard/DashboardTabPanels";
import { DashboardOverlays } from "@/components/dashboard/DashboardOverlays";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [manualEntryPreselectSemester, setManualEntryPreselectSemester] =
    useState<string | undefined>(undefined);

  const {
    userProfile,
    profileLoading,
    selectedMajor,
    setSelectedMajor,
    showMajorSelection,
    setShowMajorSelection,
    isBrandNew,
    handleProfileUpdate,
    handleTogglePrereqOverride,
  } = useUserProfile(user);

  const {
    sidebarOpen,
    setSidebarOpen,
    sidebarPinned,
    setSidebarPinned,
    sidebarHovered,
    setSidebarHovered,
    sidebarExpanded,
  } = useSidebarState();

  const { commandPaletteOpen, setCommandPaletteOpen } =
    useCommandPaletteHotkey();

  const friendsEnabledRef = useRef(false);

  const {
    courses,
    hasData,
    coursesLoading,
    fetchCourses,
    parseAndStoreCourses,
    handleManualCourseEntry,
    toggleDistributional,
  } = useCoursesData({
    user,
    getFriendsEnabled: () => friendsEnabledRef.current,
    userProfile,
    showUpdateModal,
    setShowUpdateModal,
    setShowManualEntryModal,
  });

  const { friendsEnabled, handleToggleFriends } = useFriendsFeature(
    user,
    courses,
    userProfile,
  );
  friendsEnabledRef.current = friendsEnabled;

  const navItems = createNavItems(userProfile?.majors?.length ?? 0);
  const cleoaiComingSoon =
    navItems.find((i) => i.id === "cleoai")?.comingSoon ?? false;

  const { activeTab, setActiveTab, handleTabChange, setSimulatorNavCheck } =
    useDashboardNav(cleoaiComingSoon);

  const { welcomeOpen, setWelcomeOpen, tourOpen, setTourOpen } = useOnboarding(
    user,
    userProfile,
  );

  const [modalOpen, setModalOpen] = useState<{
    isOpen: boolean;
    course: {
      id: string;
      code: string;
      name: string;
      status: "completed" | "in-progress" | "not-taken" | "skipped";
      skipped: boolean;
      distributionals: string[];
    } | null;
  }>({ isOpen: false, course: null });

  const openManualEntry = (semester?: string) => {
    setManualEntryPreselectSemester(semester);
    setShowManualEntryModal(true);
  };

  const getMajorProgress = () => {
    if (!user || !selectedMajor) return null;
    return computeMajorProgress(selectedMajor, courses);
  };

  const onProfileSave = async (updatedProfile: Partial<UserProfile>) => {
    await handleProfileUpdate(updatedProfile);
    setShowSettings(false);
  };

  if (loading || (user && (coursesLoading || profileLoading)))
    return <CustomLoader />;

  if (!user) return <PublicFacingPage />;

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-louize overflow-hidden">
      <DashboardOverlays
        user={user}
        userProfile={userProfile}
        courses={courses}
        selectedMajor={selectedMajor}
        hasData={hasData}
        friendsEnabled={friendsEnabled}
        showMajorSelection={showMajorSelection}
        showSettings={showSettings}
        showUpdateModal={showUpdateModal}
        showManualEntryModal={showManualEntryModal}
        manualEntryPreselectSemester={manualEntryPreselectSemester}
        commandPaletteOpen={commandPaletteOpen}
        welcomeOpen={welcomeOpen}
        tourOpen={tourOpen}
        modalOpen={modalOpen}
        onMajorSelectionComplete={() => setShowMajorSelection(false)}
        onCloseSettings={() => setShowSettings(false)}
        onProfileSave={onProfileSave}
        onToggleFriends={handleToggleFriends}
        onReplayTour={() => {
          setShowSettings(false);
          setTourOpen(true);
        }}
        onReplayWelcome={() => {
          if (user) {
            void setUserFlag(user.uid, "hasSeenV3Welcome", false);
            void setUserFlag(user.uid, "hasSeenTutorial", false);
          }
          setShowSettings(false);
          setTourOpen(false);
          setWelcomeOpen(true);
        }}
        onReplayTutorial={() => {
          if (user) void setUserFlag(user.uid, "hasSeenTutorial", false);
          setShowSettings(false);
          setWelcomeOpen(false);
          setTourOpen(true);
        }}
        onLogout={() => {
          setShowSettings(false);
          setActiveTab("upload");
          logout();
        }}
        onDeleteAccount={async () => {
          const idToken = await user.getIdToken();
          const response = await fetch("/api/delete-account", {
            method: "POST",
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (!response.ok) throw new Error("Failed to delete account");
          setShowSettings(false);
          setActiveTab("upload");
          logout();
        }}
        onCloseUpdateModal={() => setShowUpdateModal(false)}
        onUploadSuccess={parseAndStoreCourses}
        onCloseManualEntry={() => {
          setShowManualEntryModal(false);
          setManualEntryPreselectSemester(undefined);
        }}
        onManualCourseEntry={handleManualCourseEntry}
        onCloseCommandPalette={() => setCommandPaletteOpen(false)}
        onNavigate={handleTabChange}
        onImportTranscript={() => {
          handleTabChange("upload");
          if (hasData) setShowUpdateModal(true);
        }}
        onManualAdd={() => setShowManualEntryModal(true)}
        onToggleTheme={toggleTheme}
        onCloseWelcome={() => {
          setWelcomeOpen(false);
          void setUserFlag(user.uid, "hasSeenV3Welcome");
        }}
        onStartTour={() => {
          setWelcomeOpen(false);
          void setUserFlag(user.uid, "hasSeenV3Welcome");
          setTourOpen(true);
        }}
        onCloseTour={() => {
          setTourOpen(false);
          void setUserFlag(user.uid, "hasSeenTutorial");
        }}
        onCompleteTour={() => {
          void setUserFlag(user.uid, "hasSeenTutorial");
        }}
        onCloseCourseModal={() => setModalOpen({ isOpen: false, course: null })}
        onToggleDistributional={(courseId, dist) => {
          void toggleDistributional(courseId, dist);
        }}
        onUpdateModalCourseDistributional={(courseId, dist) => {
          setModalOpen((prev) => {
            if (!prev.course || prev.course.id !== courseId) return prev;
            const currentDists = prev.course.distributionals || [];
            const newDists = currentDists.includes(dist)
              ? currentDists.filter((d) => d !== dist)
              : [...currentDists, dist];
            return {
              ...prev,
              course: { ...prev.course, distributionals: newDists },
            };
          });
        }}
      />

      <DashboardBackground />

      <div className="relative max-w-7xl mx-auto px-4 lg:px-6">
        <DashboardHeader
          user={user}
          resolvedTheme={resolvedTheme}
          onOpenSidebar={() => setSidebarOpen(true)}
          onGoHome={() => setActiveTab("upload")}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setShowSettings(true)}
        />

        <div className="flex flex-row gap-4 lg:gap-8 pb-4 lg:pb-8 h-[calc(100vh-88px)] lg:h-[calc(100vh-120px)]">
          <MobileSidebar
            open={sidebarOpen}
            user={user}
            navItems={navItems}
            activeTab={activeTab}
            onClose={() => setSidebarOpen(false)}
            onTabChange={handleTabChange}
            onOpenSettings={() => setShowSettings(true)}
          />

          <DesktopSidebar
            navItems={navItems}
            activeTab={activeTab}
            sidebarExpanded={sidebarExpanded}
            sidebarPinned={sidebarPinned}
            onTabChange={handleTabChange}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            onTogglePinned={setSidebarPinned}
            onMouseEnter={() => setSidebarHovered(true)}
            onMouseLeave={() => setSidebarHovered(false)}
            onClearHover={() => setSidebarHovered(false)}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-clip"
          >
            <DashboardTabPanels
              activeTab={activeTab}
              cleoaiComingSoon={cleoaiComingSoon}
              user={user}
              userProfile={userProfile}
              courses={courses}
              hasData={hasData}
              coursesLoading={coursesLoading}
              isBrandNew={isBrandNew}
              selectedMajor={selectedMajor}
              friendsEnabled={friendsEnabled}
              getMajorProgress={getMajorProgress}
              onTabChange={handleTabChange}
              onSelectMajor={setSelectedMajor}
              onManualAdd={openManualEntry}
              onReupload={() => setShowUpdateModal(true)}
              onUploadSuccess={parseAndStoreCourses}
              fetchCourses={fetchCourses}
              toggleDistributional={toggleDistributional}
              onTogglePrereqOverride={handleTogglePrereqOverride}
              onToggleFriends={handleToggleFriends}
              onRegisterNavCheck={setSimulatorNavCheck}
            />
          </motion.div>
        </div>
      </div>
    </main>
  );
}
