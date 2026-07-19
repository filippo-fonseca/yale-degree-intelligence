"use client";

import AddManualCourseModal from "../AddManualCourseModal/AddManualCourseModal";
import { Course } from "@/lib/types";
import CourseModal from "./CourseModal";
import RequirementModal from "./RequirementModal";
import type {
  CourseModalState,
  ManualCourseModalState,
  ReqModalState,
} from "./useMajorCourseHandlers";

export default function MajorProgressModals({
  modalOpen,
  setModalOpen,
  manualCourseModal,
  setManualCourseModal,
  reqModal,
  setReqModal,
  courses,
  onRequirementChange,
  handleSkip,
  handleUnskip,
  handleRemoveManualCourse,
  handleOpenCourse,
  handleAddManual,
}: {
  modalOpen: CourseModalState;
  setModalOpen: React.Dispatch<React.SetStateAction<CourseModalState>>;
  manualCourseModal: ManualCourseModalState;
  setManualCourseModal: React.Dispatch<React.SetStateAction<ManualCourseModalState>>;
  reqModal: ReqModalState;
  setReqModal: React.Dispatch<React.SetStateAction<ReqModalState>>;
  courses: Course[];
  onRequirementChange: () => void;
  handleSkip: (courseCode: string, courseName: string) => Promise<void>;
  handleUnskip: (courseCode: string) => Promise<void>;
  handleRemoveManualCourse: (
    courseCode: string,
    requirementTitle: string,
  ) => Promise<void>;
  handleOpenCourse: (opt: any, reqName: string) => void;
  handleAddManual: (reqName: string) => void;
}) {
  return (
    <>
      <CourseModal
        isOpen={modalOpen.isOpen}
        course={modalOpen.course}
        onClose={() => setModalOpen({ isOpen: false, course: null })}
        onSkip={handleSkip}
        onRefresh={onRequirementChange}
      />

      <AddManualCourseModal
        isOpen={manualCourseModal.isOpen}
        requirement={manualCourseModal.requirement}
        onClose={() => setManualCourseModal({ isOpen: false, requirement: "" })}
        onSuccess={onRequirementChange}
        userCourses={courses}
      />

      <RequirementModal
        isOpen={reqModal.isOpen}
        requirement={reqModal.req}
        onClose={() => setReqModal({ isOpen: false, req: null })}
        onOpenCourse={handleOpenCourse}
        onUnskip={handleUnskip}
        onRemoveManual={handleRemoveManualCourse}
        onAddManual={(reqName) => handleAddManual(reqName)}
        onSkip={handleSkip}
      />
    </>
  );
}
