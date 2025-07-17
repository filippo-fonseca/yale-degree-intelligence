"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FiMoreVertical, FiX, FiCornerDownLeft } from "react-icons/fi";
import { getOtherCodesForCourse } from "@/lib/courseCatalog";
import { useEffect, useRef, useState } from "react";

type CourseStatus = "completed" | "in-progress" | "not-taken" | "skipped";

interface CourseModalProps {
  isOpen: boolean;
  course: {
    code: string;
    name: string;
    status: CourseStatus;
  } | null;
  onClose: () => void;
  onSkip: (code: string, name: string) => void;
}

export default function CourseModal({
  isOpen,
  course,
  onClose,
  onSkip,
}: CourseModalProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

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
                {course.status !== "completed" && (
                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen(course.code)}
                      className="text-gray-400 hover:text-white"
                    >
                      <FiMoreVertical />
                    </button>
                    {dropdownOpen === course.code && (
                      <motion.div
                        ref={dropdownRef}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 z-[999] mt-2 w-40 rounded-md bg-gray-700 shadow-lg border border-gray-600 overflow-visible"
                      >
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-200 hover:bg-gray-600"
                          onClick={() => {
                            onSkip(course.code, course.name);
                            setDropdownOpen(null);
                          }}
                        >
                          <FiCornerDownLeft />
                          Mark as skipped
                        </button>
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:bg-gray-600"
                          onClick={() => setDropdownOpen(null)}
                        >
                          <FiX />
                          Cancel
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-gray-300">{course.name}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
