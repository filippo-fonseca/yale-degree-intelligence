"use client";

import React from "react";
import { motion } from "framer-motion";
import { FiX, FiPlus } from "react-icons/fi";

import {
  getReqStatus,
  getReqBreakdown,
  STATUS_CLASSES,
  type ReqStats,
} from "./requirementStatus";

/**
 * A stored assignment on this requirement that the policy engine refuses. The
 * numbers already treat it as lost, so the chip explains why and offers the one
 * action that makes the stored data agree with them.
 */
export type RequirementConflict = {
  courseCode: string;
  reason: string;
};

export type RequirementCardHandlers = {
  onOpenCourse: (opt: any, reqName: string) => void;
  onUnskip: (code: string) => void;
  onRemoveManual: (code: string, reqName: string) => void;
  onAddManual: (reqName: string) => void;
  onOpenRequirement: (req: any) => void;
  /** Only used on completed cards: drop a completed course from this requirement. */
  onExcludeFromRequirement?: (code: string, reqName: string) => void;
};

function optionPillClasses(opt: any): string {
  if (opt.manual)
    return "bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700";
  if (opt.completed)
    return "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700";
  if (opt.inProgress)
    return "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700";
  if (opt.skipped)
    return "bg-gray-200 dark:bg-gray-900/20 text-gray-600 dark:text-gray-300 border border-dashed border-gray-400 dark:border-gray-600";
  return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700";
}

function optionSuffix(opt: any): string {
  if (opt.manual) return ", manual";
  if (opt.skipped) return ", skipped";
  if (opt.inProgress) return ", in progress";
  if (opt.completed) return ", complete";
  return "";
}

const RequirementCard = React.memo(function RequirementCard({
  stats,
  handlers,
  conflicts,
}: {
  stats: ReqStats;
  handlers: RequirementCardHandlers;
  conflicts?: RequirementConflict[];
}) {
  const { req, reqCompleted, reqInProgress } = stats;
  const status = getReqStatus(reqCompleted, reqInProgress, req.required || 0);
  const isCompletedCard = status === "completed";
  const classes = STATUS_CLASSES[status];
  const breakdown = isCompletedCard
    ? null
    : getReqBreakdown(reqCompleted, reqInProgress, req.required || 0);

  const {
    onOpenCourse,
    onUnskip,
    onRemoveManual,
    onAddManual,
    onOpenRequirement,
    onExcludeFromRequirement,
  } = handlers;

  const openRequirement = () =>
    onOpenRequirement({
      id: req.id,
      name: req.name,
      description: req.description,
      required: req.required,
      options: req.options,
    });

  const visibleOptions = isCompletedCard
    ? req.options.filter(
        (opt: any) => opt.completed || opt.manual || opt.skipped,
      )
    : req.options;

  return (
    <motion.div
      layout
      initial={false}
      data-tour="certificate-requirement-card"
      className={`p-3 hover:scale-[0.98] rounded-xl backdrop-blur-md border transition-all relative cursor-pointer shadow-neu-sm ${classes.card}`}
      onClick={openRequirement}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openRequirement();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex justify-between items-start mb-1.5">
        <h5 className={`font-medium text-sm ${classes.title}`}>{req.name}</h5>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-md ${classes.badge}`}
          >
            {isCompletedCard
              ? "✓"
              : (req.required || 0) > 0
                ? `${reqInProgress + reqCompleted}/${req.required}`
                : "suggested"}
          </span>
          {breakdown && (
            <span className={`text-[10px] whitespace-nowrap ${classes.accent}`}>
              {breakdown}
            </span>
          )}
        </div>
      </div>

      {req.description && (
        <p className={`text-[11px] mb-2 ${classes.description}`}>
          {req.description}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {visibleOptions.map((opt: any) => {
          const interactive = !isCompletedCard && !opt.completed && !opt.skipped;
          const showX =
            opt.skipped ||
            opt.manual ||
            (isCompletedCard && opt.completed);
          return (
            <div
              key={opt.code}
              data-tour={interactive ? "certificate-course-option-pill" : undefined}
              className={`relative px-2 py-0.5 rounded-full text-xs flex items-center transition-all duration-150 ${
                interactive ? "cursor-pointer hover:scale-[1.03]" : ""
              } ${optionPillClasses(opt)}`}
              onClick={(e) => {
                e.stopPropagation();
                if (interactive) onOpenCourse(opt, req.name);
              }}
            >
              {opt.code}
              <span className="ml-1 text-[0.65rem]">
                ({opt.credits}cr{optionSuffix(opt)})
              </span>
              {showX && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (opt.skipped) onUnskip(opt.code);
                    else if (opt.manual) onRemoveManual(opt.code, req.name);
                    else if (opt.completed)
                      onExcludeFromRequirement?.(opt.code, req.name);
                  }}
                  className={`ml-1 text-[0.65rem] transition-colors ${
                    isCompletedCard && opt.completed
                      ? "text-emerald-600/60 dark:text-emerald-500/40 hover:text-red-500 dark:hover:text-red-400"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                  title={
                    opt.manual
                      ? "Remove manual course"
                      : opt.skipped
                        ? "Unskip this course"
                        : "Remove from this requirement"
                  }
                >
                  <FiX size={10} />
                </button>
              )}
            </div>
          );
        })}

        {!isCompletedCard && (
          <button
            type="button"
            data-tour="certificate-fulfill-manual-button"
            onClick={(e) => {
              e.stopPropagation();
              onAddManual(req.name);
            }}
            className="px-2 py-0.5 rounded-full text-xs flex items-center gap-1 bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-800/30 transition-colors"
            title="Add a course manually for this requirement"
          >
            <FiPlus size={12} />
            Fulfill manually
          </button>
        )}
      </div>

      {/* Refused claims are credit this certificate does not have, so they get
          the neutral blocked treatment rather than the amber one warnings use.
          Same convention as the simulator breakdown: struck code, plain words,
          reduced emphasis. */}
      {conflicts && conflicts.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {conflicts.map((conflict) => (
            <div
              key={conflict.courseCode}
              className="rounded-lg bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-300 dark:border-zinc-700/50 px-2 py-1.5"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-700/40 text-zinc-600 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600/50">
                  not counted
                </span>
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 line-through decoration-zinc-400/70 dark:decoration-zinc-500/70">
                  {conflict.courseCode}
                </span>
              </div>
              <p className="text-[11px] mt-1 text-zinc-500 dark:text-zinc-400">
                {conflict.reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
});

export default RequirementCard;
