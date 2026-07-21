"use client";

import { useState } from "react";

import { MajorProgress } from "@/lib/majors";
import { useAuth } from "@/context/AuthContext";
import { Course } from "@/lib/types";
import HeatMapView from "./HeatMapView";
import MajorProgressLoadingSkeleton from "./MajorProgressLoadingSkeleton";
import MajorProgressHeader from "./MajorProgressHeader";
import MajorProgressBar from "./MajorProgressBar";
import MajorProgressSummaryCards from "./MajorProgressSummaryCards";
import MajorProgressTips from "./MajorProgressTips";
import MajorProgressViewSwitcher from "./MajorProgressViewSwitcher";
import MajorProgressBoard from "./MajorProgressBoard";
import MajorProgressModals from "./MajorProgressModals";
import { useMajorViewPreferences } from "./useMajorViewPreferences";
import { useMajorProgressData } from "./useMajorProgressData";
import {
  useMajorCourseHandlers,
  type CourseModalState,
  type ManualCourseModalState,
  type ReqModalState,
} from "./useMajorCourseHandlers";

export default function MajorProgressView({
  selectedMajor,
  progress,
  onRequirementChange,
  courses,
  userMajors = [],
  userCertificates = [],
}: {
  selectedMajor: string;
  progress: MajorProgress;
  onRequirementChange: () => void;
  courses: Course[];
  /** Declared programs, so the manual picker can ask the policy engine. */
  userMajors?: string[];
  userCertificates?: string[];
}) {
  const { user } = useAuth();
  const {
    showInProgressStats,
    setShowInProgressStats,
    view,
    setView,
    mobileColumn,
    setMobileColumn,
  } = useMajorViewPreferences();

  const [forceMajorTipOpen, setForceMajorTipOpen] = useState(false);

  const [manualCourseModal, setManualCourseModal] =
    useState<ManualCourseModalState>({ isOpen: false, requirement: "" });

  const [modalOpen, setModalOpen] = useState<CourseModalState>({
    isOpen: false,
    course: null,
  });

  const [reqModal, setReqModal] = useState<ReqModalState>({
    isOpen: false,
    req: null,
  });

  const {
    handleSkip,
    handleUnskip,
    handleRemoveManualCourse,
    handleOpenCourse,
    handleAddManual,
    openRequirement,
    cardHandlers,
  } = useMajorCourseHandlers({
    user,
    selectedMajor,
    courses,
    onRequirementChange,
    setModalOpen,
    setReqModal,
    setManualCourseModal,
  });

  const {
    completedCredits,
    inProgressCredits,
    totalCredits,
    completionPercentage,
    withInProgressPercentage,
    heatCells,
    columns,
  } = useMajorProgressData(progress, courses, selectedMajor);

  if (!progress) {
    return <MajorProgressLoadingSkeleton />;
  }

  return (
    <div className="space-y-6 font-louize">
      <MajorProgressHeader
        selectedMajor={selectedMajor}
        showInProgressStats={showInProgressStats}
        completionPercentage={completionPercentage}
        withInProgressPercentage={withInProgressPercentage}
      />

      <MajorProgressTips
        forceMajorTipOpen={forceMajorTipOpen}
        setForceMajorTipOpen={setForceMajorTipOpen}
      />

      <MajorProgressBar
        showInProgressStats={showInProgressStats}
        setShowInProgressStats={setShowInProgressStats}
        completionPercentage={completionPercentage}
        withInProgressPercentage={withInProgressPercentage}
      />

      <MajorProgressSummaryCards
        showInProgressStats={showInProgressStats}
        completedCredits={completedCredits}
        inProgressCredits={inProgressCredits}
        totalCredits={totalCredits}
        completionPercentage={completionPercentage}
        withInProgressPercentage={withInProgressPercentage}
      />

      <MajorProgressViewSwitcher view={view} setView={setView} />

      {view === "board" && (
        <MajorProgressBoard
          columns={columns}
          mobileColumn={mobileColumn}
          setMobileColumn={setMobileColumn}
          cardHandlers={cardHandlers}
        />
      )}

      {view === "heatmap" && (
        <div data-tour="major-heatmap-view">
          <HeatMapView cells={heatCells} onOpenRequirement={openRequirement} />
        </div>
      )}

      <MajorProgressModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        manualCourseModal={manualCourseModal}
        setManualCourseModal={setManualCourseModal}
        reqModal={reqModal}
        setReqModal={setReqModal}
        courses={courses}
        userMajors={userMajors}
        userCertificates={userCertificates}
        onRequirementChange={onRequirementChange}
        handleSkip={handleSkip}
        handleUnskip={handleUnskip}
        handleRemoveManualCourse={handleRemoveManualCourse}
        handleOpenCourse={handleOpenCourse}
        handleAddManual={handleAddManual}
      />
    </div>
  );
}
