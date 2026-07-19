"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronUp, FiPlus, FiTrash2, FiCheck } from "react-icons/fi";
import type { Plan } from "./simulatorTypes";

export interface SimulatorPlanModalsProps {
  savedPlans: Plan[];
  planName: string;
  setPlanName: (name: string) => void;
  showSaveModal: boolean;
  setShowSaveModal: (show: boolean) => void;
  showPlansModal: boolean;
  setShowPlansModal: (show: boolean) => void;
  showPlanSelector: boolean;
  setShowPlanSelector: (show: boolean) => void;
  selectedPlanToOverwrite: number | null;
  setSelectedPlanToOverwrite: (index: number | null) => void;
  hasChanges: boolean;
  savePlan: () => void;
  loadPlan: (planIndex: number) => void;
  setDefaultPlan: (planIndex: number) => void;
  deletePlan: (planIndex: number) => void;
}

function plannedCourseCount(plan: Plan): number {
  return plan.semesters.reduce(
    (acc, sem) =>
      acc + sem.courses.filter((c) => c.status === "not-taken").length,
    0,
  );
}

export default function SimulatorPlanModals({
  savedPlans,
  planName,
  setPlanName,
  showSaveModal,
  setShowSaveModal,
  showPlansModal,
  setShowPlansModal,
  showPlanSelector,
  setShowPlanSelector,
  selectedPlanToOverwrite,
  setSelectedPlanToOverwrite,
  hasChanges,
  savePlan,
  loadPlan,
  setDefaultPlan,
  deletePlan,
}: SimulatorPlanModalsProps) {
  const closeSaveModal = () => {
    setShowSaveModal(false);
    setSelectedPlanToOverwrite(null);
    setPlanName("");
  };

  return (
    <>
      {/* Save Plan Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.15),0_0_80px_rgba(139,92,246,0.04),inset_0_1px_0_rgba(255,255,255,0.08)] dark:shadow-[0_8px_48px_rgba(0,0,0,0.5),0_0_80px_rgba(139,92,246,0.06),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-black/[0.04] dark:ring-white/[0.05]"
            >
              <div className="mb-5">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                  {selectedPlanToOverwrite !== null
                    ? `Overwrite "${savedPlans[selectedPlanToOverwrite]?.name ?? ""}"`
                    : "Save new plan"}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {selectedPlanToOverwrite !== null
                    ? "Replace this plan with your current canvas, or save as a new plan instead."
                    : "Give your plan a name to save your progress."}
                </p>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g., Senior Year Schedule, Plan B..."
                  className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  autoFocus
                />
              </div>

              {savedPlans.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent" />
                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Overwrite an existing plan
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent" />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02]">
                    {savedPlans.map((plan, index) => {
                      const selected = selectedPlanToOverwrite === index;
                      return (
                        <button
                          key={`${plan.createdAt}-${index}`}
                          aria-pressed={selected}
                          className={`w-full p-3 text-left border-b border-gray-100 dark:border-white/[0.04] last:border-b-0 hover:bg-gray-100 dark:hover:bg-white/[0.04] text-sm transition-all ${
                            selected
                              ? "bg-purple-500/10 border-l-2 border-l-purple-500"
                              : "border-l-2 border-l-transparent"
                          }`}
                          onClick={() => {
                            setSelectedPlanToOverwrite(index);
                            setPlanName(plan.name);
                          }}
                        >
                          <div className="flex justify-between items-center gap-2">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="text-gray-700 dark:text-gray-300 font-medium truncate">
                                {plan.name}
                              </span>
                              {plan.isDefault && (
                                <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/40 shrink-0">
                                  Default
                                </span>
                              )}
                            </span>
                            <span className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                {new Date(plan.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                              </span>
                              {selected && (
                                <FiCheck
                                  size={13}
                                  className="text-purple-500 dark:text-purple-300"
                                />
                              )}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedPlanToOverwrite !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlanToOverwrite(null);
                        setPlanName("");
                      }}
                      className="mt-2 text-xs text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
                    >
                      + Save as a new plan instead
                    </button>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <motion.button
                  onClick={closeSaveModal}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 text-sm rounded-xl bg-black/[0.04] dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] transition-all"
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={savePlan}
                  disabled={!planName.trim() || !hasChanges}
                  whileHover={
                    planName.trim() && hasChanges ? { scale: 1.02 } : {}
                  }
                  whileTap={
                    planName.trim() && hasChanges ? { scale: 0.98 } : {}
                  }
                  className={`px-4 py-2 text-sm rounded-xl font-medium transition-all ${
                    planName.trim() && hasChanges
                      ? "bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-gray-900 dark:text-white border border-purple-500/30 hover:border-purple-400/40 shadow-[0_2px_12px_rgba(139,92,246,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "bg-black/[0.02] dark:bg-white/[0.02] text-gray-400 dark:text-gray-600 border border-black/[0.04] dark:border-white/[0.04] cursor-not-allowed"
                  }`}
                >
                  {selectedPlanToOverwrite !== null
                    ? "Overwrite"
                    : "Save new plan"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Load Plans Modal */}
      <AnimatePresence>
        {showPlansModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowPlansModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.1),0_0_80px_rgba(139,92,246,0.02)] dark:shadow-[0_8px_48px_rgba(0,0,0,0.5),0_0_80px_rgba(139,92,246,0.06),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-black/[0.04] dark:ring-white/[0.05]"
              style={{ maxHeight: "80vh" }}
            >
              <div className="mb-5">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Your Saved Plans
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Load a previous plan or manage your saved plans.
                </p>
              </div>

              {savedPlans.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.04] dark:to-transparent border border-gray-200 dark:border-white/[0.06] flex items-center justify-center">
                    <FiPlus className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-500 text-sm font-medium">
                    No saved plans yet
                  </p>
                  <p className="text-gray-400 dark:text-gray-600 text-xs mt-1 max-w-xs mx-auto">
                    Tweak your schedule in the simulator, then save a plan to
                    compare paths.
                  </p>
                </div>
              ) : (
                <div
                  className="space-y-2 overflow-y-auto pr-1"
                  style={{ maxHeight: "calc(80vh - 180px)" }}
                >
                  {savedPlans.map((plan, index) => {
                    const plannedCount = plannedCourseCount(plan);
                    return (
                      <motion.div
                        key={`${plan.createdAt}-${index}`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-xl bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.04] dark:to-transparent border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.1] transition-all group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-sm text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                {plan.name}
                              </h5>
                              {plan.isDefault && (
                                <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/40">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {plannedCount} planned course
                              {plannedCount !== 1 ? "s" : ""} ·{" "}
                              {new Date(plan.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          {!plan.isDefault ? (
                            <button
                              onClick={() => setDefaultPlan(index)}
                              className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
                            >
                              Set as default
                            </button>
                          ) : (
                            <span />
                          )}
                          <div className="flex gap-2">
                            <motion.button
                              onClick={() => deletePlan(index)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="px-3 py-1.5 text-xs rounded-lg bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-500/20 transition-all flex items-center gap-1"
                            >
                              <FiTrash2 size={11} />
                              Delete
                            </motion.button>
                            <motion.button
                              onClick={() => loadPlan(index)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 border border-blue-400/40 dark:border-blue-500/30 hover:border-blue-500/50 dark:hover:border-blue-400/40 transition-all shadow-[0_2px_8px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.08)]"
                            >
                              Load Plan
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 flex justify-end">
                <motion.button
                  onClick={() => setShowPlansModal(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 text-sm rounded-xl bg-black/[0.04] dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] transition-all"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan Selector Modal - shown on initial load */}
      <AnimatePresence>
        {showPlanSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowPlanSelector(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_48px_rgba(0,0,0,0.5),0_0_80px_rgba(139,92,246,0.06),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-black/[0.04] dark:ring-white/[0.05]"
            >
              <div className="text-center mb-6">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-1">
                  Welcome to your Yale Simulator.
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {savedPlans.length > 0
                    ? "Pick up where you left off, or start fresh."
                    : "Drag and drop courses to map out the rest of your degree."}
                </p>
              </div>

              {savedPlans.length > 0 && (
                <div className="space-y-2 max-h-[280px] overflow-y-auto px-1 mb-4">
                  {savedPlans.map((plan, index) => {
                    const plannedCount = plannedCourseCount(plan);
                    return (
                      <motion.button
                        key={`${plan.createdAt}-${index}`}
                        onClick={() => {
                          loadPlan(index);
                          setShowPlanSelector(false);
                        }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full p-4 rounded-xl text-left bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.04] dark:to-transparent border border-gray-200 dark:border-white/[0.06] hover:border-purple-500/30 hover:bg-purple-50 dark:hover:bg-white/[0.06] transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                              {plan.name}
                            </h4>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {plannedCount} planned course
                              {plannedCount !== 1 ? "s" : ""} ·{" "}
                              {new Date(plan.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <FiChevronUp className="w-4 h-4 text-purple-300 rotate-90" />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {savedPlans.length > 0 && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    or
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent" />
                </div>
              )}

              <motion.button
                onClick={() => setShowPlanSelector(false)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 px-4 rounded-xl font-medium text-sm text-gray-800 dark:text-white bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 hover:from-blue-500/30 hover:via-purple-500/30 hover:to-pink-500/30 border border-black/[0.08] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(139,92,246,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <FiPlus size={14} className="opacity-70" />
                Start Fresh / Create New Plan
              </motion.button>

              <p className="text-center text-[11px] text-gray-400 dark:text-gray-600 mt-4">
                Press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-black/[0.06] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-gray-500 dark:text-gray-400">
                  Esc
                </kbd>{" "}
                or click outside to dismiss
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
