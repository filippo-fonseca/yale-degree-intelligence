"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown } from "react-icons/fi";
import type { GPAEntry } from "@/lib/gpa";
import SimulatorGradesSection from "./SimulatorGradesSection";
import SimulatorDistributionalsSection from "./SimulatorDistributionalsSection";

type SimulatorProgressPaneProps = {
  majorIds: string[];
  certificateIds: string[];
  /** Collapse state for the preview cards, owned by the Simulator so it
   * survives a trip to the Canvas and back. */
  expanded: boolean;
  onToggleExpanded: () => void;
  isPreviewLoading: boolean;
  previewError: string | null;
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
  breakdown,
  gpaTimelineTerms,
  distributionalAssignments,
}: SimulatorProgressPaneProps) {
  return (
    <div className="space-y-4">
      {/* Live Major Progress Preview */}
      <div className="space-y-3" data-tour="simulator-live-progress">
        <button
          onClick={onToggleExpanded}
          className="w-full flex items-start justify-between text-left group"
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
