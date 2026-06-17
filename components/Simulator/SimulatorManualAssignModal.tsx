"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import { Course } from "@/lib/types";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import {
  MajorProgress,
  ManualRequirementEntry,
  MAJORS,
  majorRequirements,
} from "@/lib/majors";

interface SimulatorManualAssignModalProps {
  isOpen: boolean;
  course: Course | null;
  majorIds: string[];
  previewProgress: Record<string, MajorProgress>;
  onAssign: (entry: ManualRequirementEntry) => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function SimulatorManualAssignModal({
  isOpen,
  course,
  majorIds,
  previewProgress,
  onAssign,
  onSkip,
  onClose,
}: SimulatorManualAssignModalProps) {
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);

  // Auto-select if only 1 major
  const activeMajor = majorIds.length === 1 ? majorIds[0] : selectedMajor;

  // Get unfulfilled requirements for the selected major
  const unfulfilledReqs = useMemo(() => {
    if (!activeMajor) return [];
    const progress = previewProgress[activeMajor];
    const majorDef = majorRequirements[activeMajor];
    if (!majorDef) return [];

    // Build a lookup from progress data
    const progressByName = new Map<
      string,
      { completed: number; required: number }
    >();
    const allReqs = [
      ...(progress?.completedRequirements ?? []),
      ...(progress?.inProgressRequirements ?? []),
      ...(progress?.remainingRequirements ?? []),
    ];
    for (const r of allReqs) {
      progressByName.set(r.name, {
        completed: r.completed,
        required: r.required,
      });
    }

    // Filter to requirements that are not yet fully satisfied
    return majorDef.requirements
      .map((req) => {
        const prog = progressByName.get(req.name);
        return {
          name: req.name,
          description: req.description,
          completed: prog?.completed ?? 0,
          required: req.required,
        };
      })
      .filter((r) => r.completed < r.required);
  }, [activeMajor, previewProgress]);

  const handleAssign = (reqName: string) => {
    if (!activeMajor || !course) return;
    onAssign({
      code: course.code,
      requirement: reqName,
      credits: course.credits || 1,
      isPlanned: true, // Simulator manuals are for future planning
    });
  };

  const handleClose = () => {
    setSelectedMajor(null);
    onClose();
  };

  const handleSkip = () => {
    setSelectedMajor(null);
    onSkip();
  };

  return (
    <AnimatePresence>
      {isOpen && course && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="bg-white dark:bg-gray-900 p-6 rounded-xl max-w-md w-full border border-gray-200 dark:border-gray-800 flex flex-col max-h-[80vh]"
            initial={{ scale: 0.97, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Assign to a requirement?
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span className="text-pink-600 dark:text-pink-300 font-medium">
                    {course.code}
                  </span>
                  {getCourseNameFromCode(course.code) && (
                    <span className="text-gray-500 ml-1">
                      {getCourseNameFromCode(course.code)}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  This course wasn&apos;t auto-detected for any requirement for
                  your major(s).
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-500 dark:text-gray-400 hover:text-red-400 transition flex-shrink-0 ml-2"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Major selector (if 2 majors) */}
            {majorIds.length > 1 && !selectedMajor && (
              <div className="space-y-2 mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                  Which major?
                </p>
                <div className="flex gap-2">
                  {majorIds.map((mid) => (
                    <button
                      key={mid}
                      onClick={() => setSelectedMajor(mid)}
                      className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-700 dark:text-gray-200 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left"
                    >
                      <div className="font-medium">{mid}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {MAJORS[mid] ?? mid}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements list */}
            {activeMajor && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {majorIds.length > 1 && (
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setSelectedMajor(null)}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition"
                    >
                      &larr; Back
                    </button>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {MAJORS[activeMajor] ?? activeMajor}
                    </span>
                  </div>
                )}

                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-2">
                  Unfulfilled requirements
                </p>

                {unfulfilledReqs.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                    All requirements are satisfied for this major.
                  </p>
                ) : (
                  <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-1.5">
                    {unfulfilledReqs.map((req) => (
                      <button
                        key={req.name}
                        onClick={() => handleAssign(req.name)}
                        className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/30 hover:border-purple-500/60 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-200 transition-colors">
                            {req.name}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
                            {req.completed}/{req.required}
                          </span>
                        </div>
                        {req.description && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
                            {req.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Skip button */}
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={handleSkip}
                className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm"
              >
                Skip &mdash; not for my major
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
