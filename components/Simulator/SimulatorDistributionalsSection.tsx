"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiAlertTriangle,
} from "react-icons/fi";
import { getDistPillStyle } from "@/lib/constants";
import {
  tallyDistributionals,
  type DistTallyInput,
} from "@/lib/distributionalTally";
import type { MilestoneEvaluation } from "@/lib/distributionalMilestones";

// Per-req progress-bar color, matching the DistributionalProgress palette.
const REQ_BAR_COLOR: Record<string, string> = {
  Hu: "#a855f7", // purple
  So: "#38bdf8", // sky
  Sc: "#34d399", // emerald
  QR: "#f87171", // red
  WR: "#fb923c", // orange
};

interface SimulatorDistributionalsSectionProps {
  /** One entry per course: the requirement it counts toward, and its credits. */
  assignments: DistTallyInput[];
  /** Yale's promotion milestones read against the whole plan, when known. */
  milestoneEvaluation?: MilestoneEvaluation | null;
  /** The milestone chart itself, passed as a slot so this stays a layout. */
  milestoneSnapshot?: React.ReactNode;
}

export default function SimulatorDistributionalsSection({
  assignments,
  milestoneEvaluation,
  milestoneSnapshot,
}: SimulatorDistributionalsSectionProps) {
  const [open, setOpen] = useState(true);

  // The milestone the student is working toward right now. Its verdict is the
  // one thing worth saying in a collapsed header: missing a promotion
  // milestone is not a graduation problem you can fix later.
  const currentMilestone =
    milestoneEvaluation?.milestones.find((m) => m.isCurrent) ?? null;
  const milestoneName = currentMilestone
    ? currentMilestone.spec.label.split(" / ")[0]
    : "";
  const behind =
    currentMilestone?.status === "at-risk" ||
    currentMilestone?.status === "missed";
  const onTrack =
    currentMilestone?.status === "met" || currentMilestone?.status === "projected";

  const { byRequirement } = tallyDistributionals(assignments ?? []);

  // Area/skill reqs carry a target; language levels (L1-L5) don't.
  const areaSkillReqs = byRequirement.filter((r) => r.target != null);
  const langReqs = byRequirement.filter((r) => r.target == null);

  const totalTags = byRequirement.reduce((sum, r) => sum + r.count, 0);
  const metCount = areaSkillReqs.filter(
    (r) => r.count >= (r.target ?? 0),
  ).length;

  return (
    <div className="rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-gray-800/50 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.2)] backdrop-blur-md">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-800 dark:text-gray-200">
            Distributionals
          </div>
          <div className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
            {totalTags > 0 ? (
              <>
                <span className="text-emerald-600 dark:text-emerald-300 font-medium">
                  {metCount}/{areaSkillReqs.length}
                </span>
                <span className="text-gray-400 dark:text-gray-600 ml-0.5">
                  areas &amp; skills met
                </span>
              </>
            ) : (
              <span>Assign distributionals to planned courses</span>
            )}
          </div>
        </div>
        {currentMilestone && behind && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border flex-shrink-0 ${
              currentMilestone.status === "missed"
                ? "border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300"
                : "border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }`}
            title={currentMilestone.notes[0] ?? currentMilestone.spec.description}
          >
            <FiAlertTriangle size={10} />
            {milestoneName} milestone{" "}
            {currentMilestone.status === "missed" ? "missed" : "at risk"}
          </span>
        )}
        {currentMilestone && onTrack && (
          <span
            className={`text-[10px] font-medium flex-shrink-0 ${
              currentMilestone.status === "met"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-sky-600 dark:text-sky-400"
            }`}
            title={currentMilestone.spec.description}
          >
            {milestoneName} milestone on track
          </span>
        )}
        {open ? (
          <FiChevronUp className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        ) : (
          <FiChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-800/40 pt-3 space-y-2.5">
              {totalTags === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
                  Assign distributionals to planned courses to see your progress.
                </p>
              ) : (
                <>
                  {areaSkillReqs.map((req) => {
                    const target = req.target ?? 0;
                    const fulfilled = target > 0 && req.count >= target;
                    const progress =
                      target > 0 ? Math.min(req.count / target, 1) : 0;
                    const bar = REQ_BAR_COLOR[req.key] ?? "#a855f7";

                    return (
                      <div key={req.key}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md border ${getDistPillStyle(
                                req.key,
                              )}`}
                            >
                              {req.key}
                            </span>
                            {req.label && (
                              <span className="text-xs text-gray-600 dark:text-gray-300">
                                {req.label}
                              </span>
                            )}
                          </div>
                          {fulfilled ? (
                            <span className="text-emerald-500 dark:text-emerald-400">
                              <FiCheck size={14} strokeWidth={3} />
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              {Math.min(req.count, target)}/{target}
                            </span>
                          )}
                        </div>
                        <div className="relative w-full h-1.5 bg-gray-200 dark:bg-gray-800/70 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress * 100}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{
                              backgroundColor: fulfilled ? "#34d399" : bar,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Language levels present */}
                  {langReqs.length > 0 && (
                    <div className="pt-1.5 border-t border-gray-200 dark:border-gray-800/40">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                        Language
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {langReqs.map((req) => (
                          <span
                            key={req.key}
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${getDistPillStyle(
                              req.key,
                            )}`}
                          >
                            {req.key}
                            <span className="opacity-70">×{req.count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {milestoneEvaluation && milestoneSnapshot}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
