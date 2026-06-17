"use client";

import { Course } from "@/lib/types";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import { motion } from "framer-motion";
import { FiCheck, FiInfo } from "react-icons/fi";

const AREA_REQS = [
  { code: "Hu", name: "Humanities & Arts", color: "purple" },
  { code: "So", name: "Social Sciences", color: "sky" },
  { code: "Sc", name: "Sciences", color: "emerald" },
] as const;

const SKILL_REQS = [
  { code: "QR", name: "Quantitative Reasoning", color: "red" },
  { code: "WR", name: "Writing", color: "orange" },
] as const;

const LANG_LEVELS = ["L1", "L2", "L3", "L4", "L5"] as const;

const COLOR_CLASSES: Record<
  string,
  { card: string; text: string; accent: string; bar: string }
> = {
  purple: {
    card: "bg-purple-500/10 border-purple-500/30",
    text: "text-purple-600 dark:text-purple-300",
    accent: "bg-purple-500/20",
    bar: "#a855f7",
  },
  sky: {
    card: "bg-sky-500/10 border-sky-500/30",
    text: "text-sky-600 dark:text-sky-300",
    accent: "bg-sky-500/20",
    bar: "#38bdf8",
  },
  emerald: {
    card: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-300",
    accent: "bg-emerald-500/20",
    bar: "#34d399",
  },
  red: {
    card: "bg-red-500/10 border-red-500/30",
    text: "text-red-600 dark:text-red-300",
    accent: "bg-red-500/20",
    bar: "#f87171",
  },
  orange: {
    card: "bg-orange-500/10 border-orange-500/30",
    text: "text-orange-600 dark:text-orange-300",
    accent: "bg-orange-500/20",
    bar: "#fb923c",
  },
};

