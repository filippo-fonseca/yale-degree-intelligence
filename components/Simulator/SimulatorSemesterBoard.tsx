"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown, FiChevronUp, FiPlus, FiTrash2, FiLock } from "react-icons/fi";
import { Info } from "lucide-react";
import { Course } from "@/lib/types";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import CourseGradeControl from "./CourseGradeControl";
import CourseDistributionalControl from "./CourseDistributionalControl";
import type { Semester } from "./simulatorTypes";
import { getSemesterCredits, isPastSemester } from "./simulatorUtils";

export interface SimulatorSemesterBoardProps {
  semesters: Semester[];
  availableCourses: Course[];
  showPool: boolean;
  setShowPool: (show: boolean) => void;
  showGrades: boolean;
  showDistributionals: boolean;
  draggedCourse: Course | null;
  hoveredSemester: string | null;
  setHoveredSemester: (id: string | null) => void;
  selectedPoolCourse: Course | null;
  setSelectedPoolCourse: React.Dispatch<React.SetStateAction<Course | null>>;
  handleDragStart: (course: Course, sourceSemesterId?: string) => void;
  placeCourseInSemester: (course: Course, semesterId: string) => void;
  handleDrop: (semesterId: string) => void;
  removeCourseFromSemester: (semesterId: string, courseCode: string) => void;
  updatePlannedCourse: (
    semesterId: string,
    courseCode: string,
    patch: Partial<Pick<Course, "grade" | "distributionals">>,
  ) => void;
  onAddCourse: (semesterId: string) => void;
}

function hasInProgress(semester: Semester) {
  return semester.courses.some((c) => c.status === "in-progress");
}

