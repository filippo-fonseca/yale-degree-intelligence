"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FiMoreVertical,
  FiX,
  FiCornerDownLeft,
  FiTrash2,
} from "react-icons/fi";
import {
  getCourseCreditsFromCode,
  getOtherCodesForCourse,
} from "@/lib/courseCatalog";
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

interface CourseModalProps {
  isOpen: boolean;
  course: {
    code: string;
    name: string;
    status: CourseStatus;
    skipped?: boolean;
  } | null;
  onClose: () => void;
  onSkip?: (code: string, name: string) => void; // Made optional
  onRefresh?: () => void; // Made optional
  allowSkip?: boolean; // New prop to control skip functionality
}

export default function CourseModal({
  isOpen,
  course,
  onClose,
  onSkip,
  onRefresh,
  allowSkip = true, // Default to true for backward compatibility
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
          className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium">{course.code}</h3>
                <p className="text-gray-400 text-sm">
                  Previously {getOtherCodesForCourse(course.code)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    course.status === "completed"
                      ? "bg-emerald-900/20 text-emerald-300"
                      : course.status === "in-progress"
                      ? "bg-blue-900/20 text-blue-300"
                      : course.status === "skipped"
                      ? "bg-gray-800/20 text-gray-300"
                      : "bg-amber-900/20 text-amber-300"
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
                          ? "bg-emerald-900/20 text-emerald-300"
                          : "bg-blue-900/20 text-blue-300"
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
                      className={`text-xs px-2 py-1 rounded-full bg-emerald-900/20 ${getGPAColor(
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
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-900/20 text-blue-300 hover:bg-blue-900/30 transition-all transform hover:scale-105"
                      >
                        <FiCornerDownLeft size={12} />
                        Mark as skipped
                      </button>

                      <div className="relative group">
                        <Info className="h-4 w-4 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer" />
                        <div className="absolute border border-pink-500 top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-800 text-gray-300 text-xs p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                          Sometimes you can count a class as "taken" without
                          necessarily taking the exact course
                          <br /> (like via placement or another class). In that
                          case, mark it as "skipped!". If you instead
                          <br />
                          took ANOTHER class you want to use for this
                          requirement, use the "Fulfill manually"
                          <br /> button present on the card for this requirement
                          (exit out of this modal first).
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
            <p className="text-gray-300">
              {course.name} <br /> {courseCredits}{" "}
              {courseCredits === 1 ? "credit" : "credits"}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
