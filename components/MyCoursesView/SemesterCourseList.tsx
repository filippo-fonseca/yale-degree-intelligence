"use client";

import { RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiChevronDown } from "react-icons/fi";
import { Course } from "@/lib/types";
import { getSemesterAccent } from "./helpers";
import { CardBoop } from "./CardBoop";
import { CourseCard } from "./CourseCard";
import { SkippedSection } from "./SkippedSection";

interface SemesterCourseListProps {
  semesterGroups: [string, Course[]][];
  skippedCourses: Course[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  semesterSectionRefs: React.MutableRefObject<
    Record<string, HTMLDivElement | null>
  >;
  collapsedSemesters: Set<string>;
  loadedSemesterStorageKey: string | null;
  semesterStorageKey: string;
  defaultOpenSemesterSet: Set<string>;
  activeSemester: string | null;
  defaultActiveSemester: string | null;
  distSelectorCourseId: string | null;
  onManualAdd: (semester?: string) => void;
  onToggleSemesterCollapse: (key: string) => void;
  onJumpToSemester: (key: string) => void;
  semesterHasInProgress: (key: string) => boolean;
  onCardClick: (course: Course) => void;
  onDeleteClick: (course: Course) => void;
  onDistSelectorToggle: (courseId: string) => void;
  onToggleDistributional: (courseId: string, dist: string) => Promise<void>;
}

export function SemesterCourseList({
  semesterGroups,
  skippedCourses,
  scrollContainerRef,
  semesterSectionRefs,
  collapsedSemesters,
  loadedSemesterStorageKey,
  semesterStorageKey,
  defaultOpenSemesterSet,
  activeSemester,
  defaultActiveSemester,
  distSelectorCourseId,
  onManualAdd,
  onToggleSemesterCollapse,
  onJumpToSemester,
  semesterHasInProgress,
  onCardClick,
  onDeleteClick,
  onDistSelectorToggle,
  onToggleDistributional,
}: SemesterCourseListProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[10rem_minmax(0,1fr)] items-start">
      <aside className="lg:sticky lg:top-2 lg:self-start">
        <div className="flex lg:block gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0">
          {semesterGroups.map(([semester, semCourses]) => {
            const hasInProgress = semesterHasInProgress(semester);
            const season = semester.split(" ")[0];
            const accent = getSemesterAccent(season, hasInProgress);
            const isActive =
              (activeSemester ?? defaultActiveSemester) === semester;

            return (
              <button
                key={semester}
                type="button"
                onClick={() => onJumpToSemester(semester)}
                aria-current={isActive ? "true" : undefined}
                className={`group relative shrink-0 lg:w-full min-w-[8.75rem] lg:min-w-0 text-left px-3 py-2 rounded-lg border transition-colors ${
                  isActive
                    ? "border-transparent"
                    : "bg-gray-50/70 dark:bg-gray-950/20 border-gray-200/70 dark:border-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700"
                } ${semesterGroups.length > 1 ? "lg:mb-2" : ""}`}
              >
                {isActive && (
                  <motion.span
                    layoutId="active-semester-indicator"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-gray-900/70 border border-pink-400/60 dark:border-pink-400/50 shadow-sm"
                    transition={{
                      type: "spring",
                      stiffness: 480,
                      damping: 38,
                    }}
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-center gap-2 min-w-0">
                  <span
                    className={`w-1 h-5 rounded-full shrink-0 ${accent.bar}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p
                      className={`truncate text-xs font-medium ${
                        isActive
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200"
                      }`}
                    >
                      {semester}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      {semCourses.length} course
                      {semCourses.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {hasInProgress && (
                    <span
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0"
                      aria-label="In progress"
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="min-w-0 space-y-6">
        {semesterGroups.map(([semester, semCourses]) => {
          const isCollapsed =
            loadedSemesterStorageKey === semesterStorageKey
              ? collapsedSemesters.has(semester)
              : !defaultOpenSemesterSet.has(semester);
          const hasInProgress = semesterHasInProgress(semester);
          const season = semester.split(" ")[0];
          const accent = getSemesterAccent(season, hasInProgress);

          return (
            <motion.div
              key={semester}
              ref={(node) => {
                semesterSectionRefs.current[semester] = node;
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="scroll-mt-16"
            >
              <div className="sticky top-0 z-20 flex items-center justify-between mb-3 gap-2 py-2 rounded-lg bg-white/90 dark:bg-gray-950/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/75 dark:supports-[backdrop-filter]:bg-gray-950/70">
                <button
                  onClick={() => onToggleSemesterCollapse(semester)}
                  className="flex-1 min-w-0 flex items-center justify-between group"
                  aria-expanded={!isCollapsed}
                  aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${semester}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-1 h-4 rounded-full shrink-0 ${accent.bar}`}
                      aria-hidden="true"
                    />
                    <h3
                      className={`text-base font-medium transition-colors ${accent.title}`}
                    >
                      {semester}
                    </h3>
                    {hasInProgress && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/20 border border-violet-500/30 text-violet-600 dark:text-violet-300">
                        <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
                        In Progress
                      </span>
                    )}
                    <span className={`text-xs ${accent.count}`}>
                      {semCourses.length} course
                      {semCourses.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: isCollapsed ? 0 : 180 }}
                    transition={{ duration: 0.2 }}
                    className="p-1 rounded-md text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 group-hover:bg-black/[0.04] dark:group-hover:bg-white/[0.05] transition-all"
                  >
                    <FiChevronDown size={16} />
                  </motion.div>
                </button>
                <motion.button
                  whileHover={{ y: -1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onManualAdd(semester);
                  }}
                  data-add-semester={semester}
                  aria-label={`Add a course to ${semester}`}
                  title={`Add a course to ${semester}`}
                  className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border bg-transparent transition-all text-xs ${accent.chip}`}
                >
                  <FiPlus size={13} />
                  <span className="hidden sm:inline">Add course</span>
                </motion.button>
              </div>

              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {semCourses.map((course, idx) => (
                        <CardBoop
                          key={course.id || `${course.code}-${idx}`}
                          scrollRef={scrollContainerRef}
                        >
                          <CourseCard
                            course={course}
                            distSelectorCourseId={distSelectorCourseId}
                            onCardClick={onCardClick}
                            onDeleteClick={onDeleteClick}
                            onDistSelectorToggle={onDistSelectorToggle}
                            onToggleDistributional={onToggleDistributional}
                          />
                        </CardBoop>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {skippedCourses.length > 0 && (
          <SkippedSection courses={skippedCourses} hasMultipleMajors={false} />
        )}
      </div>
    </div>
  );
}
