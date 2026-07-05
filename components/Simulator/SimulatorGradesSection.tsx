"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { computeProjectedGPA, type GPAEntry } from "@/lib/gpa";

interface SimulatorGradesSectionProps {
  completed: GPAEntry[];
  planned: GPAEntry[];
}

export default function SimulatorGradesSection({
  completed,
  planned,
}: SimulatorGradesSectionProps) {
  const [open, setOpen] = useState(true);

  const { cumulative, plannedOnly } = computeProjectedGPA(
    completed ?? [],
    planned ?? [],
  );

  const hasProjection = cumulative.gpa !== null;

  return (
    <div className="rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-gray-800/50 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.2)] backdrop-blur-md">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-800 dark:text-gray-200">
            Projected GPA
          </div>
          <div className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
            {hasProjection ? (
              <>
                <span className="text-emerald-600 dark:text-emerald-300 font-medium">
                  {cumulative.gpa!.toFixed(2)}
                </span>
                <span className="text-gray-400 dark:text-gray-600 ml-0.5">
                  cumulative
                </span>
              </>
            ) : (
              <span>Add grades to see your projection</span>
            )}
          </div>
        </div>
        {open ? (
          <FiChevronUp className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        ) : (
          <FiChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-800/40 pt-3">
              {!hasProjection ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
                  Add grades to planned courses to see your projected GPA.
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Prominent cumulative GPA */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Projected cumulative GPA
                      </p>
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">
                        {cumulative.gpa!.toFixed(2)}
                      </p>
                    </div>
                    {plannedOnly.gpa !== null && (
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          Planned only
                        </p>
                        <p className="text-lg font-medium text-purple-600 dark:text-purple-300">
                          {plannedOnly.gpa.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800/40">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        Graded credits
                      </p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {cumulative.gradedCredits}
                      </p>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800/40">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        Total credits
                      </p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {cumulative.totalCredits}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
