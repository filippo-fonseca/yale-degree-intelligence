"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";
import { getCanonicalCode } from "@/lib/courseCatalog";
import { MAJORS, MajorProgress, ManualRequirementEntry } from "@/lib/majors";
import { CERTIFICATES, type CertificateProgress } from "@/lib/certificates";

type ProgressData = MajorProgress | CertificateProgress;
type CompletedRequirement = MajorProgress["completedRequirements"][number];
type Accent = "purple" | "teal";

// ---------- SVG ring progress ----------
function ProgressRing({
  percentage,
  size = 36,
  strokeWidth = 3.5,
  accent = "purple",
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  accent?: Accent;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (pct / 100) * circumference;
  const gradientId = `simRingGrad-${accent}`;

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
        stroke="rgba(100,100,100,0.15)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          {accent === "teal" ? (
            <>
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#14b8a6" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#a78bfa" />
            </>
          )}
        </linearGradient>
      </defs>
    </svg>
  );
}

// ---------- Status dot ----------
type DotColor = "green" | "blue" | "amber" | "red" | "purple" | "teal";

function StatusDot({ color }: { color: DotColor }) {
  const cls: Record<DotColor, string> = {
    green: "bg-emerald-400",
    blue: "bg-blue-400",
    amber: "bg-amber-400",
    red: "bg-red-400/70",
    purple: "bg-purple-400",
    teal: "bg-teal-400",
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
  certificateIds: string[];
  previewProgress: Record<string, MajorProgress>;
  certificatePreviewProgress: Record<string, CertificateProgress>;
  plannedCodes: string[];
  simulatorManualReqs: ManualRequirementEntry[];
  onRemoveManualReq: (code: string, requirement: string) => void;
}

export default function SimulatorRequirementsBreakdown({
  majorIds,
  certificateIds,
  previewProgress,
  certificatePreviewProgress,
  plannedCodes,
  simulatorManualReqs,
  onRemoveManualReq,
}: SimulatorRequirementsBreakdownProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

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

  const hasAnyProgress =
    majorIds.some((id) => previewProgress[id]) ||
    certificateIds.some((id) => certificatePreviewProgress[id]);

  if (!hasAnyProgress) {
    return (
      <div className="text-sm text-gray-500">
        No declared majors or certificates found for preview.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {majorIds.map((majorId) => {
        const prog = previewProgress[majorId];
        if (!prog) return null;

        const manualForProgram = simulatorManualReqs.filter((m) => {
          const isMajorManual =
            m.programType === "major" || m.programType === undefined;
          if (!isMajorManual) return false;
          if (m.programId && m.programId !== majorId) return false;
          const allReqs = [
            ...prog.completedRequirements,
            ...prog.inProgressRequirements,
            ...prog.remainingRequirements,
          ];
          return allReqs.some((r) => r.name === m.requirement);
        });

        return (
          <ProgramProgressCard
            key={`major-${majorId}`}
            programKey={`major-${majorId}`}
            title={MAJORS[majorId] ?? majorId}
            prog={prog}
            accent="purple"
            manualReqs={manualForProgram}
            isOpen={!!expanded[`major-${majorId}`]}
            onToggle={() => toggle(`major-${majorId}`)}
            isPlanned={isPlanned}
            onRemoveManual={onRemoveManualReq}
          />
        );
      })}

      {certificateIds.map((certId) => {
        const prog = certificatePreviewProgress[certId];
        if (!prog) return null;

        const manualForProgram = simulatorManualReqs.filter((m) => {
          if (m.programType !== "certificate") return false;
          if (m.programId && m.programId !== certId) return false;
          const allReqs = [
            ...prog.completedRequirements,
            ...prog.inProgressRequirements,
            ...prog.remainingRequirements,
          ];
          return allReqs.some((r) => r.name === m.requirement);
        });

        return (
          <ProgramProgressCard
            key={`cert-${certId}`}
            programKey={`cert-${certId}`}
            title={CERTIFICATES[certId] ?? certId}
            prog={prog}
            accent="teal"
            manualReqs={manualForProgram}
            isOpen={!!expanded[`cert-${certId}`]}
            onToggle={() => toggle(`cert-${certId}`)}
            isPlanned={isPlanned}
            onRemoveManual={onRemoveManualReq}
          />
        );
      })}
    </div>
  );
}

function ProgramProgressCard({
  title,
  prog,
  accent,
  manualReqs,
  isOpen,
  onToggle,
  isPlanned,
  onRemoveManual,
}: {
  programKey: string;
  title: string;
  prog: ProgressData;
  accent: Accent;
  manualReqs: ManualRequirementEntry[];
  isOpen: boolean;
  onToggle: () => void;
  isPlanned: (code: string) => boolean;
  onRemoveManual: (code: string, requirement: string) => void;
}) {
  const pctCompleted = prog.percentage;

  const trueInProgress: CompletedRequirement[] = [];
  const planned: CompletedRequirement[] = [];

  for (const req of prog.inProgressRequirements) {
    const hasRealIP = req.options.some(
      (opt) => opt.inProgress && !isPlanned(opt.code) && !opt.manual,
    );
    if (hasRealIP) {
      trueInProgress.push(req);
    } else {
      planned.push(req);
    }
  }

  const totalReqs =
    prog.completedRequirements.length +
    prog.inProgressRequirements.length +
    prog.remainingRequirements.length;

  const getFractionCompleted = (req: CompletedRequirement) => {
    const completedCredits = req.options
      .filter((o) => o.completed)
      .reduce((sum, o) => sum + o.credits, 0);
    const inProgressCredits = req.options
      .filter((o) => o.inProgress)
      .reduce((sum, o) => sum + o.credits, 0);
    const totalProgress = Math.min(
      completedCredits + inProgressCredits,
      req.required,
    );
    return req.required > 0 ? totalProgress / req.required : 0;
  };

  const completedCount = prog.completedRequirements.length;
  const trueIPFraction = trueInProgress.reduce(
    (sum, req) => sum + getFractionCompleted(req),
    0,
  );
  const withIPCount = completedCount + trueIPFraction;
  const plannedFraction = planned.reduce(
    (sum, req) => sum + getFractionCompleted(req),
    0,
  );
  const withPlannedCount = withIPCount + plannedFraction;

  const pctWithIP = totalReqs > 0 ? (withIPCount / totalReqs) * 100 : 0;
  const pctWithPlanned =
    totalReqs > 0 ? (withPlannedCount / totalReqs) * 100 : 0;

  const plannedBarClass =
    accent === "teal"
      ? "bg-teal-300 dark:bg-teal-500/40"
      : "bg-purple-300 dark:bg-purple-500/40";
  const plannedTextClass =
    accent === "teal"
      ? "text-teal-600 dark:text-teal-300"
      : "text-purple-600 dark:text-purple-300";
  const completedBarClass =
    accent === "teal"
      ? "bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500 shadow-[0_0_10px_rgba(20,184,166,0.75)]"
      : "bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 shadow-[0_0_10px_rgba(168,85,247,0.75)]";

  return (
    <div
      className={`rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.2)] backdrop-blur-md ${
        accent === "teal"
          ? "border-teal-200/60 dark:border-teal-800/40"
          : "border-gray-200 dark:border-gray-800/50"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800/20 transition-colors"
      >
        <ProgressRing
          percentage={pctWithPlanned}
          size={32}
          strokeWidth={3}
          accent={accent}
        />

        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
            {title}
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
            <span className="whitespace-nowrap">
              <span className="text-emerald-600 dark:text-emerald-300 font-semibold">
                {pctCompleted.toFixed(0)}%
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-0.5">
                actually done
              </span>
            </span>
            {trueInProgress.length > 0 && (
              <span className="whitespace-nowrap">
                <span className="text-blue-600 dark:text-blue-300 font-semibold">
                  {pctWithIP.toFixed(0)}%
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-0.5">
                  with in-progress credits
                </span>
              </span>
            )}
            {planned.length > 0 && (
              <span className="whitespace-nowrap">
                <span className={`font-semibold ${plannedTextClass}`}>
                  {pctWithPlanned.toFixed(0)}%
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-0.5">
                  completion with planned credits
                </span>
              </span>
            )}
          </div>
        </div>

        {isOpen ? (
          <FiChevronUp className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        ) : (
          <FiChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        )}
      </button>

      <div className="px-3 pb-2.5 -mt-0.5">
        <div className="relative w-full bg-gray-200 dark:bg-gray-800/70 h-2 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${plannedBarClass}`}
            style={{ width: `${Math.min(100, pctWithPlanned)}%` }}
            aria-hidden
          />
          <div
            className="absolute inset-y-0 left-0 bg-blue-400 dark:bg-blue-500/60 rounded-full"
            style={{ width: `${Math.min(100, pctWithIP)}%` }}
            aria-hidden
          />
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${completedBarClass}`}
            style={{ width: `${Math.min(100, pctCompleted)}%` }}
          />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-gray-200 dark:border-gray-800/40 pt-2.5">
              {prog.completedRequirements.length > 0 && (
                <ReqSection
                  title="Satisfied"
                  reqs={prog.completedRequirements}
                  color="green"
                  manualReqs={manualReqs}
                  onRemoveManual={onRemoveManual}
                  isPlanned={isPlanned}
                />
              )}

              {trueInProgress.length > 0 && (
                <ReqSection
                  title="In Progress"
                  reqs={trueInProgress}
                  color="blue"
                  manualReqs={manualReqs}
                  onRemoveManual={onRemoveManual}
                  isPlanned={isPlanned}
                />
              )}

              {planned.length > 0 && (
                <ReqSection
                  title="Planned"
                  reqs={planned}
                  color="amber"
                  manualReqs={manualReqs}
                  onRemoveManual={onRemoveManual}
                  isPlanned={isPlanned}
                  showCombinedProgress
                />
              )}

              {prog.remainingRequirements.length > 0 && (
                <ReqSection
                  title="Remaining"
                  reqs={prog.remainingRequirements}
                  color="red"
                  manualReqs={manualReqs}
                  onRemoveManual={onRemoveManual}
                  isPlanned={isPlanned}
                />
              )}

              {prog.completedRequirements.length === 0 &&
                trueInProgress.length === 0 &&
                planned.length === 0 &&
                prog.remainingRequirements.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                    No requirement data available.
                  </p>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReqSection({
  title,
  reqs,
  color,
  manualReqs,
  onRemoveManual,
  isPlanned,
  showCombinedProgress = false,
}: {
  title: string;
  reqs: CompletedRequirement[];
  color: "green" | "blue" | "amber" | "red";
  manualReqs: ManualRequirementEntry[];
  onRemoveManual: (code: string, requirement: string) => void;
  isPlanned: (code: string) => boolean;
  showCombinedProgress?: boolean;
}) {
  const titleColor: Record<typeof color, string> = {
    green: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400/80",
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
        <span className="text-[10px] text-gray-400 dark:text-gray-600">
          ({reqs.length})
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {reqs.map((req) => {
          const manuals = manualReqs.filter((m) => m.requirement === req.name);

          const completedCredits = req.options
            .filter((o) => o.completed)
            .reduce((sum, o) => sum + o.credits, 0);
          const inProgressCredits = req.options
            .filter((o) => o.inProgress)
            .reduce((sum, o) => sum + o.credits, 0);
          const displayCredits = showCombinedProgress
            ? completedCredits + inProgressCredits
            : completedCredits;
          const isIncomplete =
            showCombinedProgress && displayCredits < req.required;

          return (
            <div
              key={req.name}
              className={`px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/30 border ${
                isIncomplete
                  ? "border-red-500/50"
                  : "border-gray-200 dark:border-gray-800/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate mr-2">
                  {req.name}
                </span>
                <span
                  className={`text-[10px] flex-shrink-0 ${
                    isIncomplete
                      ? "text-red-400 font-medium"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {displayCredits}/{req.required}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {req.options
                  .filter((opt) => opt.completed || opt.inProgress)
                  .map((opt) => {
                    const planned =
                      opt.inProgress && (isPlanned(opt.code) || opt.manual);
                    let pillCls: string;
                    if (opt.completed && !opt.manual) {
                      pillCls =
                        "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/50";
                    } else if (opt.completed && opt.manual) {
                      pillCls =
                        "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800/50";
                    } else if (planned) {
                      pillCls =
                        "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/50";
                    } else {
                      pillCls =
                        "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800/50";
                    }

                    const isSimulatorManual = manuals.some(
                      (m) => m.code === opt.code,
                    );

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
                  <span className="text-[10px] text-gray-400 dark:text-gray-600 italic">
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
