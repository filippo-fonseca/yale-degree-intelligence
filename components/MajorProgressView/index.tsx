"use client";

import { MajorProgress } from "@/lib/majors";
import { MAJORS } from "@/lib/majors";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiChevronDown, FiInfo, FiPlus } from "react-icons/fi";
import { skipCourse, unskipCourse } from "@/lib/utils/courseOperations";
import CourseModal from "./CourseModal";
import DegreeIntelligenceBlurb from "./DegreeIntelligenceBlurb";
import AddManualCourseModal from "../AddManualCourseModal/AddManualCourseModal";
import { Course } from "@/lib/types";

// Status color mapping for course pills
function getCourseStatusColor({
  completed,
  inProgress,
  skipped,
  grade,
}: {
  completed: boolean;
  inProgress: boolean;
  skipped?: boolean;
  grade?: string | null;
}) {
  if (skipped)
    return "bg-gray-800 text-gray-300 border border-dashed border-gray-600";
  if (completed && grade && grade !== "In Progress")
    return "bg-emerald-900/20 text-emerald-300 border border-emerald-700";
  if (inProgress || grade === "In Progress")
    return "bg-blue-900/20 text-blue-300 border border-blue-700";
  return "bg-amber-900/20 text-amber-300 border border-amber-700";
}

