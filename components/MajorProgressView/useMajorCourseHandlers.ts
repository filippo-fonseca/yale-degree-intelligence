"use client";

import { useCallback } from "react";
import { setDoc, doc } from "firebase/firestore";
import toast from "react-hot-toast";

import { db } from "@/config/firebase";
import { Course } from "@/lib/types";
import { getCourseInfo } from "@/lib/courseCatalog";
import { skipCourse, unskipCourse } from "@/lib/utils/courseOperations";
import type { Requirement } from "./RequirementModal";
import type { RequirementCardHandlers } from "./RequirementCard";

export type CourseModalState = {
  isOpen: boolean;
  course: {
    code: string;
    name: string;
    status: "completed" | "in-progress" | "not-taken" | "skipped";
    skipped: boolean;
  } | null;
};

export type ReqModalState = {
  isOpen: boolean;
  req: Requirement | null;
};

export type ManualCourseModalState = {
  isOpen: boolean;
  requirement: string;
};

type UseMajorCourseHandlersArgs = {
  user: { uid: string } | null;
  selectedMajor: string;
  courses: Course[];
  onRequirementChange: () => void;
  setModalOpen: React.Dispatch<React.SetStateAction<CourseModalState>>;
  setReqModal: React.Dispatch<React.SetStateAction<ReqModalState>>;
  setManualCourseModal: React.Dispatch<React.SetStateAction<ManualCourseModalState>>;
};

export function useMajorCourseHandlers({
  user,
  selectedMajor,
  courses,
  onRequirementChange,
  setModalOpen,
  setReqModal,
  setManualCourseModal,
}: UseMajorCourseHandlersArgs) {
  const findCourseByCode = useCallback(
    (courseCode: string) =>
      courses.find((c) => {
        const courseInfo = getCourseInfo(c.code);
        if (!courseInfo) return c.code === courseCode;
        return courseInfo.codes.includes(courseCode);
      }),
    [courses],
  );

  const handleSkip = async (courseCode: string, courseName: string) => {
    if (!user) return;
    try {
      await skipCourse(user.uid, courseCode, courseName);
      await onRequirementChange();
    } catch (error) {
      console.error("Error skipping course:", error);
      toast.error("Failed to skip course. Please try again.");
    }
  };

  const handleUnskip = async (courseCode: string) => {
    if (!user) return;
    try {
      await unskipCourse(user.uid, courseCode);
      await onRequirementChange();
    } catch (error) {
      console.error("Error unskipping course:", error);
      toast.error("Failed to unskip course. Please try again.");
    }
  };

  const handleRemoveManualCourse = async (
    courseCode: string,
    requirementTitle: string,
  ) => {
    if (!user) return;
    try {
      const courseToUpdate = findCourseByCode(courseCode);

      if (!courseToUpdate) {
        console.error("Course not found:", courseCode);
        toast.error("Course not found.");
        return;
      }

      const currentManual = courseToUpdate.manualRequirementsFulfilled || [];
      const updatedManual = currentManual.filter(
        (m) =>
          !(
            m.major_id === selectedMajor &&
            m.requirement_title === requirementTitle
          ),
      );

      await setDoc(
        doc(db, "courses", courseToUpdate.id),
        {
          manualRequirementsFulfilled:
            updatedManual.length > 0 ? updatedManual : [],
        },
        { merge: true },
      );

      await onRequirementChange();
    } catch (error) {
      console.error("Error removing manual course:", error);
      toast.error("Failed to remove manual fulfillment. Please try again.");
    }
  };

  const handleExcludeFromRequirement = async (
    courseCode: string,
    requirementTitle: string,
  ) => {
    if (!user) return;

    if (
      !window.confirm(
        `Remove ${courseCode} from "${requirementTitle}"? You can undo this later.`,
      )
    ) {
      return;
    }

    try {
      const courseToUpdate = findCourseByCode(courseCode);

      if (!courseToUpdate) {
        console.error("Course not found:", courseCode);
        toast.error("Course not found.");
        return;
      }

      const currentExclusions = courseToUpdate.excludedFromRequirements || [];
      const newExclusion = {
        major_id: selectedMajor,
        requirement_title: requirementTitle,
      };

      const alreadyExcluded = currentExclusions.some(
        (e) =>
          e.major_id === selectedMajor &&
          e.requirement_title === requirementTitle,
      );

      if (alreadyExcluded) return;

      await setDoc(
        doc(db, "courses", courseToUpdate.id),
        {
          excludedFromRequirements: [...currentExclusions, newExclusion],
        },
        { merge: true },
      );

      await onRequirementChange();
    } catch (error) {
      console.error("Error excluding course from requirement:", error);
      toast.error("Failed to exclude course from requirement. Please try again.");
    }
  };

  const handleReIncludeFromRequirement = async (
    courseCode: string,
    requirementTitle: string,
  ) => {
    if (!user) return;
    try {
      const courseToUpdate = findCourseByCode(courseCode);

      if (!courseToUpdate) {
        console.error("Course not found:", courseCode);
        toast.error("Course not found.");
        return;
      }

      const currentExclusions = courseToUpdate.excludedFromRequirements || [];
      const updatedExclusions = currentExclusions.filter(
        (e) =>
          !(
            e.major_id === selectedMajor &&
            e.requirement_title === requirementTitle
          ),
      );

      await setDoc(
        doc(db, "courses", courseToUpdate.id),
        {
          excludedFromRequirements:
            updatedExclusions.length > 0 ? updatedExclusions : [],
        },
        { merge: true },
      );

      await onRequirementChange();
      toast.success("Course re-included in requirement.");
    } catch (error) {
      console.error("Error re-including course in requirement:", error);
      toast.error("Failed to re-include course. Please try again.");
    }
  };

  const handleOpenCourse = useCallback((opt: any, _reqName: string) => {
    setModalOpen({
      isOpen: true,
      course: {
        code: opt.code,
        name: opt.name,
        status: opt.skipped
          ? "skipped"
          : opt.inProgress
            ? "in-progress"
            : opt.completed
              ? "completed"
              : "not-taken",
        skipped: opt.skipped || false,
      },
    });
  }, [setModalOpen]);

  const handleAddManual = useCallback(
    (reqName: string) => {
      setReqModal({ isOpen: false, req: null });
      setManualCourseModal({
        isOpen: true,
        requirement: `${selectedMajor}|${reqName}`,
      });
    },
    [selectedMajor, setReqModal, setManualCourseModal],
  );

  const openRequirement = useCallback(
    (req: any) =>
      setReqModal({
        isOpen: true,
        req: {
          id: req.id,
          name: req.name,
          description: req.description,
          required: req.required,
          options: req.options,
        },
      }),
    [setReqModal],
  );

  const cardHandlers: RequirementCardHandlers = {
    onOpenCourse: handleOpenCourse,
    onUnskip: handleUnskip,
    onRemoveManual: handleRemoveManualCourse,
    onAddManual: handleAddManual,
    onOpenRequirement: openRequirement,
    onExcludeFromRequirement: handleExcludeFromRequirement,
    onReIncludeFromRequirement: handleReIncludeFromRequirement,
  };

  return {
    handleSkip,
    handleUnskip,
    handleRemoveManualCourse,
    handleOpenCourse,
    handleAddManual,
    openRequirement,
    cardHandlers,
  };
}
