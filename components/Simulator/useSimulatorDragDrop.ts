import { useState } from "react";
import { Course } from "@/lib/types";
import { codesReferToSameCourse } from "@/lib/courseCatalog";
import toast from "react-hot-toast";
import type { Semester } from "./simulatorTypes";

export interface UseSimulatorDragDropOptions {
  semesters: Semester[];
  setSemesters: React.Dispatch<React.SetStateAction<Semester[]>>;
  setAvailableCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  remainingCourses: Course[];
  isCourseInAnyRequirement: (courseCode: string) => boolean;
  showAutoMatchToast: (courseCode: string) => void;
  setManualAssignPending: React.Dispatch<
    React.SetStateAction<{ course: Course; semesterId: string } | null>
  >;
  setSimulatorManualReqs: React.Dispatch<
    React.SetStateAction<
      import("@/lib/majors").ManualRequirementEntry[]
    >
  >;
}

export function useSimulatorDragDrop({
  semesters,
  setSemesters,
  setAvailableCourses,
  remainingCourses,
  isCourseInAnyRequirement,
  showAutoMatchToast,
  setManualAssignPending,
  setSimulatorManualReqs,
}: UseSimulatorDragDropOptions) {
  const [draggedCourse, setDraggedCourse] = useState<Course | null>(null);
  const [dragSourceSemester, setDragSourceSemester] = useState<string | null>(
    null,
  );
  const [hoveredSemester, setHoveredSemester] = useState<string | null>(null);
  const [selectedPoolCourse, setSelectedPoolCourse] = useState<Course | null>(
    null,
  );

  const playPopSound = () => {
    const audio = new Audio("/audio/pop.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => {}); // Ignore errors if audio can't play
  };

  const handleDragStart = (course: Course, sourceSemesterId?: string) => {
    setDraggedCourse(course);
    setDragSourceSemester(sourceSemesterId ?? null);
  };

  const placeCourseInSemester = (course: Course, semesterId: string) => {
    const isDuplicate = semesters.some((s) =>
      s.courses.some((c) => codesReferToSameCourse(c.code, course.code)),
    );
    if (isDuplicate) {
      toast.error("This course is already on your plan.");
      return;
    }

    playPopSound();

    setSemesters((prev) =>
      prev.map((sem) =>
        sem.id === semesterId
          ? sem.courses.some((c) =>
              codesReferToSameCourse(c.code, course.code),
            )
            ? sem
            : { ...sem, courses: [...sem.courses, course] }
          : sem,
      ),
    );

    setAvailableCourses((prev) => prev.filter((c) => c.code !== course.code));
    setSelectedPoolCourse(null);

    if (!isCourseInAnyRequirement(course.code)) {
      setManualAssignPending({ course, semesterId });
    } else {
      showAutoMatchToast(course.code);
    }
  };

  const handleDrop = (semesterId: string) => {
    if (!draggedCourse) return;

    // Dropping back on the same semester — no-op
    if (dragSourceSemester === semesterId) {
      setDraggedCourse(null);
      setDragSourceSemester(null);
      return;
    }

    // Play pop sound on successful drop
    playPopSound();

    setSemesters((prev) =>
      prev.map((sem) => {
        // Remove from source semester (inter-semester move)
        if (dragSourceSemester && sem.id === dragSourceSemester) {
          return {
            ...sem,
            courses: sem.courses.filter((c) => c.code !== draggedCourse.code),
          };
        }
        // Add to target semester (if not already there)
        if (sem.id === semesterId) {
          return sem.courses.some((c) =>
            codesReferToSameCourse(c.code, draggedCourse.code),
          )
            ? sem
            : { ...sem, courses: [...sem.courses, draggedCourse] };
        }
        return sem;
      }),
    );

    // Only remove from pool if dragged from pool (not from another semester)
    if (!dragSourceSemester) {
      setAvailableCourses((prev) =>
        prev.filter((c) => c.code !== draggedCourse.code),
      );

      // Auto-detect: prompt manual assignment if not in any requirement
      if (!isCourseInAnyRequirement(draggedCourse.code)) {
        setManualAssignPending({ course: draggedCourse, semesterId });
      } else {
        // Show toast for auto-matched course
        showAutoMatchToast(draggedCourse.code);
      }
    }

    setDraggedCourse(null);
    setDragSourceSemester(null);
  };

  const removeCourseFromSemester = (semesterId: string, courseCode: string) => {
    setSemesters((prev) =>
      prev.map((sem) =>
        sem.id === semesterId
          ? {
              ...sem,
              courses: sem.courses.filter((c) => c && c.code !== courseCode),
            }
          : sem,
      ),
    );

    // Clean up any simulator manual reqs for this course
    setSimulatorManualReqs((prev) => prev.filter((m) => m.code !== courseCode));

    const rc = remainingCourses.find((c) =>
      codesReferToSameCourse(c.code, courseCode),
    );
    if (rc && rc.status === "not-taken") {
      setAvailableCourses((prev) =>
        prev.some((c) => codesReferToSameCourse(c.code, rc.code))
          ? prev
          : [...prev, rc],
      );
    }
  };

  // Immutable per-course update for the inline grade/distributional controls.
  const updatePlannedCourse = (
    semesterId: string,
    courseCode: string,
    patch: Partial<Pick<Course, "grade" | "distributionals">>,
  ) => {
    setSemesters((prev) =>
      prev.map((sem) =>
        sem.id === semesterId
          ? {
              ...sem,
              courses: sem.courses.map((c) =>
                codesReferToSameCourse(c.code, courseCode)
                  ? { ...c, ...patch }
                  : c,
              ),
            }
          : sem,
      ),
    );
  };

  const clearDragState = () => {
    setDraggedCourse(null);
    setDragSourceSemester(null);
    setHoveredSemester(null);
  };

  return {
    draggedCourse,
    dragSourceSemester,
    hoveredSemester,
    setHoveredSemester,
    selectedPoolCourse,
    setSelectedPoolCourse,
    handleDragStart,
    placeCourseInSemester,
    handleDrop,
    removeCourseFromSemester,
    updatePlannedCourse,
    clearDragState,
  };
}
