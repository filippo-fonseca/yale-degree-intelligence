"use client";

import { MajorProgress } from "@/lib/majors";
import { MAJORS } from "@/lib/majors";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMoreVertical, FiX, FiCheck, FiChevronDown } from "react-icons/fi";
import { skipCourse, unskipCourse } from "@/lib/utils/courseOperations";

interface MajorProgressViewProps {
  selectedMajor: string;
  progress: MajorProgress;
  onRequirementChange: () => void;
}

function StatCard({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-gray-700 transition-all"
    >
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-xl font-medium mt-1 ${color}`}>{value}</p>
    </motion.div>
  );
}

export default function MajorProgressView({
  selectedMajor,
  progress,
  onRequirementChange,
}: MajorProgressViewProps) {
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    completed: true,
    remaining: true,
    inProgress: true,
  });
  const [showInProgressStats, setShowInProgressStats] = useState(false);

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

  const toggleDropdown = (reqId: string) => {
    setDropdownOpen(dropdownOpen === reqId ? null : reqId);
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
  const completedRequirements = progress.completedRequirements.length;
  const inProgressRequirements = progress.inProgressRequirements?.length || 0;
  const totalRequirements =
    completedRequirements +
    inProgressRequirements +
    progress.remainingRequirements.length;
  const completionPercentage = progress.percentage;
  const withInProgressPercentage =
    progress.inProgressPercentage || progress.percentage;

  return (
    <div className="space-y-6 font-louize">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
            {MAJORS[selectedMajor].name}
          </h3>
          <p className="text-sm text-gray-400">
            {MAJORS[selectedMajor].description}
          </p>
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
          Completed Only
        </button>
        <button
          onClick={() => setShowInProgressStats(true)}
          className={`px-3 py-1 text-xs rounded-full ${
            showInProgressStats
              ? "bg-purple-900/50 text-purple-300 border border-purple-700"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Including In Progress
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Credits"
          value={
            showInProgressStats
              ? `${completedCredits + inProgressCredits}/${totalCredits}`
              : `${completedCredits}/${totalCredits}`
          }
          color={showInProgressStats ? "text-purple-300" : "text-blue-300"}
        />
        <StatCard
          label="Completion"
          value={`${(showInProgressStats
            ? withInProgressPercentage
            : completionPercentage
          ).toFixed(0)}%`}
          color="text-emerald-300"
        />
      </div>

      {/* Requirements Sections */}
      <div className="space-y-6">
        {/* In Progress Requirements */}
        {/* In Progress Requirements Section */}
        {/* In Progress Requirements Section */}
        {progress.inProgressRequirements &&
          progress.inProgressRequirements.length > 0 && (
            <div className="space-y-4">
              <button
                onClick={() => toggleSection("inProgress")}
                className="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors"
              >
                <motion.div
                  animate={{ rotate: expandedSections.inProgress ? 0 : -90 }}
                >
                  <FiChevronDown />
                </motion.div>
                <h4 className="font-medium">
                  In Progress ({progress.inProgressCredits} credits)
                </h4>
              </button>

              <AnimatePresence>
                {expandedSections.inProgress && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {progress.inProgressRequirements.map((req, i) => {
                        // Filter to only show options that are in progress
                        const inProgressOptions = req.options.filter(
                          (o) => o.inProgress
                        );
                        const hasSkipped = req.options.some((o) => o.skipped);

                        if (inProgressOptions.length === 0) return null;

                        return (
                          <motion.div
                            key={`inprogress-${i}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`p-4 rounded-xl backdrop-blur-sm border transition-all ${
                              hasSkipped
                                ? "bg-gray-900/30 border-gray-700 hover:border-gray-600"
                                : "bg-blue-900/10 border-blue-800/30 hover:border-blue-500/30"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h5
                                className={`font-medium ${
                                  hasSkipped ? "text-gray-300" : "text-blue-300"
                                }`}
                              >
                                {req.name}
                              </h5>
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-blue-900/20 text-blue-300 px-2 py-1 rounded-full">
                                  In Progress ({inProgressOptions.length}/
                                  {req.required})
                                </span>
                                {hasSkipped && (
                                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                                    Contains Skipped
                                  </span>
                                )}
                              </div>
                            </div>

                            {req.description && (
                              <p
                                className={`text-xs mb-3 ${
                                  hasSkipped
                                    ? "text-gray-400"
                                    : "text-blue-300/80"
                                }`}
                              >
                                {req.description}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-1.5">
                              {inProgressOptions.map((opt, j) => (
                                <div
                                  key={`opt-${j}`}
                                  className={`px-2 py-0.5 rounded-full text-xs flex items-center ${
                                    opt.skipped
                                      ? "bg-gray-800 text-gray-300 border border-dashed border-gray-600"
                                      : "bg-blue-900/20 text-blue-300"
                                  }`}
                                >
                                  {opt.code}
                                  <span className="ml-1 text-[0.65rem]">
                                    ({opt.credits}cr
                                    {opt.skipped
                                      ? ", skipped"
                                      : ", in progress"}
                                    )
                                  </span>
                                  {opt.skipped && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnskip(opt.code);
                                      }}
                                      className="ml-1 text-[0.65rem] text-gray-400 hover:text-gray-200"
                                      title="Unskip this course"
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
                      const hasSkipped = req.options.some((o) => o.skipped);
                      return (
                        <motion.div
                          key={`completed-${i}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`p-4 rounded-xl border transition-all ${
                            hasSkipped
                              ? "bg-gray-900/30 border-gray-700 hover:border-gray-600"
                              : "bg-emerald-900/10 border-emerald-800/30 hover:border-emerald-500/30"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h5
                              className={`font-medium ${
                                hasSkipped
                                  ? "text-gray-300"
                                  : "text-emerald-300"
                              }`}
                            >
                              {req.name}
                            </h5>
                            <div className="flex items-center gap-2">
                              {hasSkipped ? (
                                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                                  Contains Skipped
                                </span>
                              ) : (
                                <span className="text-xs bg-emerald-900/20 text-emerald-300 px-2 py-1 rounded-full">
                                  ✓ Complete
                                </span>
                              )}
                            </div>
                          </div>

                          {req.description && (
                            <p
                              className={`text-xs mb-3 ${
                                hasSkipped
                                  ? "text-gray-400"
                                  : "text-emerald-300/80"
                              }`}
                            >
                              {req.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-1.5">
                            {req.options
                              .filter((o) => o.completed || o.skipped)
                              .map((opt, j) => (
                                <div
                                  key={`opt-${j}`}
                                  className={`px-2 py-0.5 rounded-full text-xs flex items-center ${
                                    opt.skipped
                                      ? "bg-gray-800 text-gray-300 border border-dashed border-gray-600"
                                      : "bg-emerald-900/20 text-emerald-300"
                                  }`}
                                >
                                  {opt.code}
                                  <span className="ml-1 text-[0.65rem]">
                                    ({opt.credits}cr
                                    {opt.skipped ? ", skipped" : ""})
                                  </span>
                                  {opt.skipped && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnskip(opt.code);
                                      }}
                                      className="ml-1 text-[0.65rem] text-gray-400 hover:text-gray-200"
                                      title="Unskip this course"
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
        {/* Remaining Requirements Section */}
        {progress.remainingRequirements.length > 0 && (
          <div className="space-y-4">
            <AnimatePresence>
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
                          {progress.remainingRequirements.map((req, i) => {
                            // Get all options that are not completed (including in-progress ones)
                            const remainingOptions = req.options.filter(
                              (o) => !o.completed && !o.skipped
                            );

                            // Skip if all options are completed
                            if (remainingOptions.length === 0) return null;

                            return (
                              <motion.div
                                key={`remaining-${i}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-amber-500/30 transition-all relative"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="font-medium text-amber-300">
                                    {req.name}
                                  </h5>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs bg-amber-900/20 text-amber-300 px-2 py-1 rounded-full">
                                      {req.completed}/{req.required}
                                    </span>
                                    <button
                                      onClick={() => toggleDropdown(`req-${i}`)}
                                      className="p-1 text-gray-400 hover:text-gray-200 rounded-full hover:bg-gray-800"
                                    >
                                      <FiMoreVertical />
                                    </button>
                                  </div>
                                </div>

                                <AnimatePresence>
                                  {dropdownOpen === `req-${i}` && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                      className="absolute right-4 top-12 z-10 mt-1 w-48 rounded-md bg-gray-800 shadow-lg border border-gray-700 overflow-hidden"
                                    >
                                      <button
                                        onClick={() => {
                                          const firstOption =
                                            remainingOptions.find(
                                              (opt) => opt.required
                                            );
                                          if (firstOption) {
                                            handleSkip(
                                              firstOption.code,
                                              firstOption.name
                                            );
                                          }
                                          setDropdownOpen(null);
                                        }}
                                        className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 w-full text-left flex items-center gap-2"
                                      >
                                        <FiCheck />
                                        Mark as Skipped
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {req.description && (
                                  <p className="text-xs text-amber-300/80 mb-3">
                                    {req.description}
                                  </p>
                                )}

                                {/* Show all remaining options (both not started and in-progress) */}
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-1.5">
                                    {remainingOptions.map((opt, j) => (
                                      <div
                                        key={`opt-${j}`}
                                        className={`px-2 py-0.5 rounded-full text-xs flex items-center ${
                                          opt.inProgress
                                            ? "bg-blue-900/20 text-blue-300"
                                            : "bg-amber-900/20 text-amber-300"
                                        }`}
                                      >
                                        {opt.code}
                                        <span className="ml-1 text-[0.65rem]">
                                          ({opt.credits}cr
                                          {opt.inProgress
                                            ? ", in progress"
                                            : ""}
                                          )
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Show any extra completed courses */}
                                  {req.options.some(
                                    (o) => o.completed && !o.required
                                  ) && (
                                    <div>
                                      <p className="text-xs text-gray-400 mb-1">
                                        Extra completed:
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {req.options
                                          .filter(
                                            (o) => o.completed && !o.required
                                          )
                                          .map((opt, j) => (
                                            <div
                                              key={`extra-${j}`}
                                              className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-300"
                                            >
                                              {opt.code}
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}
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
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
