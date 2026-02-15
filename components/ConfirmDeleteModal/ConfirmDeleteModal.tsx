"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiTrash2 } from "react-icons/fi";
import { Course } from "@/lib/types";
import { getCourseNameFromCode } from "@/lib/courseCatalog";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  course: Course | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteModal({
  isOpen,
  course,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  return (
    <AnimatePresence>
      {isOpen && course && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-100/70 dark:bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-white dark:bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl border border-gray-200 dark:border-gray-800 relative shadow-xl dark:shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200">
                Delete course?
              </h3>
              <button
                onClick={onCancel}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                aria-label="Close"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-700 dark:text-gray-300">
              You&apos;re about to permanently delete{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {course.code}
              </span>{" "}
              ({getCourseNameFromCode(course.code) || "Course"}) from your{" "}
              <span className="text-purple-600 dark:text-purple-300">
                in-progress
              </span>{" "}
              list.
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              This only removes the entry from DegreeIntelligence. You can
              re-import it later by uploading a fresh transcript.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/40 hover:border-red-400 dark:hover:border-red-700 transition-all flex items-center gap-2"
              >
                <FiTrash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
