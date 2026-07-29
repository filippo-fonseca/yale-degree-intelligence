"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiAlertTriangle, FiCheck, FiChevronDown, FiX } from "react-icons/fi";
import { Course } from "@/lib/types";
import { getSharedCourses } from "@/lib/utils/sharedCourses";
import type { UserProfile } from "./types";

interface SharedCoursesConflictManagerProps {
  userProfile: UserProfile;
  courses: Course[];
  onTogglePrereqOverride: (code: string) => void;
}

export function SharedCoursesConflictManager({
  userProfile,
  courses,
  onTogglePrereqOverride,
}: SharedCoursesConflictManagerProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  const {
    courses: sharedCourses,
    totalCredits,
    overriddenCredits,
  } = getSharedCourses(userProfile, courses);
  const isWarning = totalCredits > 2;
  const hasShared = sharedCourses.length > 0;
  const overrideCount = sharedCourses.filter(
    (c) => c.isPrereqOverride,
  ).length;

  return (
    <div
      ref={containerRef}
      data-tour="major-shared-courses"
      className="relative ml-2"
    >
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all duration-200 ${
          isWarning
            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-400/60 dark:border-amber-600/40 hover:border-amber-500/60"
            : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60 dark:border-emerald-600/40 hover:border-emerald-500/60"
        }`}
      >
        {isWarning ? <FiAlertTriangle size={12} /> : <FiCheck size={12} />}
        <span>
          {totalCredits > 0
            ? `${totalCredits} shared cr${totalCredits !== 1 ? "s" : ""}`
            : "No overlap"}
        </span>
        <FiChevronDown
          size={12}
          className={`transition-transform ${showDropdown ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 mt-2 z-50 w-80 max-h-80 overflow-y-auto rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Double Major Conflict Manager
              </h4>
              <button
                onClick={() => setShowDropdown(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <FiX size={14} />
              </button>
            </div>

            {!hasShared ? (
              <div className="text-center py-4">
                <FiCheck
                  className="mx-auto text-emerald-600 dark:text-emerald-400 mb-2"
                  size={24}
                />
                <p className="text-sm text-emerald-600 dark:text-emerald-300 font-medium">
                  All clear!
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  No courses are counting toward multiple majors.
                </p>
              </div>
            ) : (
              <>
                <div
                  className={`text-xs mb-3 p-2 rounded-lg ${
                    isWarning
                      ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/30"
                      : "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/30"
                  }`}
                >
                  {isWarning ? (
                    <>
                      <strong>Heads up:</strong> You have more than 2 credits
                      shared between majors. You may need to revise your course
                      plan.
                    </>
                  ) : (
                    <>
                      <strong>You&apos;re good!</strong> Having 1-2 shared
                      credits between majors is typically allowed. Do check with
                      both DUSs!
                    </>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-600 mb-3 italic">
                  Prerequisites don&apos;t count toward the 2-credit overlap
                  limit, but Yale isn&apos;t always clear about which courses
                  are prereqs. If you know one is, mark it below to exempt it
                  from the warning.
                </p>
                {overrideCount > 0 && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mb-3 -mt-1.5">
                    {overriddenCredits} cr{overriddenCredits !== 1 ? "s" : ""}{" "}
                    waived as prerequisite{overrideCount !== 1 ? "s" : ""}.
                  </p>
                )}

                <div className="space-y-2">
                  {sharedCourses.map((course, idx) => {
                    const showPrereqHeader =
                      course.isPrereqOverride &&
                      (idx === 0 || !sharedCourses[idx - 1].isPrereqOverride);
                    return (
                      <div key={course.code}>
                        {showPrereqHeader && (
                          <div className="flex items-center gap-2 pt-1 pb-1.5">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              Marked as prerequisites
                            </span>
                            <div className="flex-1 h-px bg-emerald-300/50 dark:bg-emerald-700/30" />
                          </div>
                        )}
                        <div
                          className={`p-2 rounded-lg border transition-all ${
                            course.isPrereqOverride
                              ? "bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-300/60 dark:border-emerald-700/30"
                              : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/30"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-sm font-medium ${
                                course.isPrereqOverride
                                  ? "text-gray-500 dark:text-gray-400 line-through"
                                  : "text-gray-800 dark:text-gray-200"
                              }`}
                            >
                              {course.code}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              {course.credits} cr
                            </span>
                          </div>
                          <div className="space-y-1">
                            {course.majors.map((m) => (
                              <div key={m.majorId} className="text-[11px]">
                                <span className="text-purple-600 dark:text-purple-300">
                                  {m.majorName}:
                                </span>{" "}
                                <span className="text-gray-500 dark:text-gray-400">
                                  {m.requirements.join(", ") || "General"}
                                </span>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() =>
                              onTogglePrereqOverride(course.code)
                            }
                            className={`mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-all ${
                              course.isPrereqOverride
                                ? "border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                : "border-emerald-400/60 dark:border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            }`}
                          >
                            {course.isPrereqOverride ? (
                              <>
                                <FiX size={11} />
                                Unmark prerequisite
                              </>
                            ) : (
                              <>
                                <FiCheck size={11} />
                                Mark as prerequisite
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