function MajorStatCard({
  label,
  value,
  color = "text-white",
  infoTooltip,
}: {
  label: string;
  value: string | number;
  color?: string;
  infoTooltip?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-gray-700 transition-all relative"
    >
      {infoTooltip && (
        <div className="absolute top-2 right-2 group">
          <FiInfo className="w-4 h-4 text-gray-400 hover:text-gray-300" />
          <div className="absolute z-10 right-0 w-48 p-2 text-xs text-gray-300 bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            {infoTooltip}
          </div>
        </div>
      )}
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-xl font-medium mt-1 ${color}`}>{value}</p>
    </motion.div>
  );
}

export default function MajorProgressView({
  selectedMajor,
  progress,
  onRequirementChange,
  courses,
}: {
  selectedMajor: string;
  progress: MajorProgress;
  onRequirementChange: () => void;
  courses: Course[];
}) {
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    completed: true,
    remaining: true,
  });
  const [showInProgressStats, setShowInProgressStats] = useState(false);
  //course options:
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  //manual add:
  const [manualCourseModal, setManualCourseModal] = useState<{
    isOpen: boolean;
    requirement: string;
  }>({ isOpen: false, requirement: "" });

  const [modalOpen, setModalOpen] = useState<{
    isOpen: boolean;
    course: {
      code: string;
      name: string;
      status: "completed" | "in-progress" | "not-taken" | "skipped";
      skipped: boolean;
    } | null;
  }>({ isOpen: false, course: null });

  const handleSkip = async (courseCode: string, courseName: string) => {
    if (!user) return;
    try {
      await skipCourse(user.uid, courseCode, courseName);
      await onRequirementChange();
    } catch (error) {
      console.error("Error skipping course:", error);
    }
  };

  const handleUnskip = async (courseCode: string) => {
    if (!user) return;
    try {
      await unskipCourse(user.uid, courseCode);
      await onRequirementChange();
    } catch (error) {
      console.error("Error unskipping course:", error);
    }
  };

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      // If click outside the dropdown or trigger, close
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [dropdownOpen]);

  const toggleDropdown = (reqIdx: number, optIdx: number) => {
    const key = `${reqIdx}-${optIdx}`;
    setDropdownOpen(dropdownOpen === key ? null : key);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Calculate stats
  const completedCredits = progress.completedCredits;
  const inProgressCredits = progress.inProgressCredits || 0;
  const totalCredits = progress.totalCredits;
  const completionPercentage = progress.percentage;
  const withInProgressPercentage =
    progress.inProgressPercentage || progress.percentage;

  return (
    <div className="space-y-6 font-louize">
      <div className="flex items-start gap-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-sm text-gray-300">
        <FiInfo className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Pro tip: Click on each course for actions and more info.</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
            {MAJORS[selectedMajor]}
          </h3>
          {/* <p className="text-sm text-gray-400">{MAJORS[selectedMajor]}</p> */}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
            {showInProgressStats
              ? withInProgressPercentage.toFixed(0)
              : completionPercentage.toFixed(0)}
            %
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-900 rounded-full h-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{
            width: `${
              showInProgressStats
                ? withInProgressPercentage
                : completionPercentage
            }%`,
          }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
        />
      </div>

      {/* Stats toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Show:</span>
        <button
          onClick={() => setShowInProgressStats(false)}
          className={`px-3 py-1 text-xs rounded-full ${
            !showInProgressStats
              ? "bg-blue-900/50 text-blue-300 border border-blue-700"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Completed Credits Only
        </button>
        <button
          onClick={() => setShowInProgressStats(true)}
          className={`px-3 py-1 text-xs rounded-full ${
            showInProgressStats
              ? "bg-purple-900/50 text-purple-300 border border-purple-700"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Including In Progress Credits
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MajorStatCard
          label="Total Credits"
          value={
            showInProgressStats
              ? `${completedCredits + inProgressCredits}/${totalCredits}`
              : `${completedCredits}/${totalCredits}`
          }
          color={showInProgressStats ? "text-purple-300" : "text-blue-300"}
          infoTooltip="This shows your completed credits out of the total—including any prereqs!—required for your indicated major."
        />
        <MajorStatCard
          label="Completion"
          value={`${(showInProgressStats
            ? withInProgressPercentage
            : completionPercentage
          ).toFixed(0)}%`}
          color="text-emerald-300"
        />
      </div>

      <DegreeIntelligenceBlurb />
      {/* Requirements Sections */}
      <div className="space-y-6">
        {/* Completed Requirements */}
        {progress.completedRequirements.length > 0 && (
          <div className="space-y-4">
            <button
              onClick={() => toggleSection("completed")}
              className="flex items-center gap-2 text-emerald-300 hover:text-emerald-200 transition-colors"
            >
              <motion.div
                animate={{ rotate: expandedSections.completed ? 0 : -90 }}
              >
                <FiChevronDown />
              </motion.div>
              <h4 className="font-medium">
                Completed ({progress.completedCredits}/{progress.totalCredits}{" "}
                credits)
              </h4>
            </button>

            <AnimatePresence>
              {expandedSections.completed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {progress.completedRequirements.map((req, i) => {
                      const isFullyCompleted = req.completed >= req.required;
                      const hasManualCourses = req.options.some(
                        (o) => o.manual
                      );

                      return (
                        <motion.div
                          key={`completed-${i}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`p-4 rounded-xl border ${
                            isFullyCompleted && !hasManualCourses
                              ? "bg-emerald-900/10 border-emerald-800/30"
                              : "bg-amber-900/10 border-amber-800/30"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h5
                              className={`font-medium ${
                                isFullyCompleted && !hasManualCourses
                                  ? "text-emerald-300"
                                  : "text-amber-300"
                              }`}
                            >
                              {req.name}
                            </h5>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs ${
                                  isFullyCompleted && !hasManualCourses
                                    ? "bg-emerald-900/20 text-emerald-300"
                                    : "bg-amber-900/20 text-amber-300"
                                } px-2 py-1 rounded-full`}
                              >
                                {isFullyCompleted && !hasManualCourses
                                  ? "✓"
                                  : `${req.completed}/${req.required}`}
                              </span>
                            </div>
                          </div>
                          {req.description && (
                            <p
                              className={`text-xs mb-3 ${
                                isFullyCompleted && !hasManualCourses
                                  ? "text-emerald-300/80"
                                  : "text-amber-300/80"
                              }`}
                            >
                              {req.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {req.options
                              .filter(
                                (opt) =>
                                  opt.completed || opt.manual || opt.skipped
                              )
                              .map((opt, j) => (
                                <div
                                  key={`opt-${j}`}
                                  className={`relative px-2 py-0.5 rounded-full text-xs flex items-center ${
                                    opt.manual
                                      ? "bg-purple-900/20 text-purple-300 border border-purple-700"
                                      : opt.completed
                                      ? "bg-emerald-900/20 text-emerald-300 border border-emerald-700"
                                      : "bg-gray-900/20 text-gray-300 border border-dashed border-gray-600"
                                  }`}
                                >
                                  {opt.code}
                                  <span className="ml-1 text-[0.65rem]">
                                    ({opt.credits}cr
                                    {opt.manual && ", manual"}
                                    {opt.skipped && ", skipped"})
                                  </span>
                                  {(opt.skipped || opt.manual) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (opt.skipped) {
                                          handleUnskip(opt.code);
                                        } else if (opt.manual) {
                                          // Add logic here to handle removing manual courses if needed
                                        }
                                      }}
                                      className="ml-1 text-[0.65rem] text-gray-400 hover:text-gray-200"
                                    >
                                      <FiX size={10} />
                                    </button>
                                  )}
                                </div>
                              ))}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {/* Remaining Requirements */}
        {progress.remainingRequirements.length > 0 && (
          <div className="space-y-4">
            <button
              onClick={() => toggleSection("remaining")}
              className="flex items-center gap-2 text-amber-300 hover:text-amber-200 transition-colors"
            >
              <motion.div
                animate={{ rotate: expandedSections.remaining ? 0 : -90 }}
              >
                <FiChevronDown />
              </motion.div>
              <h4 className="font-medium">
                Remaining (
                {progress.remainingRequirements.reduce(
                  (total, req) => total + (req.required || 0),
                  0
                )}{" "}
                credits)
              </h4>
            </button>

            <AnimatePresence>
              {expandedSections.remaining && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {progress.remainingRequirements.map((req, reqIdx) => {
                      const reqCompleted = req.options
                        .filter((o) => o.completed)
                        .reduce((sum, o) => sum + o.credits, 0);
                      const reqInProgress = req.options
                        .filter((o) => o.inProgress)
                        .reduce((sum, o) => sum + o.credits, 0);

                      const notStarted =
                        reqCompleted === 0 && reqInProgress === 0;

                      return (
                        <motion.div
                          key={`remaining-${reqIdx}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: reqIdx * 0.05 }}
                          className={`p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm border ${
                            notStarted
                              ? "border-red-800/30 hover:border-red-500/30"
                              : "border-amber-800/30 hover:border-amber-500/30"
                          } transition-all relative`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h5
                              className={`font-medium ${
                                notStarted ? "text-red-300" : "text-amber-300"
                              }`}
                            >
                              {req.name}
                            </h5>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs ${
                                  notStarted
                                    ? "bg-red-900/20 text-red-300"
                                    : "bg-amber-900/20 text-amber-300"
                                } px-2 py-1 rounded-full`}
                              >
                                {reqInProgress + reqCompleted}/{req.required}
                              </span>
                            </div>
                          </div>

                          {req.description && (
                            <p
                              className={`text-xs ${
                                notStarted
                                  ? "text-red-300/80"
                                  : "text-amber-300/80"
                              } mb-3`}
                            >
                              {req.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-1.5">
                            {req.options.map((opt, optIdx) => {
                              const dropdownKey = `${reqIdx}-${optIdx}`;
                              return (
                                <div
                                  key={`opt-${optIdx}`}
                                  className={`relative px-2 py-0.5 rounded-full text-xs flex items-center transition-all duration-150 cursor-pointer hover:scale-[1.05] ${
                                    opt.manual
                                      ? "bg-purple-900/20 text-purple-300 border border-purple-700"
                                      : opt.completed
                                      ? "bg-emerald-900/20 text-emerald-300 border border-emerald-700"
                                      : opt.inProgress
                                      ? "bg-blue-900/20 text-blue-300 border border-blue-700"
                                      : opt.skipped
                                      ? "bg-gray-900/20 text-gray-300 border border-dashed border-gray-600"
                                      : notStarted
                                      ? "bg-red-900/20 text-red-300 border border-red-700"
                                      : "bg-amber-900/20 text-amber-300 border border-amber-700"
                                  }`}
                                  onClick={() => {
                                    if (!opt.completed && !opt.skipped) {
                                      setModalOpen({
                                        isOpen: true,
                                        course: {
                                          code: opt.code,
                                          name: opt.name,
                                          status: opt.skipped
                                            ? "skipped"
                                            : opt.inProgress
                                            ? "in-progress"
                                            : opt.completed
                                            ? "completed"
                                            : "not-taken",
                                          skipped: opt.skipped || false,
                                        },
                                      });
                                    }
                                  }}
                                >
                                  {opt.code}
                                  <span className="ml-1 text-[0.65rem]">
                                    ({opt.credits}cr
                                    {opt.manual
                                      ? ", manual"
                                      : opt.skipped
                                      ? ", skipped"
                                      : opt.inProgress
                                      ? ", in progress"
                                      : opt.completed
                                      ? ", complete"
                                      : ""}
                                    )
                                  </span>
                                  {(opt.skipped || opt.manual) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (opt.skipped) {
                                          handleUnskip(opt.code);
                                        }
                                      }}
                                      className="ml-1 text-[0.65rem] text-gray-400 hover:text-gray-200"
                                      title={
                                        opt.manual
                                          ? "Remove manual course"
                                          : "Unskip this course"
                                      }
                                    >
                                      <FiX size={10} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            {/* Add manual course button */}
                            <button
                              onClick={() =>
                                setManualCourseModal({
                                  isOpen: true,
                                  requirement: `${selectedMajor}|${req.name}`,
                                })
                              }
                              className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                                notStarted
                                  ? "bg-red-900/20 text-red-300 hover:bg-red-800/30"
                                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                              } transition-colors`}
                              title="Add a course manually for this requirement"
                            >
                              <FiPlus size={12} />
                              Add Course
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      {/* Course Info Modal */}
      <CourseModal
        isOpen={modalOpen.isOpen}
        course={modalOpen.course}
        onClose={() => setModalOpen({ isOpen: false, course: null })}
        onSkip={handleSkip}
        onRefresh={onRequirementChange}
      />
      <AddManualCourseModal
        isOpen={manualCourseModal.isOpen}
        requirement={manualCourseModal.requirement}
        onClose={() => setManualCourseModal({ isOpen: false, requirement: "" })}
        onSuccess={onRequirementChange}
        userCourses={courses}
      />
    </div>
  );
}
