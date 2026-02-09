"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";
import { getCanonicalCode } from "@/lib/courseCatalog";
import { MAJORS, MajorProgress, ManualRequirementEntry } from "@/lib/majors";

// ---------- SVG ring progress ----------
function ProgressRing({
  percentage,
  size = 36,
  strokeWidth = 3.5,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className="flex-shrink-0 -rotate-90"
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#simRingGrad)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="simRingGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ---------- Status dot ----------
type DotColor = "green" | "blue" | "amber" | "red" | "purple";

function StatusDot({ color }: { color: DotColor }) {
  const cls: Record<DotColor, string> = {
    green: "bg-emerald-400",
    blue: "bg-blue-400",
    amber: "bg-amber-400",
    red: "bg-red-400/70",
    purple: "bg-purple-400",
  };
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${cls[color]} mr-1.5 flex-shrink-0`}
    />
  );
}

// ---------- Main component ----------
interface SimulatorRequirementsBreakdownProps {
  majorIds: string[];
  previewProgress: Record<string, MajorProgress>;
  plannedCodes: string[];
  simulatorManualReqs: ManualRequirementEntry[];
  onRemoveManualReq: (code: string, requirement: string) => void;
}

export default function SimulatorRequirementsBreakdown({
  majorIds,
  previewProgress,
  plannedCodes,
  simulatorManualReqs,
  onRemoveManualReq,
}: SimulatorRequirementsBreakdownProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (majorId: string) =>
    setExpanded((prev) => ({ ...prev, [majorId]: !prev[majorId] }));

  // Build a set of planned canonical codes for fast lookup
  const plannedSet = useMemo(() => {
    const s = new Set<string>();
    for (const code of plannedCodes) {
      s.add(code);
      const canon = getCanonicalCode(code);
      if (canon) s.add(canon);
    }
    return s;
  }, [plannedCodes]);

  const isPlanned = (code: string): boolean => {
    if (plannedSet.has(code)) return true;
    const canon = getCanonicalCode(code);
    return canon ? plannedSet.has(canon) : false;
  };

  if (Object.keys(previewProgress).length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No declared majors found for preview.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {majorIds.map((majorId) => {
        const prog = previewProgress[majorId];
        if (!prog) return null;

        const isOpen = !!expanded[majorId];
        const pctWithIP = prog.inProgressPercentage ?? prog.percentage;
        const pctCompleted = prog.percentage;

        // Manual reqs for this major
        const manualForMajor = simulatorManualReqs.filter((m) => {
          const allReqs = [
            ...prog.completedRequirements,
            ...prog.inProgressRequirements,
            ...prog.remainingRequirements,
          ];
          return allReqs.some((r) => r.name === m.requirement);
        });

        // Split inProgressRequirements into truly in-progress vs planned
        const trueInProgress: CompletedRequirement[] = [];
        const planned: CompletedRequirement[] = [];

        for (const req of prog.inProgressRequirements) {
          // A requirement has "real" in-progress if it has courses that are:
          // - in-progress AND not planned (from simulator pool) AND not a manual assignment
          const hasRealIP = req.options.some(
            (opt) => opt.inProgress && !isPlanned(opt.code) && !opt.manual
          );
          if (hasRealIP) {
            trueInProgress.push(req);
          } else {
            planned.push(req);
          }
        }

        return (
          <div
            key={majorId}
            className="rounded-xl bg-gradient-to-br from-gray-900/60 via-gray-900/40 to-gray-950/60 backdrop-blur-md border border-gray-800/50 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.2)]"
          >
            {/* Collapsed header */}
            <button
              onClick={() => toggle(majorId)}
              className="w-full flex items-center gap-2.5 p-3 text-left hover:bg-gray-800/20 transition-colors"
            >
              <ProgressRing percentage={pctWithIP} size={32} strokeWidth={3} />

              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-200 truncate">
                  {MAJORS[majorId] ?? majorId}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                  <span>
                    <span className="text-blue-300 font-medium">
                      {prog.completedCredits}
                    </span>
                    /{prog.totalCredits} credits
                  </span>
                  <span className="text-purple-300">
                    {pctWithIP.toFixed(0)}% w/ planned
                  </span>
                </div>
              </div>

              {isOpen ? (
                <FiChevronUp className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              ) : (
                <FiChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              )}
            </button>

            {/* Progress bar (always visible) */}
            <div className="px-3 pb-2.5 -mt-0.5">
              <div className="w-full bg-gray-950/50 h-1.5 rounded-full overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
                <div
                  className="h-1.5 bg-gradient-to-r from-purple-400 to-purple-500 opacity-35 absolute top-0 left-0 rounded-full"
                  style={{ width: `${Math.min(100, pctWithIP)}%` }}
                  aria-hidden
                />
                <div
                  className="h-1.5 bg-gradient-to-r from-blue-400 to-blue-500 relative rounded-full shadow-[0_0_6px_rgba(96,165,250,0.3)]"
                  style={{ width: `${Math.min(100, pctCompleted)}%` }}
                />
              </div>
            </div>

            {/* Expanded body */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 space-y-3 border-t border-gray-800/40 pt-2.5">
                    {prog.completedRequirements.length > 0 && (
                      <ReqSection
                        title="Satisfied"
                        reqs={prog.completedRequirements}
                        color="green"
                        manualReqs={manualForMajor}
                        onRemoveManual={onRemoveManualReq}
                        isPlanned={isPlanned}
                      />
                    )}

                    {trueInProgress.length > 0 && (
                      <ReqSection
                        title="In Progress"
                        reqs={trueInProgress}
                        color="blue"
                        manualReqs={manualForMajor}
                        onRemoveManual={onRemoveManualReq}
                        isPlanned={isPlanned}
                      />
                    )}

                    {planned.length > 0 && (
                      <ReqSection
                        title="Planned"
                        reqs={planned}
                        color="amber"
                        manualReqs={manualForMajor}
                        onRemoveManual={onRemoveManualReq}
                        isPlanned={isPlanned}
                      />
                    )}

                    {prog.remainingRequirements.length > 0 && (
                      <ReqSection
                        title="Remaining"
                        reqs={prog.remainingRequirements}
                        color="red"
                        manualReqs={manualForMajor}
                        onRemoveManual={onRemoveManualReq}
                        isPlanned={isPlanned}
                      />
                    )}

                    {prog.completedRequirements.length === 0 &&
                      trueInProgress.length === 0 &&
                      planned.length === 0 &&
                      prog.remainingRequirements.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-2">
                          No requirement data available.
                        </p>
                      )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Requirement section ----------
type CompletedRequirement = MajorProgress["completedRequirements"][number];

function ReqSection({
  title,
  reqs,
  color,
  manualReqs,
  onRemoveManual,
  isPlanned,
}: {
  title: string;
  reqs: CompletedRequirement[];
  color: "green" | "blue" | "amber" | "red";
  manualReqs: ManualRequirementEntry[];
  onRemoveManual: (code: string, requirement: string) => void;
  isPlanned: (code: string) => boolean;
}) {
  const titleColor: Record<typeof color, string> = {
    green: "text-emerald-400",
    blue: "text-blue-400",
    amber: "text-amber-400",
    red: "text-red-400/80",
  };

  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <StatusDot color={color} />
        <span
          className={`text-[10px] font-medium uppercase tracking-wide ${titleColor[color]}`}
        >
          {title}
        </span>
        <span className="text-[10px] text-gray-600">({reqs.length})</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {reqs.map((req) => {
          const manuals = manualReqs.filter(
            (m) => m.requirement === req.name
          );

          return (
            <div
              key={req.name}
              className="px-2.5 py-1.5 rounded-lg bg-gray-800/30 border border-gray-800/40"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-300 font-medium truncate mr-2">
                  {req.name}
                </span>
                <span className="text-[10px] text-gray-500 flex-shrink-0">
                  {req.completed}/{req.required}
                </span>
              </div>

              {/* Course pills */}
              <div className="flex flex-wrap gap-1">
                {req.options
                  .filter((opt) => opt.completed || opt.inProgress)
                  .map((opt) => {
                    // Check if this is a planned course (simulator-added or manual planned)
                    const planned = opt.inProgress && (isPlanned(opt.code) || opt.manual);
                    let pillCls: string;
                    if (opt.completed && !opt.manual) {
                      // Completed from transcript (green)
                      pillCls =
                        "bg-emerald-900/20 text-emerald-300 border-emerald-800/50";
                    } else if (opt.completed && opt.manual) {
                      // Permanent manual from My Major (purple)
                      pillCls =
                        "bg-purple-900/20 text-purple-300 border-purple-800/50";
                    } else if (planned) {
                      // Planned (amber) - includes simulator manuals
                      pillCls =
                        "bg-amber-900/20 text-amber-300 border-amber-800/50";
                    } else {
                      // Real in-progress from transcript (blue)
                      pillCls =
                        "bg-blue-900/20 text-blue-300 border-blue-800/50";
                    }

                    // Check if this is a simulator manual (so we can show remove button)
                    const isSimulatorManual = manuals.some((m) => m.code === opt.code);

                    return (
                      <span
                        key={opt.code}
                        className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border ${pillCls} group`}
                      >
                        {opt.code}
                        {planned && (
                          <span className="text-[9px] text-amber-400/70 ml-0.5">
                            planned
                          </span>
                        )}
                        {opt.completed && opt.manual && (
                          <span className="text-[9px] text-purple-400/70 ml-0.5">
                            manual
                          </span>
                        )}
                        {isSimulatorManual && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveManual(opt.code, req.name);
                            }}
                            className="ml-0.5 text-amber-400/50 hover:text-red-300 transition-colors"
                          >
                            <FiX size={10} />
                          </button>
                        )}
                      </span>
                    );
                  })}

                {req.options.filter((opt) => opt.completed || opt.inProgress)
                  .length === 0 && (
                    <span className="text-[10px] text-gray-600 italic">
                      none yet
                    </span>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
