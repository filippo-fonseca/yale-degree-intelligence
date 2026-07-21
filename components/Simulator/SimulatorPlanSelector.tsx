"use client";

import { FiChevronDown } from "react-icons/fi";

/**
 * The single plan control in the simulator toolbar.
 *
 * It replaces the old pair (a passive "PLAN: <name>" chip plus a separate
 * "Load Plan" button): one element that reads the plan you are on, carries its
 * default and unsaved badges, and opens the plan manager when clicked. It sits
 * beside the Canvas/Progress switcher as a peer, not as a third segment, so it
 * reads as its own thing. It is present on both views because the Progress
 * numbers are scoped to whichever plan is loaded.
 */
export default function SimulatorPlanSelector({
  planName,
  isDefault,
  hasChanges,
  onOpen,
  disabled = false,
}: {
  planName: string | null;
  isDefault: boolean;
  hasChanges: boolean;
  onOpen: () => void;
  disabled?: boolean;
}) {
  const dotClass = planName
    ? hasChanges
      ? "bg-amber-400"
      : "bg-emerald-400"
    : hasChanges
      ? "bg-blue-400"
      : "bg-gray-400 dark:bg-gray-500";

  const label = planName ?? (hasChanges ? "Unsaved new plan" : "No plan loaded");

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      data-tour="simulator-plan-actions"
      data-sim-plan-selector
      aria-haspopup="dialog"
      title={
        disabled
          ? "Sign in to save and switch plans"
          : `${label}. Switch, save, or manage your plans.`
      }
      className={`h-10 max-w-full sm:max-w-sm w-full sm:w-auto px-3 flex items-center gap-2 rounded-xl border text-left transition-all duration-200 ${
        disabled
          ? "bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06] cursor-not-allowed opacity-70"
          : "bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.06]"
      }`}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 shrink-0">
        Plan
      </span>
      <span className="w-px h-4 bg-gray-200 dark:bg-white/10 shrink-0" />
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${dotClass} ${hasChanges ? "animate-pulse" : ""}`}
      />
      <span
        className={`text-sm truncate ${
          planName
            ? "font-medium text-gray-800 dark:text-gray-200"
            : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {label}
      </span>
      {planName && isDefault && (
        <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/40 shrink-0">
          Default
        </span>
      )}
      {hasChanges && planName && (
        <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/25 shrink-0">
          Unsaved
        </span>
      )}
      <FiChevronDown
        size={14}
        className="ml-auto shrink-0 text-gray-400 dark:text-gray-500"
      />
    </button>
  );
}
