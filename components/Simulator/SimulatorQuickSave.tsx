"use client";

import { motion } from "framer-motion";
import { FiCheck, FiLoader, FiSave } from "react-icons/fi";

/** Idle is the dirty-canvas resting state; saved is the brief confirmation. */
export type QuickSaveState = "idle" | "saving" | "saved";

/**
 * The header's quick save, sitting immediately beside the plan selector.
 *
 * It only exists when there is something to save, so its presence is the
 * prompt: the selector's amber dot and UNSAVED badge say the canvas has drifted
 * from the stored plan, and this is the one click that reconciles them. There
 * is no disabled resting state, because a permanently greyed Save teaches
 * people to stop looking at it.
 *
 * The parent decides when it mounts (dirty, or briefly after a save so the
 * confirmation can be read) and animates it in and out.
 */
export default function SimulatorQuickSave({
  state,
  onSave,
}: {
  state: QuickSaveState;
  onSave: () => void;
}) {
  const saved = state === "saved";
  const saving = state === "saving";

  return (
    <motion.button
      type="button"
      onClick={onSave}
      disabled={saving}
      data-sim-quick-save
      data-sim-quick-save-state={state}
      title={
        saved
          ? "Saved to your plan"
          : "Save the canvas into this plan (Cmd+S)"
      }
      initial={{ opacity: 0, scale: 0.92, x: -4 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.92, x: -4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      whileHover={saving || saved ? {} : { scale: 1.02 }}
      whileTap={saving || saved ? {} : { scale: 0.98 }}
      aria-label={saved ? "Saved" : "Save the canvas into this plan"}
      className={`h-10 px-3 sm:px-3.5 shrink-0 inline-flex items-center gap-1.5 rounded-xl border text-sm font-medium transition-colors duration-200 ${
        saved
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500 hover:border-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/40 dark:hover:bg-emerald-500/30"
      } ${saving ? "cursor-wait opacity-80" : ""}`}
    >
      {saved ? (
        <FiCheck size={14} className="shrink-0" />
      ) : saving ? (
        <FiLoader size={14} className="shrink-0 animate-spin" />
      ) : (
        <FiSave size={14} className="shrink-0" />
      )}
      {/* Below sm the plan name needs every pixel, so the label drops and the
          icon carries it: a disk to save, a check once it landed. */}
      <span aria-live="polite" className="hidden sm:inline">
        {saved ? "Saved" : saving ? "Saving" : "Save"}
      </span>
    </motion.button>
  );
}
