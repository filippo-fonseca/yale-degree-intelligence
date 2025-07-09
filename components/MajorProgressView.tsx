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

export default function MajorProgressView({
  selectedMajor,
  progress,
  onRequirementChange,
}: MajorProgressViewProps) {
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    completed: true,
    remaining: true,
  });

  const handleSkip = async (courseCode: string, courseName: string) => {
    if (!user?.uid) return;
    try {
      await skipCourse(user.uid, courseCode, courseName);
      onRequirementChange();
    } catch (error) {
      console.error("Error skipping course:", error);
    }
  };

  const handleUnskip = async (courseCode: string) => {
    if (!user?.uid) return;
    try {
      await unskipCourse(user.uid, courseCode);
      onRequirementChange();
    } catch (error) {
      console.error("Error unskipping course:", error);
    }
  };

  const toggleDropdown = (reqId: string) => {
    setDropdownOpen(dropdownOpen === reqId ? null : reqId);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className={`space-y-6 font-louize`}>
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
            {progress.percentage.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-900 rounded-full h-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress.percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Credits"
          value={`${progress.completedCredits}/${progress.totalCredits}`}
          color="text-blue-300"
        />
        <StatCard
          label="Requirements"
          value={`${progress.completedRequirements.length}/${
            progress.completedRequirements.length +
            progress.remainingRequirements.length
          }`}
          color="text-purple-300"
        />
        <StatCard
          label="Completion"
          value={`${progress.percentage.toFixed(0)}%`}
          color="text-emerald-300"
        />
      </div>

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
                Completed ({progress.completedRequirements.length})
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
                    {progress.completedRequirements.map((req, i) => (
                      <motion.div
                        key={`completed-${i}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-emerald-500/30 transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-emerald-300">
                            {req.name}
                          </h5>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-emerald-900/20 text-emerald-300 px-2 py-1 rounded-full">
                              ✓ Complete
                            </span>
                            {req.options.some(
                              (opt) => opt.completed && opt.credits === 0
                            ) && (
                              <button
                                onClick={() => {
                                  const skippedCourse = req.options.find(
                                    (opt) => opt.completed && opt.credits === 0
                                  );
                                  if (skippedCourse) {
                                    handleUnskip(skippedCourse.code);
                                  }
                                }}
                                className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full flex items-center hover:bg-gray-700"
                              >
                                <FiX className="mr-1" />
                                Undo Skip
                              </button>
                            )}
                          </div>
                        </div>
                        {req.description && (
                          <p className="text-xs text-emerald-300/80 mb-3">
                            {req.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {req.options
                            .filter((o) => o.completed)
                            .map((opt, j) => (
                              <div
                                key={`opt-${j}`}
                                className={`px-2 py-0.5 rounded-full text-xs flex items-center ${
                                  opt.credits === 0
                                    ? "bg-gray-800 text-gray-300"
                                    : "bg-emerald-900/20 text-emerald-300"
                                }`}
                              >
                                {opt.code}
                                <span className="ml-1 text-[0.65rem]">
                                  ({opt.credits}cr
                                  {opt.credits === 0 ? ", skipped" : ""})
                                </span>
                              </div>
                            ))}
                        </div>
                      </motion.div>
                    ))}
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
                Remaining ({progress.remainingRequirements.length})
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
                    {progress.remainingRequirements.map((req, i) => (
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
                                  const firstOption = req.options.find(
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
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {req.options
                              .filter((o) => o.required)
                              .map((opt, j) => (
                                <div
                                  key={`req-${j}`}
                                  className={`px-2 py-0.5 rounded-full text-xs flex items-center ${
                                    opt.completed
                                      ? "bg-emerald-900/20 text-emerald-300"
                                      : "bg-amber-900/20 text-amber-300"
                                  }`}
                                >
                                  {opt.code}
                                  {opt.completed && (
                                    <span className="ml-1 text-[0.65rem]">
                                      ✓
                                    </span>
                                  )}
                                </div>
                              ))}
                          </div>
                          {req.options.some(
                            (o) => !o.required && o.completed
                          ) && (
                            <div>
                              <p className="text-xs text-gray-400 mb-1">
                                Extra completed:
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {req.options
                                  .filter((o) => !o.required && o.completed)
                                  .map((opt, j) => (
                                    <div
                                      key={`extra-${j}`}
                                      className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded-full text-xs"
                                    >
                                      {opt.code}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
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
