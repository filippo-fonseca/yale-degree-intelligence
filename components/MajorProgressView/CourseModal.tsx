"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FiMoreVertical,
  FiX,
  FiCornerDownLeft,
  FiEdit3,
  FiTrash2,
} from "react-icons/fi";
import {
  getCourseCreditsFromCode,
  getOtherCodesForCourse,
} from "@/lib/courseCatalog";
import { effectiveDistributionals } from "@/lib/utils/effectiveDistributionals";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/config/firebase";
import {
  query,
  collection,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { getGPAColor } from "@/lib/utils/utils";
import { Info } from "lucide-react";

type CourseStatus = "completed" | "in-progress" | "not-taken" | "skipped";

const DIST_CATEGORIES = {
  areas: ["Hu", "So", "Sc"],
  skills: ["QR", "WR"],
  languages: ["L1", "L2", "L3", "L4", "L5"],
};

const DIST_PILL_STYLES: Record<string, string> = {
  Hu: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  So: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  Sc: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  QR: "bg-red-500/20 text-red-300 border-red-500/30",
  WR: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  L1: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  L2: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  L3: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  L4: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  L5: "bg-teal-500/20 text-teal-300 border-teal-500/30",
};

const getDistPillStyle = (code: string) =>
  DIST_PILL_STYLES[code] || "bg-gray-200/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700";

interface CourseModalProps {
  isOpen: boolean;
  course: {
    id?: string;
    code: string;
    name: string;
    status: CourseStatus;
    skipped?: boolean;
    distributionals?: string[];
  } | null;
  onClose: () => void;
  onSkip?: (code: string, name: string) => void;
  onRefresh?: () => void;
  allowSkip?: boolean;
  onToggleDistributional?: (courseId: string, dist: string) => void;
  /** When set, the modal offers the same edit action as the course card. */
  onEdit?: () => void;
  /** When set, the modal offers the same delete action as the course card. */
  onDelete?: () => void;
}

export default function CourseModal({
  isOpen,
  course,
  onClose,
  onSkip,
  onRefresh,
  allowSkip = true,
  onToggleDistributional,
  onEdit,
  onDelete,
}: CourseModalProps) {
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [courseGrade, setCourseGrade] = useState<string | null>(null);
  const [courseSemesterTaken, setCourseSemesterTaken] = useState<string | null>(
    null
  );
  const [courseCredits, setCourseCredits] = useState<number | undefined>();
  const [showDistEditor, setShowDistEditor] = useState(false);
  const [localDistributionals, setLocalDistributionals] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    if (course) {
      setCourseCredits(getCourseCreditsFromCode(course.code));
    }

    // Fetch semester info for both completed and in-progress courses
    if (
      (course?.status === "completed" || course?.status === "in-progress") &&
      !course.skipped
    ) {
      const fetchCourseBackend = async () => {
        try {
          const otherCodes = getOtherCodesForCourse(course.code);
          const allCodesToCheck = [course.code, ...otherCodes];

          for (const code of allCodesToCheck) {
            const q = query(
              collection(db, "courses"),
              where("userId", "==", user.uid),
              where("code", "==", code)
            );

            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              const courseData = snapshot.docs[0].data();
              setCourseGrade(courseData.grade || null);
              setCourseSemesterTaken(
                courseData.semester + " " + courseData.year || null
              );

              //if fsr we don't have the course in our backend, we can still fulfill the number of credits for the UI from the backend of the user transcript parse:
              if (!courseCredits) {
                setCourseCredits(courseData.credits || null);
              }
              return;
            }
          }

          setCourseGrade(null);
          setCourseSemesterTaken(null);
        } catch (err) {
          console.error("Error fetching course data:", err);
          setCourseGrade(null);
          setCourseSemesterTaken(null);
        }
      };
      fetchCourseBackend();
    }
  }, [course, isOpen, user]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  // Sync local distributionals with course prop and reset editor state. A
  // course nobody has tagged by hand shows the catalog's tags rather than
  // "none assigned".
  useEffect(() => {
    if (course) {
      setLocalDistributionals(effectiveDistributionals(course));
    }
    setShowDistEditor(false);
  }, [course, isOpen]);

  const handleToggleDist = (dist: string) => {
    if (!course?.id || !onToggleDistributional) return;

    // Optimistic update
    setLocalDistributionals((prev) =>
      prev.includes(dist) ? prev.filter((d) => d !== dist) : [...prev, dist]
    );

    // Call parent handler
    onToggleDistributional(course.id, dist);
  };

  const handleDeleteCourse = async () => {
    if (!user || !course || !onRefresh) return;
    try {
      const q = query(
        collection(db, "courses"),
        where("userId", "==", user.uid),
        where("code", "==", course.code)
      );

      const snapshot = await getDocs(q);
      const batchDeletes = snapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(batchDeletes);

      onRefresh();
      setShowConfirmDelete(false);
      setDropdownOpen(null);
      onClose();
    } catch (err) {
      console.error("Error deleting course:", err);
    }
  };

  if (!course) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-100/70 dark:bg-black/70 z-[999] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{course.code}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Previously {getOtherCodesForCourse(course.code)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    course.status === "completed"
                      ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                      : course.status === "in-progress"
                      ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : course.status === "skipped"
                      ? "bg-gray-200 dark:bg-gray-800/20 text-gray-600 dark:text-gray-300"
                      : "bg-amber-100 dark:bg-amber-900/20 text-red-700 dark:text-red-300"
                  }`}
                >
                  {course.status === "completed"
                    ? "Completed"
                    : course.status === "in-progress"
                    ? "In Progress"
                    : course.status === "skipped"
                    ? "Skipped"
                    : "Not Taken"}
                </span>

                {/* Show semester for both completed and in-progress courses */}
                {(course.status === "completed" ||
                  course.status === "in-progress") &&
                  !course.skipped &&
                  courseSemesterTaken && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        course.status === "completed"
                          ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      }`}
                    >
                      {courseSemesterTaken}
                    </span>
                  )}

                {/* Show grade only for completed courses */}
                {course.status === "completed" &&
                  !course.skipped &&
                  courseGrade && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/20 ${getGPAColor(
                        courseGrade
                      )}`}
                    >
                      {courseGrade}
                    </span>
                  )}

                {/* Skip button for non-completed, non-in-progress courses */}
                {allowSkip &&
                  course.status !== "completed" &&
                  course.status !== "in-progress" && (
                    <div className="relative group flex items-center gap-2">
                      <button
                        onClick={() => {
                          onClose();
                          setCourseGrade(null);
                          onSkip?.(course.code, course.name);
                        }}
                        className="flex items-center border border-pink-300 gap-1 text-xs px-2 py-1 rounded-full bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-900/30 transition-all transform hover:scale-105"
                      >
                        <FiCornerDownLeft size={12} />
                        Mark as skipped
                      </button>

                      <div className="relative group">
                        <Info className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer" />
                        <div className="absolute border border-pink-500 top-full mt-3 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                          Sometimes you can count a class as "taken" without
                          necessarily taking the exact course
                          <br /> (like via placement or another class). In that
                          case, mark it as "skipped!". If you instead
                          <br />
                          took ANOTHER class you want to use for this
                          requirement, use the "Fulfill manually"
                          <br /> button present on the card for this
                          requirement.
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              {course.name} <br /> {courseCredits}{" "}
              {courseCredits === 1 ? "credit" : "credits"}
            </p>

            {/* Distributionals Section */}
            {(course.status === "completed" || course.status === "in-progress") && !course.skipped && onToggleDistributional && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Distributional Requirements</span>
                  {localDistributionals.length === 0 && !showDistEditor ? (
                    // Gradient border when no distributionals assigned
                    <button
                      onClick={() => setShowDistEditor(!showDistEditor)}
                      className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white border border-purple-500/50 hover:border-purple-400/70 transition-all"
                    >
                      + Assign
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowDistEditor(!showDistEditor)}
                      className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600/50 transition-all"
                    >
                      {showDistEditor ? "Done" : "Edit"}
                    </button>
                  )}
                </div>

                {/* Display assigned distributionals */}
                {localDistributionals.length > 0 && !showDistEditor && (
                  <div className="flex flex-wrap gap-1.5">
                    {localDistributionals.map((d) => (
                      <span
                        key={d}
                        className={`text-xs px-2 py-0.5 rounded-full border ${getDistPillStyle(d)}`}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}

                {localDistributionals.length === 0 && !showDistEditor && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">No distributionals assigned</p>
                )}

                {/* Distributional Editor */}
                <AnimatePresence>
                  {showDistEditor && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 mt-2"
                    >
                      {/* Areas */}
                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Areas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {DIST_CATEGORIES.areas.map((d) => (
                            <button
                              key={d}
                              onClick={() => handleToggleDist(d)}
                              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                                localDistributionals.includes(d)
                                  ? getDistPillStyle(d)
                                  : "bg-gray-100 dark:bg-gray-800/30 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700/50 hover:border-gray-400 dark:hover:border-gray-600"
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Skills */}
                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {DIST_CATEGORIES.skills.map((d) => (
                            <button
                              key={d}
                              onClick={() => handleToggleDist(d)}
                              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                                localDistributionals.includes(d)
                                  ? getDistPillStyle(d)
                                  : "bg-gray-100 dark:bg-gray-800/30 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700/50 hover:border-gray-400 dark:hover:border-gray-600"
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Languages */}
                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Languages</p>
                        <div className="flex flex-wrap gap-1.5">
                          {DIST_CATEGORIES.languages.map((d) => (
                            <button
                              key={d}
                              onClick={() => handleToggleDist(d)}
                              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                                localDistributionals.includes(d)
                                  ? getDistPillStyle(d)
                                  : "bg-gray-100 dark:bg-gray-800/30 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700/50 hover:border-gray-400 dark:hover:border-gray-600"
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Edit / delete, same actions as the course card */}
            {(onEdit || onDelete) && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 dark:hover:text-blue-400 transition-all"
                  >
                    <FiEdit3 size={13} />
                    Edit course
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:border-red-400 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-all"
                  >
                    <FiTrash2 size={13} />
                    Delete
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
