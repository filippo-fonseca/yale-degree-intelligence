"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiAlertTriangle, FiCheckCircle, FiChevronDown } from "react-icons/fi";
import type { GPAEntry } from "@/lib/gpa";
import SimulatorGradesSection from "./SimulatorGradesSection";
import SimulatorDistributionalsSection from "./SimulatorDistributionalsSection";

/** A program that just crossed the 100% projected line, either direction. */
export type CompletionFlash = {
  programKey: string;
  kind: "gained" | "lost";
  label: string;
};

type SimulatorProgressPaneProps = {
  majorIds: string[];
  certificateIds: string[];
  /** Collapse state for the preview cards, owned by the Simulator so it
   * survives a trip to the Canvas and back. */
  expanded: boolean;
  onToggleExpanded: () => void;
  isPreviewLoading: boolean;
  previewError: string | null;
  /** Programs that just gained or lost full projected completion. */
  completionFlashes: CompletionFlash[];
  /** Dismisses one notice for good (session-scoped). */
  onDismissFlash: (programKey: string) => void;
  /** The requirements breakdown, built by the Simulator from the same engine
   * inputs the preview runs on. Passed as a slot so this pane stays a layout. */
  breakdown: React.ReactNode;
  gpaTimelineTerms: {
    key: string;
    label: string;
    completed: GPAEntry[];
    planned: GPAEntry[];
  }[];
  distributionalAssignments: string[][];
};

/**
 * The Simulator's read-only half: what the plan on the Canvas adds up to.
 * Everything here renders from state the Simulator already computed, so
 * switching tabs never recomputes or drops in-flight plan edits.
 */
export default function SimulatorProgressPane({
  majorIds,
  certificateIds,
  expanded,
  onToggleExpanded,
  isPreviewLoading,
  previewError,
  completionFlashes,
  onDismissFlash,
  breakdown,
  gpaTimelineTerms,
  distributionalAssignments,
}: SimulatorProgressPaneProps) {
  const [flashMenu, setFlashMenu] = useState<"lost" | "gained" | null>(null);
  const lostFlashes = completionFlashes.filter((f) => f.kind === "lost");
  const gainedFlashes = completionFlashes.filter((f) => f.kind === "gained");
  const openFlashes =
    flashMenu === "lost" ? lostFlashes : flashMenu === "gained" ? gainedFlashes : [];

  return (
    <div className="space-y-4">
      {/* Live Major Progress Preview */}
      <div className="space-y-3" data-tour="simulator-live-progress">
        <div className="relative flex items-start gap-2">
          {(lostFlashes.length > 0 || gainedFlashes.length > 0) && (
            <div className="order-last flex items-center gap-1.5 mt-1 shrink-0">
              {lostFlashes.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setFlashMenu((m) => (m === "lost" ? null : "lost"))
                  }
                  aria-label="Completion warnings"
                  data-sim-completion-warnings
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                >
                  <FiAlertTriangle size={12} />
                  {lostFlashes.length}
                </button>
              )}
              {gainedFlashes.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setFlashMenu((m) => (m === "gained" ? null : "gained"))
                  }
                  aria-label="New completions"
                  data-sim-completion-gains
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                >
                  <FiCheckCircle size={12} />
                  {gainedFlashes.length}
                </button>
              )}
              {flashMenu !== null && openFlashes.length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setFlashMenu(null)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 z-20 w-72 rounded-xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-gray-900 shadow-[0_8px_32px_rgba(0,0,0,0.16)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1">
                    <p className="px-2 pt-1.5 pb-1 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {flashMenu === "lost"
                        ? "No longer complete"
                        : "Newly complete"}{" "}
                      · click one to dismiss it
                    </p>
                    {openFlashes.map((f) => (
                      <button
                        key={f.programKey}
                        type="button"
                        onClick={() => onDismissFlash(f.programKey)}
                        className="w-full text-left text-xs rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                      >
                        {f.kind === "lost"
                          ? `Your plan no longer completes ${f.label}. A course it was counting on is off the canvas.`
                          : `Your plan now completes ${f.label}. Nice.`}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <button
            onClick={onToggleExpanded}
            className="flex-1 flex items-start justify-between text-left group"
            aria-expanded={expanded}
          >
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Progress toward{" "}
              {majorIds.length > 0 && certificateIds.length > 0
                ? "majors & certificates"
                : certificateIds.length > 0
                  ? certificateIds.length > 1
                    ? "certificates"
                    : "certificate"
                  : majorIds.length > 1
                    ? "majors"
                    : "major"}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Live preview: reflects completed, in-progress, and courses placed
              on the grid.
            </p>
          </div>
          <FiChevronDown
            className={`mt-1 shrink-0 text-gray-400 dark:text-gray-500 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
              size={18}
            />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden space-y-3"
            >
              {isPreviewLoading && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Updating preview…
                </div>
              )}
              {previewError && (
                <div className="text-sm text-red-600 dark:text-red-300">
                  {previewError}
                </div>
              )}

              {breakdown}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* GPA timeline and distributionals, always on in this view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SimulatorGradesSection terms={gpaTimelineTerms} />
        <SimulatorDistributionalsSection
          assignments={distributionalAssignments}
        />
      </div>
    </div>
  );
}
