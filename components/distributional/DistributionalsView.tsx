"use client";

import { Course } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { FiInfo, FiGrid, FiList } from "react-icons/fi";
import {
  allocateDistributionals,
  sumCourseCredits,
} from "@/lib/distributionalAllocation";
import { effectiveDistributionals } from "@/lib/utils/effectiveDistributionals";
import { primaryLanguageTrack } from "@/lib/languageRequirement";
import { AREA_REQS, SKILL_REQS } from "./constants";
import { DistPieChart } from "./DistPieChart";
import { DistStatCard, DistributionalsLoadingSkeleton } from "./DistStatCard";
import { DistHeatMap } from "./DistHeatMap";
import { DistReqCard } from "./DistReqCard";
import { LanguageSection } from "./LanguageSection";
import { AllocationControl } from "./AllocationControl";
import { DistEmptyState } from "./DistEmptyState";
import { useDistributionalPreferences } from "./useDistributionalPreferences";

// ─── Main component ───────────────────────────────────────────────────────────

const DistributionalsView = ({
  courses,
  onGoToCourses,
}: {
  courses: Course[];
  onGoToCourses?: () => void;
}) => {
  const [view, setView] = useState<"board" | "heatmap">("board");
  const { autoAllocate, overrides, setAuto, reassign } =
    useDistributionalPreferences();

  // Data still resolving: render a polished skeleton instead of blank space.
  if (!courses) {
    return <DistributionalsLoadingSkeleton />;
  }

  // Build raw distributional -> courses map (used for languages + the pie,
  // which intentionally show every tag, not the single-counted allocation).
  const distMap: Record<string, Course[]> = {};
  courses.forEach((course) => {
    if (course.skipped) return;
    effectiveDistributionals(course).forEach((d) => {
      if (!distMap[d]) distMap[d] = [];
      distMap[d].push(course);
    });
  });

  const getCount = (code: string) => (distMap[code] || []).length;

  // Single-allocation for the 5 area/skill requirements: each course counts once.
  const allocation = allocateDistributionals(courses, {
    auto: autoAllocate,
    overrides,
  });
  const allocCredits = (code: string) =>
    sumCourseCredits(allocation.coursesByReq[code] || []);
  const allocCoursesFor = (code: string): Course[] =>
    allocation.coursesByReq[code] || [];

  // A course is reassignable only if it is eligible for more than one req.
  const hasMultiTagCourses = courses.some(
    (c) =>
      !c.skipped &&
      (allocation.optionsByCourseKey[allocation.keyOf(c)]?.length ?? 0) > 1,
  );

  const hasAnyDistributionals = courses.some(
    (c) => !c.skipped && effectiveDistributionals(c).length > 0,
  );

  // Summary stats (based on the single-allocation, not raw tags)
  const metCount = [...AREA_REQS, ...SKILL_REQS].filter(
    (r) => allocCredits(r.code) >= 2,
  ).length;
  const inProgressCount = [...AREA_REQS, ...SKILL_REQS].filter(
    (r) => allocCredits(r.code) > 0 && allocCredits(r.code) < 2,
  ).length;
  const remainingCount = [...AREA_REQS, ...SKILL_REQS].filter(
    (r) => allocCredits(r.code) === 0,
  ).length;

  // Language progress for stat card, scored per language (see
  // lib/languageRequirement) and reported from the language that gets furthest.
  const langTrack = primaryLanguageTrack(distMap);
  const langComplete = langTrack?.isComplete ?? false;
  const langStatusText =
    langTrack === null
      ? "Not started"
      : langComplete
      ? "Complete"
      : `${langTrack.completedRequired.length}/${langTrack.requiredLevels.length} levels`;

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

      {/* Summary stat cards (MajorStatCard pattern) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DistStatCard
          label="Total Requirements Completed"
          value={`${metCount}/5`}
          color="text-emerald-600 dark:text-emerald-300"
          infoTooltip="Areas (Hu, So, Sc) and skills (QR, WR) where you've reached at least 2 credits."
        />
        <DistStatCard
          label="In Progress"
          value={inProgressCount}
          color="text-blue-600 dark:text-blue-300"
          infoTooltip="Requirements where you have 1 credit tagged but haven't hit the 2-credit target yet."
        />
        <DistStatCard
          label="Not Started"
          value={remainingCount}
          color={remainingCount === 0 ? "text-emerald-600 dark:text-emerald-300" : "text-red-500 dark:text-red-400"}
        />
        <DistStatCard
          label="Language"
          value={langStatusText}
          color={langComplete ? "text-emerald-600 dark:text-emerald-300" : "text-teal-600 dark:text-teal-300"}
          infoTooltip="Language-requirement progress based on your placement level."
        />
      </div>

      {/* Overall progress bar (areas & skills only — language tracked separately) */}
      <div className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-gray-800/50 shadow-neu">
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Areas &amp; Skills Overall
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700/50 shrink-0">
              Excludes language
            </span>
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 shrink-0">
            {metCount}/5 requirements met
          </span>
        </div>
        <div className="relative w-full bg-gray-200 dark:bg-gray-800/70 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(metCount / 5) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 shadow-[0_0_10px_rgba(168,85,247,0.75)]"
          />
        </div>
      </div>

      {/* Distributional breakdown pie chart */}
      <div data-tour="distributionals-breakdown">
        <DistPieChart distMap={distMap} />
      </div>

      {/* Empty state */}
      {!hasAnyDistributionals && <DistEmptyState onGoToCourses={onGoToCourses} />}

      {/* View switcher */}
      {hasAnyDistributionals && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            View:
          </span>
          <button
            type="button"
            onClick={() => setView("board")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg transition-all duration-200 ${
              view === "board"
                ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-600/40"
                : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400"
            }`}
          >
            <FiList size={11} />
            Board
          </button>
          <button
            type="button"
            onClick={() => setView("heatmap")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg transition-all duration-200 ${
              view === "heatmap"
                ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-600/40"
                : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400"
            }`}
          >
            <FiGrid size={11} />
            Heat map
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === "heatmap" && hasAnyDistributionals ? (
          <motion.div
            key="heatmap"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <DistHeatMap getCount={allocCredits} />
          </motion.div>
        ) : hasAnyDistributionals ? (
          <motion.div
            key="board"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Allocation control */}
            {hasMultiTagCourses && (
              <AllocationControl
                auto={autoAllocate}
                onToggle={setAuto}
              />
            )}

            {/* Areas */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Areas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {AREA_REQS.map((req) => (
                  <DistReqCard
                    key={req.code}
                    req={req}
                    count={allocCredits(req.code)}
                    courses={allocCoursesFor(req.code)}
                    manual={!autoAllocate}
                    allocation={allocation}
                    onReassign={reassign}
                  />
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Skills
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SKILL_REQS.map((req) => (
                  <DistReqCard
                    key={req.code}
                    req={req}
                    count={allocCredits(req.code)}
                    courses={allocCoursesFor(req.code)}
                    manual={!autoAllocate}
                    allocation={allocation}
                    onReassign={reassign}
                  />
                ))}
              </div>
            </div>

            {/* Language */}
            <LanguageSection distMap={distMap} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Info footer */}
      <div className="p-4 rounded-xl bg-gray-100/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/50">
        <div className="flex items-start gap-3">
          <FiInfo className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" size={16} />
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              <span className="text-gray-700 dark:text-gray-300 font-medium">Areas</span> require 2
              credits each in Humanities &amp; Arts (Hu), Social Sciences (So), and Sciences (Sc).
            </p>
            <p>
              <span className="text-gray-700 dark:text-gray-300 font-medium">Skills</span> require 2
              credits each in Quantitative Reasoning (QR) and Writing (WR).
            </p>
            <p>
              <span className="text-gray-700 dark:text-gray-300 font-medium">Single counting:</span>{" "}
              a course tagged for more than one area or skill only counts toward{" "}
              <span className="font-medium">one</span> of them.{" "}
              <span className="font-medium text-purple-600 dark:text-purple-300">Auto</span> picks the
              split that satisfies the most requirements; switch to{" "}
              <span className="font-medium text-purple-600 dark:text-purple-300">Manual</span> to choose
              each course's requirement yourself with the dropdowns on the cards.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Tags come from Yale's course catalog by default, and anything you
              set by hand on a course wins. Always verify with your dean or DUS.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DistributionalsView;