const DistributionalsView = ({ courses }: { courses: Course[] }) => {
  // Build distributional -> courses map
  const distMap: Record<string, Course[]> = {};
  courses.forEach((course) => {
    if (course.skipped) return;
    (course.distributionals || []).forEach((d) => {
      if (!distMap[d]) distMap[d] = [];
      distMap[d].push(course);
    });
  });

  const getCount = (code: string) => (distMap[code] || []).length;
  const getCoursesFor = (code: string) => distMap[code] || [];

  const hasAnyDistributionals = courses.some(
    (c) => (c.distributionals || []).length > 0,
  );

  // Total areas + skills progress
  const totalCompleted = [...AREA_REQS, ...SKILL_REQS].reduce(
    (acc, req) => acc + Math.min(getCount(req.code), 2),
    0,
  );

  const renderReqCard = (req: { code: string; name: string; color: string }) => {
    const count = getCount(req.code);
    const coursesForReq = getCoursesFor(req.code);
    const fulfilled = count >= 2;
    const progress = Math.min(count / 2, 1);
    const colors = COLOR_CLASSES[req.color];

    return (
      <motion.div
        key={req.code}
        whileHover={{ y: -2 }}
        className={`p-5 rounded-xl border transition-all ${
          count > 0 ? colors.card : "bg-gray-100/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${
                fulfilled
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                  : `${colors.accent} ${colors.text}`
              }`}
            >
              {req.code}
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{req.name}</span>
          </div>
          {fulfilled && (
            <span className="text-emerald-400">
              <FiCheck size={18} strokeWidth={3} />
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              backgroundColor: fulfilled ? "#34d399" : colors.bar,
            }}
          />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {Math.min(count, 2)} of 2 credits
          </span>
          {count > 2 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">(+{count - 2} extra)</span>
          )}
        </div>

        {/* Course list */}
        {coursesForReq.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-800/50">
            <div className="space-y-1.5">
              {coursesForReq.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                    {course.code}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 truncate ml-2 max-w-[140px]">
                    {getCourseNameFromCode(course.code)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium text-gray-900 dark:text-white">
          Your distributional progress.
        </h2>
        <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 mt-1">
          Track your progress toward Yale's distributional requirements.
        </p>
      </div>

      {/* Prompt if no distributionals assigned */}
      {!hasAnyDistributionals && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-sm text-blue-600 dark:text-blue-300">
            You haven't tagged any courses with distributionals yet. Head to the{" "}
            <strong>My Courses</strong> tab and click{" "}
            <span className="font-mono text-blue-500 dark:text-blue-200">+ dist</span> on your
            courses to start tracking.
          </p>
        </div>
      )}

      {/* Overall progress */}
      <div className="p-4 rounded-xl bg-gray-100/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Overall Areas & Skills Progress
          </span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {totalCompleted}/10
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(totalCompleted / 10) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
          />
        </div>
      </div>

      {/* Areas */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          Areas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AREA_REQS.map(renderReqCard)}
        </div>
      </div>

      {/* Skills */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          Skills
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SKILL_REQS.map(renderReqCard)}
        </div>
      </div>

      {/* Language */}
      {(() => {
        // Determine placement level from lowest L-level tagged
        const taggedLevels = LANG_LEVELS.filter((l) => getCount(l) > 0);
        const placementLevel = taggedLevels.length > 0
          ? Math.min(...taggedLevels.map((l) => parseInt(l.slice(1))))
          : null;

        // Determine required levels based on placement
        // L1 → L1,L2,L3 | L2 → L2,L3,L4 | L3 → L3,L4 | L4 → L4 | L5 → L5
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
        const progress = requiredLevels.length > 0
          ? completedRequired.length / requiredLevels.length
          : 0;
        const isComplete = requiredLevels.length > 0 && completedRequired.length === requiredLevels.length;

        // Find the next level needed
        const nextNeeded = requiredLevels.find((l) => getCount(l) === 0);

        return (
          <div>
            <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Language
            </h3>
            <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
              {/* Progress header */}
              {placementLevel !== null && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Placed into <span className="text-teal-600 dark:text-teal-300 font-medium">L{placementLevel}</span>
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

              {/* Progress bar (only if we know placement) */}
              {placementLevel !== null && (
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: isComplete ? "#34d399" : "#2dd4bf" }}
                  />
                </div>
              )}

              {/* L-level track */}
              <div className="relative py-2 mb-4">
                {/* Background track line */}
                <div className="absolute top-[22px] left-[10%] right-[10%] h-0.5 bg-gray-200 dark:bg-gray-800 rounded-full" />
                <div className="relative flex justify-between px-2">
                  {LANG_LEVELS.map((level) => {
                    const levelNum = parseInt(level.slice(1));
                    const hasLevel = getCount(level) > 0;
                    const coursesForLevel = getCoursesFor(level);
                    const isRequired = requiredLevels.includes(level);
                    const isNext = level === nextNeeded;
                    const isNotNeeded = placementLevel !== null && !isRequired;

                    // Determine circle styling
                    let circleClass = "";
                    let showCheck = false;
                    let labelText = level;
                    let subLabel = "";

                    if (hasLevel) {
                      // Completed
                      circleClass = "bg-teal-500/20 border-teal-400 text-teal-600 dark:text-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.15)]";
                      showCheck = true;
                    } else if (isNext) {
                      // Next needed - highlight
                      circleClass = "bg-amber-500/20 border-amber-400 text-amber-600 dark:text-amber-300 ring-2 ring-amber-400/30 ring-offset-2 ring-offset-white dark:ring-offset-gray-900";
                      subLabel = "Next";
                    } else if (isRequired) {
                      // Required but not next
                      circleClass = "bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600 text-gray-500 dark:text-gray-400";
                      subLabel = "Needed";
                    } else if (isNotNeeded) {
                      // Not required for this placement
                      circleClass = "bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-800 text-gray-400 dark:text-gray-600";
                      subLabel = levelNum < (placementLevel || 0) ? "Placed out" : "";
                    } else {
                      // No placement determined yet
                      circleClass = "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500";
                    }

                    return (
                      <div key={level} className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 z-10 transition-all ${circleClass}`}
                        >
                          {showCheck ? (
                            <FiCheck size={16} strokeWidth={3} />
                          ) : (
                            level.slice(1)
                          )}
                        </div>
                        <span
                          className={`text-xs mt-1.5 font-medium ${
                            hasLevel ? "text-teal-600 dark:text-teal-300" : isNext ? "text-amber-600 dark:text-amber-300" : isRequired ? "text-gray-500 dark:text-gray-400" : "text-gray-400 dark:text-gray-600"
                          }`}
                        >
                          {level}
                        </span>
                        {/* Show course code if completed, otherwise show status label */}
                        {coursesForLevel.length > 0 ? (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 max-w-[70px] truncate text-center">
                            {coursesForLevel[0].code}
                          </span>
                        ) : subLabel ? (
                          <span className={`text-[10px] mt-0.5 ${
                            isNext ? "text-amber-500 dark:text-amber-400 font-medium" : "text-gray-400 dark:text-gray-600"
                          }`}>
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
                    <strong>Next up:</strong> You need to complete an <span className="font-semibold">{nextNeeded}</span> course.
                    {requiredLevels.length - completedRequired.length > 1 && (
                      <> Then: {requiredLevels.filter(l => getCount(l) === 0 && l !== nextNeeded).join(", ")}.</>
                    )}
                  </p>
                </div>
              ) : isComplete ? (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-3">
                  <p className="text-xs text-emerald-600 dark:text-emerald-300">
                    You've completed your language requirement based on your L{placementLevel} placement.
                  </p>
                </div>
              ) : null}

              {/* Language info */}
              <div className="p-3 rounded-lg bg-gray-100/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800">
                <div className="flex items-start gap-2">
                  <FiInfo
                    className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
                    size={14}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed">
                    Requirements by placement: <span className="text-gray-600 dark:text-gray-400">L1 → needs L1-L3</span> | <span className="text-gray-600 dark:text-gray-400">L2 → needs L2-L4</span> | <span className="text-gray-600 dark:text-gray-400">L3 → needs L3-L4</span> | <span className="text-gray-600 dark:text-gray-400">L4/L5 → just that course</span>.
                    Your placement is inferred from your lowest tagged level. Consult your dean or DUS for specifics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Info footer */}
      <div className="p-4 rounded-xl bg-gray-100/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/50">
        <div className="flex items-start gap-3">
          <FiInfo className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" size={16} />
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              <span className="text-gray-700 dark:text-gray-300 font-medium">Areas</span> require 2
              credits each in Humanities & Arts (Hu), Social Sciences (So), and
              Sciences (Sc).
            </p>
            <p>
              <span className="text-gray-700 dark:text-gray-300 font-medium">Skills</span> require 2
              credits each in Quantitative Reasoning (QR) and Writing (WR).
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              This data is based on your manual tagging. Always verify with your
              dean or DUS.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DistributionalsView;