export default function SimulatorSemesterBoard({
  semesters,
  availableCourses,
  showPool,
  setShowPool,
  showGrades,
  showDistributionals,
  draggedCourse,
  hoveredSemester,
  setHoveredSemester,
  selectedPoolCourse,
  setSelectedPoolCourse,
  handleDragStart,
  placeCourseInSemester,
  handleDrop,
  removeCourseFromSemester,
  updatePlannedCourse,
  onAddCourse,
}: SimulatorSemesterBoardProps) {
  return (
    <>
      {/* Available Courses Pool */}
      <div
        className="sticky top-[72px] z-20 mb-2"
        data-tour="simulator-course-pool"
      >
        <div className="bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-pink-950/30 dark:via-gray-900/50 dark:to-gray-950/50 backdrop-blur-md rounded-xl border border-pink-200 dark:border-pink-800/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.25)] overflow-hidden">
          <button
            onClick={() => setShowPool(!showPool)}
            className={`flex items-center justify-between w-full p-3 ${
              showPool ? "border-b border-pink-200 dark:border-pink-800/30" : ""
            } text-gray-700 dark:text-gray-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors`}
          >
            <div className="flex items-center gap-2 font-medium text-sm">
              <div>Quick-add: Pool of remaining courses from your major</div>
              <div className="relative group">
                <Info className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer" />
                <div className="absolute z-50 bottom-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900/95 backdrop-blur-sm text-gray-700 dark:text-gray-300 text-[10px] px-2 py-1 rounded-md border border-gray-200 dark:border-gray-800/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  May not include all. Add manually if not.
                </div>
              </div>
            </div>
            {showPool ? (
              <FiChevronUp className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <FiChevronDown className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>

          <AnimatePresence>
            {showPool && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="p-3"
              >
                {availableCourses.length === 0 ? (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">
                    All available courses have been scheduled. Remove one from a
                    semester to add it back.
                  </p>
                ) : (
                  <div className="max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1.5">
                    {availableCourses.map((course) => (
                      <motion.div
                        key={course.code}
                        draggable
                        onDragStart={() => handleDragStart(course)}
                        onClick={() =>
                          setSelectedPoolCourse((prev) =>
                            prev?.code === course.code ? null : course,
                          )
                        }
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-2 py-1 rounded-lg text-xs cursor-grab active:cursor-grabbing select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border ${
                          selectedPoolCourse?.code === course.code
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-400 dark:border-purple-600 ring-2 ring-purple-400/50"
                            : "bg-pink-100 dark:bg-pink-900/25 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700/40"
                        }`}
                      >
                        {course.code}
                        <span className="text-[10px] text-pink-500/70 dark:text-pink-200/50 ml-1">
                          {(getCourseNameFromCode(course.code) ?? "").length > 0
                            ? ` ${getCourseNameFromCode(course.code)}`
                            : ""}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Semesters Grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
        data-tour="simulator-board"
      >
        {semesters.map((semester) => {
          const semCredits = getSemesterCredits(semester);
          const semCreditsLabel = Number.isInteger(semCredits)
            ? String(semCredits)
            : semCredits.toFixed(1);
          const isPast = isPastSemester(semester.name);
          const isPlaceTarget = !!selectedPoolCourse && !isPast;

          return (
            <motion.div
              key={semester.id}
              onClick={() => {
                if (selectedPoolCourse && !isPast) {
                  placeCourseInSemester(selectedPoolCourse, semester.id);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!isPast) setHoveredSemester(semester.id);
              }}
              onDragLeave={() => setHoveredSemester(null)}
              onDrop={() => {
                if (isPast) return;
                handleDrop(semester.id);
                setHoveredSemester(null);
              }}
              className={`bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md rounded-xl border p-3 min-h-[160px] flex flex-col transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.2)]
                ${
                  hasInProgress(semester)
                    ? "border-blue-700/50 ring-1 ring-blue-500/30"
                    : isPast
                      ? "border-gray-300 dark:border-gray-700/60 opacity-80"
                      : "border-gray-200 dark:border-gray-800/50"
                }
                ${
                  hoveredSemester === semester.id &&
                  draggedCourse &&
                  !isPast
                    ? "ring-2 ring-pink-400/60 scale-[0.98] bg-gray-100 dark:bg-gray-800/60"
                    : ""
                }
                ${
                  isPlaceTarget
                    ? "ring-2 ring-purple-400/50 cursor-pointer"
                    : ""
                }`}
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  {semester.name}
                  {isPast && (
                    <span
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-medium uppercase tracking-wider bg-gray-200 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-700/50"
                      title="Past semesters are locked"
                    >
                      <FiLock size={9} />
                      Locked
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-1.5">
                  <span
                    className="px-1.5 py-0.5 rounded-md text-[10px] bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700/40"
                    title="Sum of credits in this semester"
                  >
                    {semCreditsLabel} cr
                  </span>
                  {!isPast && (
                    <button
                      onClick={() => onAddCourse(semester.id)}
                      data-tour="simulator-semester-add"
                      className="px-1.5 py-0.5 text-[10px] rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 border border-blue-300 dark:border-blue-800/40 transition-all"
                      type="button"
                    >
                      <FiPlus className="inline-block mr-0.5" size={10} />
                      Add
                    </button>
                  )}
                </div>
              </div>

              {semester.courses.length === 0 ? (
                <div
                  className={`flex-1 flex items-center justify-center border border-dashed rounded-lg p-3 min-h-[48px] transition-all
                    ${
                      hoveredSemester === semester.id &&
                      draggedCourse &&
                      !isPast
                        ? "border-pink-400/60 bg-pink-50 dark:bg-pink-900/15"
                        : "border-gray-200 dark:border-gray-700/50"
                    }`}
                >
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center opacity-70">
                    {selectedPoolCourse
                      ? "Tap to place selected course"
                      : "Drag from pool or add manually"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {semester.courses.map((course) => (
                    <motion.div
                      key={`${semester.id}-${course.code}`}
                      draggable={course.status === "not-taken"}
                      onDragStart={
                        course.status === "not-taken"
                          ? () => handleDragStart(course, semester.id)
                          : undefined
                      }
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex ${
                        course.status === "not-taken" &&
                        (showGrades || showDistributionals)
                          ? "flex-col items-stretch"
                          : "items-center justify-between"
                      } px-2 py-1 rounded-lg text-xs select-none transition-all border relative group shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
                        ${
                          course.status === "completed"
                            ? "bg-emerald-100 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/40"
                            : course.status === "in-progress"
                              ? "bg-blue-100 dark:bg-blue-900/25 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700/40"
                              : "bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700/40 hover:bg-pink-200 dark:hover:bg-pink-800/30 cursor-grab active:cursor-grabbing"
                        }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div>
                          {course.code}
                          <span className="text-[10px] opacity-60 ml-1">
                            {getCourseNameFromCode(course.code) ?? ""}
                          </span>
                        </div>
                        {course.status === "not-taken" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCourseFromSemester(
                                semester.id,
                                course.code,
                              );
                            }}
                            className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-300 hover:text-red-200"
                          >
                            <FiTrash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      {course.status === "not-taken" &&
                        (showGrades || showDistributionals) && (
                          <div
                            className="w-full mt-1.5 pt-1.5 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            draggable
                            onDragStart={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            {showGrades && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] opacity-60">
                                  Grade
                                </span>
                                <CourseGradeControl
                                  value={course.grade}
                                  onChange={(grade) =>
                                    updatePlannedCourse(
                                      semester.id,
                                      course.code,
                                      { grade },
                                    )
                                  }
                                />
                              </div>
                            )}
                            {showDistributionals && (
                              <CourseDistributionalControl
                                value={course.distributionals ?? []}
                                onChange={(codes) =>
                                  updatePlannedCourse(semester.id, course.code, {
                                    distributionals: codes,
                                  })
                                }
                              />
                            )}
                          </div>
                        )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
