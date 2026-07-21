"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import { programLabel } from "@/lib/certificatePolicy";
import type { SlotRefusal } from "@/lib/utils/plannedCourseAdmission";

/**
 * Why a course would not go on the grid.
 *
 * Shown only for the one case the simulator refuses outright: every program
 * that lists the course has refused it, so planning it would earn nothing.
 * Each refusing program is named with the engine's own sentence underneath;
 * nothing here rewrites or summarizes a verdict.
 */
export default function PlannedCourseBlockedModal({
  isOpen,
  courseCode,
  refusals,
  onClose,
}: {
  isOpen: boolean;
  courseCode: string | null;
  refusals: SlotRefusal[];
  onClose: () => void;
}) {
  const courseName = courseCode ? getCourseNameFromCode(courseCode) : null;

  return (
    <AnimatePresence>
      {isOpen && courseCode && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${courseCode} cannot be planned`}
        >
          <motion.div
            className="bg-white dark:bg-gray-900 p-6 rounded-xl max-w-md w-full border border-gray-200 dark:border-gray-800"
            initial={{ scale: 0.97, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  This course would not count toward anything
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span className="text-gray-700 dark:text-gray-200 font-medium line-through decoration-gray-400 dark:decoration-gray-500">
                    {courseCode}
                  </span>
                  {courseName && (
                    <span className="text-gray-500 ml-1.5">{courseName}</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Every program that lists it has refused it, so it was not
                  added to your plan.
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 dark:text-gray-400 hover:text-red-400 transition flex-shrink-0 ml-2"
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                Refused by
              </p>
              {refusals.map((refusal, i) => (
                <div
                  key={`${refusal.program.type}:${refusal.program.id}:${i}`}
                  className="rounded-lg bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-300 dark:border-zinc-700/50 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                      {programLabel(refusal.program)}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                      {refusal.program.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {refusal.requirementTitle}
                  </p>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1">
                    {refusal.reason}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={onClose}
                className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:hover:text-gray-100 transition-colors text-sm"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
