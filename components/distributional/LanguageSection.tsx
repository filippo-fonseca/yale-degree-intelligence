"use client";

import { Course } from "@/lib/types";
import { motion } from "framer-motion";
import { FiCheck, FiInfo } from "react-icons/fi";
import { STATUS_CLASSES } from "../MajorProgressView/requirementStatus";
import { LANG_LEVELS } from "./constants";

// ─── Language section ─────────────────────────────────────────────────────────

export function LanguageSection({
  distMap,
}: {
  distMap: Record<string, Course[]>;
}) {
  const getCount = (code: string) => (distMap[code] || []).length;
  const getCoursesFor = (code: string): Course[] => distMap[code] || [];

  const taggedLevels = LANG_LEVELS.filter((l) => getCount(l) > 0);
  const placementLevel =
    taggedLevels.length > 0
      ? Math.min(...taggedLevels.map((l) => parseInt(l.slice(1))))
      : null;

  const getRequiredLevels = (placement: number): string[] => {
    switch (placement) {
      case 1: return ["L1", "L2", "L3"];
      case 2: return ["L2", "L3", "L4"];
      case 3: return ["L3", "L4"];
      case 4: return ["L4"];
      case 5: return ["L5"];
      default: return [];
    }
  };

  const requiredLevels = placementLevel ? getRequiredLevels(placementLevel) : [];
  const completedRequired = requiredLevels.filter((l) => getCount(l) > 0);
  const progress =
    requiredLevels.length > 0 ? completedRequired.length / requiredLevels.length : 0;
  const isComplete =
    requiredLevels.length > 0 &&
    completedRequired.length === requiredLevels.length;
  const nextNeeded = requiredLevels.find((l) => getCount(l) === 0);

  // Derive status for header card styling
  const langStatus = isComplete
    ? "completed"
    : placementLevel !== null && completedRequired.length > 0
    ? "partial"
    : "notStarted";
  const langStatusClasses = STATUS_CLASSES[langStatus];

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        Language
      </h3>

      <div className={`p-4 rounded-xl border transition-all backdrop-blur-md shadow-neu ${langStatusClasses.card}`}>
        {/* Placement + progress */}
        {placementLevel !== null && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Placed into{" "}
                <span className="text-teal-600 dark:text-teal-300 font-semibold">
                  L{placementLevel}
                </span>
              </span>
              {isComplete && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                  Complete
                </span>
              )}
            </div>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {Math.round(progress * 100)}%
            </span>
          </div>
        )}

        {placementLevel !== null && (
          <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-800/70 rounded-full overflow-hidden mb-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                backgroundColor: isComplete ? "#34d399" : "#2dd4bf",
                boxShadow: isComplete
                  ? "0 0 10px rgba(52,211,153,0.75)"
                  : "0 0 10px rgba(45,212,191,0.75)",
              }}
            />
          </div>
        )}

        {/* L-level track */}
        <div className="relative py-2 mb-4">
          <div className="absolute top-[22px] left-[10%] right-[10%] h-0.5 bg-gray-200 dark:bg-gray-800 rounded-full" />
          <div className="relative flex justify-between px-2">
            {LANG_LEVELS.map((level) => {
              const levelNum = parseInt(level.slice(1));
              const hasLevel = getCount(level) > 0;
              const coursesForLevel = getCoursesFor(level);
              const isRequired = requiredLevels.includes(level);
              const isNext = level === nextNeeded;
              const isNotNeeded = placementLevel !== null && !isRequired;

              let circleClass = "";
              let showCheck = false;
              let subLabel = "";

              if (hasLevel) {
                circleClass =
                  "bg-teal-500/20 border-teal-400 text-teal-600 dark:text-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.15)]";
                showCheck = true;
              } else if (isNext) {
                circleClass =
                  "bg-amber-500/20 border-amber-400 text-amber-600 dark:text-amber-300 ring-2 ring-amber-400/30 ring-offset-2 ring-offset-white dark:ring-offset-gray-900";
                subLabel = "Next";
              } else if (isRequired) {
                circleClass =
                  "bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600 text-gray-500 dark:text-gray-400";
                subLabel = "Needed";
              } else if (isNotNeeded) {
                circleClass =
                  "bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-800 text-gray-400 dark:text-gray-600";
                subLabel = levelNum < (placementLevel ?? 0) ? "Placed out" : "";
              } else {
                circleClass =
                  "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500";
              }

              return (
                <div key={level} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 z-10 transition-all ${circleClass}`}
                  >
                    {showCheck ? <FiCheck size={16} strokeWidth={3} /> : level.slice(1)}
                  </div>
                  <span
                    className={`text-xs mt-1.5 font-medium ${
                      hasLevel
                        ? "text-teal-600 dark:text-teal-300"
                        : isNext
                        ? "text-amber-600 dark:text-amber-300"
                        : isRequired
                        ? "text-gray-500 dark:text-gray-400"
                        : "text-gray-400 dark:text-gray-600"
                    }`}
                  >
                    {level}
                  </span>
                  {coursesForLevel.length > 0 ? (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 max-w-[70px] truncate text-center">
                      {coursesForLevel[0].code}
                    </span>
                  ) : subLabel ? (
                    <span
                      className={`text-[10px] mt-0.5 ${
                        isNext
                          ? "text-amber-500 dark:text-amber-400 font-medium"
                          : "text-gray-400 dark:text-gray-600"
                      }`}
                    >
                      {subLabel}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status message */}
        {placementLevel === null ? (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-3">
            <p className="text-xs text-blue-600 dark:text-blue-300">
              Tag your first language course to track your progress. Your placement level will be inferred from the lowest L-level you tag.
            </p>
          </div>
        ) : !isComplete && nextNeeded ? (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3">
            <p className="text-xs text-amber-600 dark:text-amber-300">
              <strong>Next up:</strong> Complete an{" "}
              <span className="font-semibold">{nextNeeded}</span> course.
              {requiredLevels.length - completedRequired.length > 1 && (
                <> Then: {requiredLevels.filter((l) => getCount(l) === 0 && l !== nextNeeded).join(", ")}.</>
              )}
            </p>
          </div>
        ) : isComplete ? (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-3">
            <p className="text-xs text-emerald-600 dark:text-emerald-300">
              Language requirement complete for your L{placementLevel} placement.
            </p>
          </div>
        ) : null}

        {/* Info note */}
        <div className="p-3 rounded-lg bg-gray-100/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800">
          <div className="flex items-start gap-2">
            <FiInfo className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" size={14} />
            <p className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed">
              Requirements by placement:{" "}
              <span className="text-gray-600 dark:text-gray-400">L1 → L1–L3</span>{" "}
              |{" "}
              <span className="text-gray-600 dark:text-gray-400">L2 → L2–L4</span>{" "}
              |{" "}
              <span className="text-gray-600 dark:text-gray-400">L3 → L3–L4</span>{" "}
              |{" "}
              <span className="text-gray-600 dark:text-gray-400">L4/L5 → just that course</span>.
              Placement is inferred from your lowest tagged level. Verify with your dean or DUS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
