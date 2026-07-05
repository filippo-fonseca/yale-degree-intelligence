"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown, FiChevronUp, FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import {
  computeGPATimeline,
  type GPAEntry,
  type GPAResult,
  type GPATimelineTerm,
} from "@/lib/gpa";

interface SimulatorGradesSectionProps {
  terms: {
    key: string;
    label: string;
    completed: GPAEntry[];
    planned: GPAEntry[];
  }[];
}

const fmt = (r: GPAResult): string => (r.gpa != null ? r.gpa.toFixed(2) : "—");

// Signed delta pill: green ▲ up, red ▼ down, neutral flat/null.
function DeltaPill({ delta }: { delta: number | null }) {
  if (delta == null || delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700/50">
        {delta == null ? "—" : "±0.00"}
      </span>
    );
  }
  const up = delta > 0;
  const cls = up
    ? "bg-emerald-100 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/50"
    : "bg-red-100 dark:bg-red-900/25 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800/50";
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cls}`}
    >
      {up ? (
        <FiTrendingUp className="w-2.5 h-2.5" />
      ) : (
        <FiTrendingDown className="w-2.5 h-2.5" />
      )}
      {up ? "+" : ""}
      {delta.toFixed(2)}
    </span>
  );
}

// Small trend arrow comparing this term's cumulative to the previous one.
function TrendArrow({ curr, prev }: { curr: number | null; prev: number | null }) {
  if (curr == null || prev == null) return null;
  const d = Math.round((curr - prev) * 100) / 100;
  if (d === 0) return null;
  const up = d > 0;
  return up ? (
    <FiTrendingUp className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
  ) : (
    <FiTrendingDown className="w-3 h-3 text-red-500 dark:text-red-400" />
  );
}

function KindBadge({ kind }: { kind: GPATimelineTerm["kind"] }) {
  if (kind === "mixed") {
    return (
      <span className="inline-flex items-center gap-0.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400" />
      </span>
    );
  }
  const color = kind === "completed" ? "bg-emerald-400" : "bg-purple-400";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />;
}

export default function SimulatorGradesSection({
  terms,
}: SimulatorGradesSectionProps) {
  const [open, setOpen] = useState(true);

  const timeline = computeGPATimeline(terms ?? []);
  const { baseline, projected, delta } = timeline;

  const hasCompleted = baseline.gpa != null;
  const hasPlanned = timeline.terms.some((t) => t.hasPlanned);
  const hasAny = timeline.terms.length > 0;

  return (
    <div className="rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-gray-800/50 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.2)] backdrop-blur-md">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-800 dark:text-gray-200">
            GPA Timeline
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
            {projected.gpa != null ? (
              <>
                <span className="text-emerald-600 dark:text-emerald-300 font-semibold">
                  {fmt(projected)}
                </span>
                <span className="text-gray-400 dark:text-gray-600">projected</span>
                {hasPlanned && <DeltaPill delta={delta} />}
              </>
            ) : (
              <span>Add grades to see your projection</span>
            )}
          </div>
        </div>
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
            <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-800/40 pt-3 space-y-3">
              {!hasAny ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
                  Add graded courses to see your GPA timeline.
                </p>
              ) : (
                <>
                  {/* Top summary */}
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Current GPA
                      </p>
                      <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                        {fmt(baseline)}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-600">
                        {hasCompleted ? "completed" : "add grades"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Projected
                      </p>
                      <div className="flex items-center justify-end gap-1.5">
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-300 leading-none">
                          {fmt(projected)}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center justify-end">
                        <DeltaPill delta={delta} />
                      </div>
                    </div>
                  </div>

                  {/* Secondary credit totals */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800/40">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        Graded credits
                      </p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {projected.gradedCredits}
                      </p>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800/40">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        Total credits
                      </p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {projected.totalCredits}
                      </p>
                    </div>
                  </div>

                  {/* Per-semester timeline */}
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                      By semester
                    </p>
                    <div className="relative space-y-1">
                      {/* vertical rail */}
                      <div className="absolute left-[3px] top-1 bottom-1 w-px bg-gray-200 dark:bg-gray-800/60" />
                      {timeline.terms.map((t, i) => {
                        const prev =
                          i > 0 ? timeline.terms[i - 1].cumulativeGPA.gpa : null;
                        const isPlanned = t.kind === "planned";
                        return (
                          <div
                            key={t.key}
                            className={`relative flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-lg border ${
                              isPlanned
                                ? "bg-purple-50/60 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/30"
                                : "bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-800/40"
                            }`}
                          >
                            {/* rail node */}
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
                              <KindBadge kind={t.kind} />
                            </span>
                            <span
                              className={`flex-1 min-w-0 truncate text-xs font-medium ${
                                isPlanned
                                  ? "text-purple-700 dark:text-purple-300"
                                  : "text-gray-700 dark:text-gray-200"
                              }`}
                            >
                              {t.label}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                              term{" "}
                              <span className="text-gray-600 dark:text-gray-300 font-medium">
                                {fmt(t.termGPA)}
                              </span>
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                              <TrendArrow
                                curr={t.cumulativeGPA.gpa}
                                prev={prev}
                              />
                              <span className="text-emerald-600 dark:text-emerald-300 font-semibold">
                                {fmt(t.cumulativeGPA)}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {!hasPlanned && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center">
                      Add planned courses to project your trajectory.
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
