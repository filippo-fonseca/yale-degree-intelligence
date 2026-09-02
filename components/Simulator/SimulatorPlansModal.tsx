"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCopy, FiPlus, FiStar, FiTrash2, FiX } from "react-icons/fi";
import { plannedCourseCount, type Plan } from "./planTypes";

function formatSaved(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * The simulator's plan manager: the one surface behind the toolbar's plan
 * selector.
 *
 * One row per saved plan (name, badges, a meta line), one obvious primary
 * action (Load), and two quiet secondary ones (set as default, delete). The
 * footer carries "Save current canvas" so a student who came here to switch
 * plans can bank the one they are on first. Nothing here touches the stored
 * plan shape; every verb is a callback the Simulator owns.
 */
export default function SimulatorPlansModal({
  isOpen,
  plans,
  currentPlanName,
  canSaveCurrent,
  onClose,
  onLoad,
  onSetDefault,
  onDuplicate,
  onDelete,
  onSaveCurrent,
}: {
  isOpen: boolean;
  plans: Plan[];
  currentPlanName: string | null;
  /** False when there is nothing new on the canvas to bank, or no session. */
  canSaveCurrent: boolean;
  onClose: () => void;
  onLoad: (index: number) => void;
  onSetDefault: (index: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onSaveCurrent: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Your plans"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            data-sim-plans-modal
            className="w-full max-w-md flex flex-col rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.08] shadow-[0_12px_48px_rgba(0,0,0,0.14)] dark:shadow-[0_12px_48px_rgba(0,0,0,0.5)]"
            style={{ maxHeight: "80vh" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Your plans
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {plans.length > 0
                    ? "Switch between plans, or pick the one you land on first."
                    : "Save the canvas to start keeping plans."}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 p-1.5 -m-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {plans.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] flex items-center justify-center">
                    <FiPlus className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    No saved plans yet
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Build a schedule on the canvas, then save it here.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {plans.map((plan, index) => {
                    const isCurrent = plan.name === currentPlanName;
                    const planned = plannedCourseCount(plan);
                    const saved = formatSaved(plan.createdAt);
                    return (
                      <div
                        key={`${plan.createdAt}-${index}`}
                        data-sim-plan-row={plan.name}
                        data-sim-plan-current={isCurrent ? "true" : "false"}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                          isCurrent
                            ? "border-purple-300 dark:border-purple-500/40 bg-purple-50/60 dark:bg-purple-500/[0.08]"
                            : "border-gray-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/[0.14] hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                              {plan.name}
                            </span>
                            {isCurrent && (
                              <span className="shrink-0 text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200 border border-purple-300 dark:border-purple-600/40">
                                Current
                              </span>
                            )}
                            {plan.isDefault && (
                              <span className="shrink-0 text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-white/[0.12]">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {planned} planned course{planned !== 1 ? "s" : ""}
                            {saved ? ` · saved ${saved}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onSetDefault(index)}
                            disabled={!!plan.isDefault}
                            aria-label={`Set "${plan.name}" as default`}
                            title={
                              plan.isDefault
                                ? "This is your default plan"
                                : "Set as default"
                            }
                            className={`p-1.5 rounded-lg transition-colors ${
                              plan.isDefault
                                ? "text-purple-500 dark:text-purple-300 cursor-default"
                                : "text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-500/10"
                            }`}
                          >
                            <FiStar
                              size={14}
                              className={plan.isDefault ? "fill-current" : ""}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicate(index)}
                            aria-label={`Duplicate "${plan.name}"`}
                            title="Duplicate plan"
                            data-sim-plan-duplicate={plan.name}
                            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                          >
                            <FiCopy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(index)}
                            aria-label={`Delete "${plan.name}"`}
                            title="Delete plan"
                            data-sim-plan-delete={plan.name}
                            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          >
                            <FiTrash2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onLoad(index)}
                            data-sim-plan-load={plan.name}
                            className="ml-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-300 dark:border-white/[0.14] text-gray-700 dark:text-gray-200 hover:border-purple-400 dark:hover:border-purple-500/50 hover:text-purple-700 dark:hover:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                          >
                            {isCurrent ? "Reload" : "Load"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={onSaveCurrent}
                disabled={!canSaveCurrent}
                data-sim-plan-save
                title={
                  canSaveCurrent
                    ? "Save what is on the canvas right now"
                    : "Nothing new on the canvas to save"
                }
                className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 transition-colors ${
                  canSaveCurrent
                    ? "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                    : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                }`}
              >
                <FiPlus size={13} />
                Save current canvas
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-medium rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/[0.1] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
