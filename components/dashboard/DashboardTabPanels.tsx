"use client";

import type { User } from "firebase/auth";
import { AnimatePresence } from "framer-motion";
import { Course } from "@/lib/types";
import { computeAcademicStatsSummary } from "@/lib/utils/academicStats";
import type { MajorProgress } from "@/lib/majors";
import type { UserProfile } from "./types";
import { UploadTabPanel } from "./UploadTabPanel";
import { StatsTabPanel } from "./StatsTabPanel";
import { MajorTabPanel } from "./MajorTabPanel";
import { SimulatorTabPanel } from "./SimulatorTabPanel";
import { DistributionalsTabPanel } from "./DistributionalsTabPanel";
import { FriendsTabPanel } from "./FriendsTabPanel";
import { CleoAITabPanel } from "./CleoAITabPanel";

interface DashboardTabPanelsProps {
  activeTab: string;
  cleoaiComingSoon: boolean;
  user: User;
  userProfile: UserProfile | null;
  courses: Course[];
  hasData: boolean;
  coursesLoading: boolean;
  isBrandNew: boolean;
  selectedMajor: string;
  friendsEnabled: boolean;
  getMajorProgress: () => MajorProgress | null;
  onTabChange: (tab: string) => void;
  onSelectMajor: (major: string) => void;
  onManualAdd: (semester?: string) => void;
  onReupload: () => void;
  onUploadSuccess: (extractedText: string) => Promise<void>;
  fetchCourses: () => Promise<void>;
  toggleDistributional: (courseId: string, dist: string) => Promise<void>;
  onTogglePrereqOverride: (code: string) => void;
  onToggleFriends: (enabled: boolean) => Promise<void>;
  onRegisterNavCheck: (
    check: ((callback: () => void) => void) | null,
  ) => void;
}

export function DashboardTabPanels({
  activeTab,
  cleoaiComingSoon,
  user,
  userProfile,
  courses,
  hasData,
  coursesLoading,
  isBrandNew,
  selectedMajor,
  friendsEnabled,
  getMajorProgress,
  onTabChange,
  onSelectMajor,
  onManualAdd,
  onReupload,
  onUploadSuccess,
  fetchCourses,
  toggleDistributional,
  onTogglePrereqOverride,
  onToggleFriends,
  onRegisterNavCheck,
}: DashboardTabPanelsProps) {
  const stats = computeAcademicStatsSummary(courses);

  return (
    <AnimatePresence mode="wait">
      {activeTab === "upload" && (
        <UploadTabPanel
          user={user}
          courses={courses}
          hasData={hasData}
          coursesLoading={coursesLoading}
          isBrandNew={isBrandNew}
          onManualAdd={onManualAdd}
          onReupload={onReupload}
          onUploadSuccess={onUploadSuccess}
          fetchCourses={fetchCourses}
          toggleDistributional={toggleDistributional}
        />
      )}
      {activeTab === "stats" && (
        <StatsTabPanel
          courses={courses}
          hasData={hasData}
          onGoToCourses={() => onTabChange("upload")}
        />
      )}
      {activeTab === "major" && (
        <MajorTabPanel
          user={user}
          userProfile={userProfile}
          courses={courses}
          selectedMajor={selectedMajor}
          onSelectMajor={onSelectMajor}
          getMajorProgress={getMajorProgress}
          onRequirementChange={fetchCourses}
          onTogglePrereqOverride={onTogglePrereqOverride}
        />
      )}
      {activeTab === "simulator" && userProfile && (
        <SimulatorTabPanel
          userId={user.uid}
          userProfile={userProfile}
          courses={courses}
          onRegisterNavCheck={onRegisterNavCheck}
        />
      )}
      {activeTab === "distributionals" && (
        <DistributionalsTabPanel
          courses={courses}
          hasData={hasData}
          onGoToCourses={() => onTabChange("upload")}
        />
      )}
      {activeTab === "friends" && (
        <FriendsTabPanel
          courses={courses}
          hasData={hasData}
          friendsEnabled={friendsEnabled}
          userProfile={userProfile}
          onGoToCourses={() => onTabChange("upload")}
          onToggleFriends={onToggleFriends}
        />
      )}
      {activeTab === "cleoai" && !cleoaiComingSoon && (
        <CleoAITabPanel
          courses={courses}
          selectedMajor={selectedMajor}
          userProfile={userProfile}
          stats={stats}
        />
      )}
    </AnimatePresence>
  );
}
