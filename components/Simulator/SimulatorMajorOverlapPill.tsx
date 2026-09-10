"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiAlertTriangle, FiCheck, FiChevronDown, FiX } from "react-icons/fi";
import type { SharedCoursesResult } from "@/lib/utils/sharedCourses";

type SimulatorMajorOverlapPillProps = {
  /** The whole-plan overlap result: completed, in-progress, and planned. */
  overlap: SharedCoursesResult;
  /** Marks or unmarks a course as a prerequisite, exempting it from the cap. */
  onTogglePrereqOverride?: (code: string) => void;
};

/**
 * Plan-wide double-major overlap meter. Yale lets at most two course credits
 * count toward both majors, and unlike the transcript-side check this one reads
 * the entire plan, so a course you have only placed on the canvas still counts.
 */
export default function SimulatorMajorOverlapPill({
  overlap,
  onTogglePrereqOverride,
}: SimulatorMajorOverlapPillProps) {
  const [open, setOpen] = useState(false);
  const { courses, totalCredits, overriddenCredits, cap, exceeded } = overlap;

  const tone = exceeded
    ? "border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20"
    : "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20";

  const title = exceeded
    ? `Your plan counts ${totalCredits} credits toward both majors. Yale lets at most ${cap} count toward both.`
    : `Your plan counts ${totalCredits} of the ${cap} credits Yale lets count toward both majors.`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={title}
        aria-expanded={open}
        data-sim-major-overlap
        className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full border transition-colors ${tone}`}
      >
        {exceeded ? <FiAlertTriangle size={12} /> : <FiCheck size={12} />}
        <span className="font-mono">
          Overlap {totalCredits}/{cap}
        </span>
        <FiChevronDown
          size={11}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-1.5 z-20 w-80 max-h-80 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-gray-900 shadow-[0_8px_32px_rgba(0,0,0,0.16)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-3"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                  Yale lets at most {cap} credits count toward both majors. This
                  counts your whole plan: finished, in progress, and everything
                  on the canvas.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <FiX size={13} />
                </button>
              </div>

              {exceeded && (
                <p className="text-[11px] mb-2 px-2 py-1.5 rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  You are {totalCredits - cap} credit
                  {totalCredits - cap === 1 ? "" : "s"} over. Swap one of these
                  out, or check with both DUSs.
                </p>
              )}

              {overriddenCredits > 0 && (
                <p className="text-[10px] mb-2 text-emerald-600 dark:text-emerald-400">
                  {overriddenCredits} cr{overriddenCredits === 1 ? "" : "s"}{" "}
                  waived as prerequisites.
                </p>
              )}

              {courses.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 py-2">
                  Nothing on your plan counts toward both majors yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {courses.map((course) => (
                    <div
                      key={course.code}
                      className={`p-2 rounded-lg border ${
                        course.isPrereqOverride
                          ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/[0.06]"
                          : "border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`text-xs font-medium ${
                            course.isPrereqOverride
                              ? "text-gray-500 dark:text-gray-400 line-through"
                              : "text-gray-800 dark:text-gray-100"
                          }`}
                        >
                          {course.code}
                        </span>
                        {course.planned && (
                          <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full border border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300">
                            planned
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
                          {course.credits} cr
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {course.majors.map((m) => (
                          <div
                            key={m.majorId}
                            className="text-[10px] leading-snug"
                          >
                            <span className="text-purple-600 dark:text-purple-300">
                              {m.majorName}:
                            </span>{" "}
                            <span className="text-gray-500 dark:text-gray-400">
                              {m.requirements.join(", ") || "General"}
                            </span>
                          </div>
                        ))}
                      </div>
                      {onTogglePrereqOverride && (
                        <button
                          type="button"
                          onClick={() => onTogglePrereqOverride(course.code)}
                          className={`mt-1.5 w-full flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                            course.isPrereqOverride
                              ? "border-gray-200 dark:border-white/[0.1] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                              : "border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                          }`}
                        >
                          {course.isPrereqOverride ? (
                            <>
                              <FiX size={10} />
                              Unmark prerequisite
                            </>
                          ) : (
                            <>
                              <FiCheck size={10} />
                              Mark as prerequisite
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 italic">
                Prerequisites do not count toward the limit. Yale is not always
                clear about which courses are prereqs, so mark one yourself if
                you know it is.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
