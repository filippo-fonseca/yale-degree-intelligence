"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import CustomLoader from "@/components/ui/CustomLoader";
import PublicFacingPage from "@/screens/PublicFacingPage";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { createNavItems } from "@/components/dashboard/navItems";
import { useDismissibleFlag } from "@/lib/useDismissibleFlag";
import { useIsAdmin } from "@/lib/useIsAdmin";
import {
  getMajorProgress as computeMajorProgress,
  getCertificateProgress as computeCertificateProgress,
} from "@/components/dashboard/getMajorProgress";
import { useCommandPaletteHotkey } from "@/components/dashboard/useCommandPaletteHotkey";
import { useSidebarState } from "@/components/dashboard/useSidebarState";
import { useOnboarding } from "@/components/dashboard/useOnboarding";
import { useNavNudges } from "@/components/dashboard/useNavNudges";
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
import { useDashboardOverlayActions } from "@/components/dashboard/useDashboardOverlayActions";

export default function Home() {
  const { user, loading, authenticating, logout } = useAuth();
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
    selectedCertificate,
    setSelectedCertificate,
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
    updateCourse,
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

  // Operator status comes from the server, so the admin list stays out of the
  // client bundle. Only gates which dev tools are offered.
  const { isAdmin } = useIsAdmin(user);

  // "New" chip on My certificates, cleared the first time the tab is opened.
  const certificatesNew = useDismissibleFlag("nav:certificates-new");

  // "2030 can use!" chips, each retired the first time its tab is opened.
  const { nudgeTabs, markVisited } = useNavNudges(isBrandNew);

  const navItems = createNavItems(
    userProfile?.majors?.length ?? 0,
    userProfile?.certificates?.length ?? 0,
    { nudgeTabs, showCertificatesNew: certificatesNew.show },
  );

  const { activeTab, setActiveTab, handleTabChange, registerSimulatorNavCheck } =
    useDashboardNav();

  useEffect(() => {
    if (activeTab === "certificate") certificatesNew.dismiss();
  }, [activeTab, certificatesNew]);

  // Retires the chip for whichever tab is open, including the one restored
  // from the last session, so it does not survive until the next click.
  useEffect(() => {
    markVisited(activeTab);
  }, [activeTab, markVisited]);

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

  // The student's declared programs, handed to the certificate policy engine so
  // it can resolve eligibility and per-certificate overlap budgets.
  const programPolicyOptions = {
    majorIds: userProfile?.majors ?? [],
    certificateIds: userProfile?.certificates ?? [],
  };

  const getMajorProgress = () => {
    if (!user || !selectedMajor) return null;
    return computeMajorProgress(selectedMajor, courses, programPolicyOptions);
  };

  const getCertificateProgress = () => {
    if (!user || !selectedCertificate) return null;
    return computeCertificateProgress(
      selectedCertificate,
      courses,
      programPolicyOptions,
    );
  };

  const overlayActions = useDashboardOverlayActions({
    user,
    isAdmin,
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
  });

  // `authenticating` covers the beat between the Google popup closing and the
  // session arriving, so a successful sign-in goes landing -> loader -> app
  // instead of flashing the landing page one more time on the way in.
  if (loading || authenticating || (user && (coursesLoading || profileLoading)))
    return <CustomLoader />;

  if (!user) return <PublicFacingPage />;

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-louize overflow-hidden">
      <DashboardOverlays
        user={user}
        isAdmin={isAdmin}
        userProfile={userProfile}
        courses={courses}
        selectedMajor={selectedMajor}
        selectedCertificate={selectedCertificate}
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
        onMajorSelectionComplete={overlayActions.onMajorSelectionComplete}
        onCloseSettings={overlayActions.onCloseSettings}
        onProfileSave={overlayActions.onProfileSave}
        onToggleFriends={handleToggleFriends}
        onReplayTour={overlayActions.onReplayTour}
        onReplayWelcome={overlayActions.onReplayWelcome}
        onReplayTutorial={overlayActions.onReplayTutorial}
        onLogout={overlayActions.onLogout}
        onDeleteAccount={overlayActions.onDeleteAccount}
        onCloseUpdateModal={overlayActions.onCloseUpdateModal}
        onUploadSuccess={parseAndStoreCourses}
        onCloseManualEntry={overlayActions.onCloseManualEntry}
        onManualCourseEntry={handleManualCourseEntry}
        onCloseCommandPalette={overlayActions.onCloseCommandPalette}
        onNavigate={handleTabChange}
        onImportTranscript={overlayActions.onImportTranscript}
        onManualAdd={overlayActions.onManualAdd}
        onToggleTheme={toggleTheme}
        onCloseWelcome={overlayActions.onCloseWelcome}
        onStartTour={overlayActions.onStartTour}
        onCloseTour={overlayActions.onCloseTour}
        onCompleteTour={overlayActions.onCompleteTour}
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
          isBrandNew={isBrandNew}
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
              user={user}
              userProfile={userProfile}
              courses={courses}
              hasData={hasData}
              coursesLoading={coursesLoading}
              isBrandNew={isBrandNew}
              selectedMajor={selectedMajor}
              selectedCertificate={selectedCertificate}
              friendsEnabled={friendsEnabled}
              getMajorProgress={getMajorProgress}
              getCertificateProgress={getCertificateProgress}
              onTabChange={handleTabChange}
              onSelectMajor={setSelectedMajor}
              onSelectCertificate={setSelectedCertificate}
              onOpenSettings={() => setShowSettings(true)}
              onManualAdd={openManualEntry}
              onReupload={() => setShowUpdateModal(true)}
              onUploadSuccess={parseAndStoreCourses}
              fetchCourses={fetchCourses}
              updateCourse={updateCourse}
              toggleDistributional={toggleDistributional}
              onTogglePrereqOverride={handleTogglePrereqOverride}
              onToggleFriends={handleToggleFriends}
              onRegisterNavCheck={registerSimulatorNavCheck}
            />
          </motion.div>
        </div>
      </div>
    </main>
  );
}
