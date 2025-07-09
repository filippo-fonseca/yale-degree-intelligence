// src/components/MajorProgressView.tsx
"use client";

import { MajorProgress } from "@/lib/majors";
import { MAJORS } from "@/lib/majors";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { FiMoreVertical, FiX, FiCheck } from "react-icons/fi";
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

  return (
    <div className="neumorphic-card p-6 rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
            {MAJORS[selectedMajor].name}
          </h3>
          <p className="text-sm text-gray-400">
            {MAJORS[selectedMajor].description}
          </p>
        </div>
        <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
          {progress.percentage.toFixed(0)}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-800 rounded-full h-3 mb-6">
        <div
          className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full"
          style={{ width: `${progress.percentage}%` }}
        ></div>
      </div>

      {/* Credit summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="neumorphic-card p-4 rounded-lg">
          <p className="text-sm text-gray-400">Total Credits</p>
          <p className="text-2xl font-medium">
            {progress.completedCredits}/{progress.totalCredits}
          </p>
        </div>
        <div className="neumorphic-card p-4 rounded-lg">
          <p className="text-sm text-gray-400">Requirements Completed</p>
          <p className="text-2xl font-medium">
            {progress.completedRequirements.length}/
            {progress.completedRequirements.length +
              progress.remainingRequirements.length}
          </p>
        </div>
      </div>

      {/* Requirements grid */}
      <div className="space-y-8">
        {/* Completed requirements */}
        {progress.completedRequirements.length > 0 && (
          <div>
            <h4 className="font-bold text-lg mb-4 text-emerald-400">
              Completed Requirements
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {progress.completedRequirements.map((req, i) => (
                <div
                  key={i}
                  className="neumorphic-card p-4 rounded-lg border-l-4 border-emerald-500"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium text-emerald-400">{req.name}</h5>
                    <div className="flex items-center">
                      <span className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded-full">
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
                          className="ml-2 text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full flex items-center hover:bg-gray-700"
                        >
                          <FiX className="mr-1" />
                          Undo Skip
                        </button>
                      )}
                    </div>
                  </div>
                  {req.description && (
                    <p className="text-xs text-emerald-300 mb-2">
                      {req.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {req.options
                      .filter((o) => o.completed)
                      .map((opt, j) => (
                        <div
                          key={j}
                          className={`px-2 py-0.5 rounded-full text-xs flex items-center ${
                            opt.credits === 0
                              ? "bg-gray-800 text-gray-300"
                              : "bg-emerald-900/30 text-emerald-400"
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remaining requirements */}
        {progress.remainingRequirements.length > 0 && (
          <div>
            <h4 className="font-bold text-lg mb-4 text-amber-400">
              Remaining Requirements
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {progress.remainingRequirements.map((req, i) => (
                <div
                  key={i}
                  className="neumorphic-card p-4 rounded-lg border-l-4 border-amber-500 relative"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium text-amber-400">{req.name}</h5>
                    <div className="flex items-center">
                      <span className="text-xs bg-amber-900/30 text-amber-400 px-2 py-1 rounded-full">
                        {req.completed}/{req.required}
                      </span>
                      <button
                        onClick={() => toggleDropdown(`req-${i}`)}
                        className="ml-2 p-1 text-gray-400 hover:text-gray-200"
                      >
                        <FiMoreVertical />
                      </button>
                    </div>
                  </div>

                  {dropdownOpen === `req-${i}` && (
                    <div className="absolute right-4 top-12 z-10 mt-1 w-48 rounded-md bg-gray-800 shadow-lg border border-gray-700">
                      <button
                        onClick={() => {
                          const firstOption = req.options.find(
                            (opt) => opt.required
                          );
                          if (firstOption) {
                            handleSkip(firstOption.code, firstOption.name);
                          }
                          setDropdownOpen(null);
                        }}
                        className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 w-full text-left flex items-center"
                      >
                        <FiCheck className="mr-2" />
                        Mark as Skipped
                      </button>
                    </div>
                  )}

                  {req.description && (
                    <p className="text-xs text-amber-300 mb-2">
                      {req.description}
                    </p>
                  )}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {req.options
                        .filter((o) => o.required)
                        .map((opt, j) => (
                          <div
                            key={j}
                            className={`px-2 py-0.5 rounded-full text-xs flex items-center ${
                              opt.completed
                                ? "bg-emerald-900/30 text-emerald-400"
                                : "bg-amber-900/30 text-amber-400"
                            }`}
                          >
                            {opt.code}
                            {opt.completed && (
                              <span className="ml-1 text-[0.65rem]">✓</span>
                            )}
                          </div>
                        ))}
                    </div>
                    {req.options.some((o) => !o.required && o.completed) && (
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
