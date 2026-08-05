"use client";

import { FiInfo, FiPlus, FiRefreshCw } from "react-icons/fi";
import SaveShortcutHint from "./SaveShortcutHint";

/**
 * The Canvas pane's own control row, sitting directly above the semester grid.
 *
 * Left: the per-course editor toggles (unit 13's "edit on cards" pills), which
 * decide whether a grade dropdown and a distributional picker appear on each
 * planned course. Right: the verbs that act on the grid, moved off the sticky
 * toolbar so they live next to what they change. They are quiet by default and
 * only pick up a border on hover; Clear canvas turns red there, because it
 * discards work.
 *
 * Canvas only. None of this renders on Progress.
 */
export default function SimulatorCanvasActions({
  showGrades,
  onToggleGrades,
  showDistributionals,
  onToggleDistributionals,
  helpOpen,
  onToggleHelp,
  showSave,
  canSave,
  onSave,
  onClear,
}: {
  showGrades: boolean;
  onToggleGrades: () => void;
  showDistributionals: boolean;
  onToggleDistributionals: () => void;
  helpOpen: boolean;
  onToggleHelp: () => void;
  /** Hidden without a session, the same gate the old toolbar button used. */
  showSave: boolean;
  canSave: boolean;
  /** The header's quick save, shared verbatim so the two cannot diverge. */
  onSave: () => void;
  onClear: () => void;
}) {
  const verbClass =
    "inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg border border-transparent transition-colors";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        Edit on cards:
      </span>
      <button
        type="button"
        onClick={onToggleGrades}
        aria-pressed={showGrades}
        className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all duration-200 ${
          showGrades
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-600/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400"
        }`}
      >
        Grades
      </button>
      <button
        type="button"
        onClick={onToggleDistributionals}
        aria-pressed={showDistributionals}
        className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all duration-200 ${
          showDistributionals
            ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-600/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400"
        }`}
      >
        Distributionals
      </button>

      <div className="ml-auto flex items-center gap-1" data-sim-canvas-actions>
        <button
          type="button"
          onClick={onToggleHelp}
          aria-pressed={helpOpen}
          className={`${verbClass} text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-white/10 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06]`}
        >
          <FiInfo size={12} />
          Help
        </button>
        {showSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            data-sim-canvas-save
            title={
              canSave
                ? "Save what is on the canvas right now (Cmd+S)"
                : "Nothing new on the canvas to save"
            }
            className={`${verbClass} ${
              canSave
                ? "text-emerald-700 dark:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
            }`}
          >
            <FiPlus size={12} />
            Save
            {canSave && (
              <SaveShortcutHint className="hidden sm:inline-block border-emerald-600/30 bg-emerald-500/10 dark:border-emerald-400/25 dark:bg-emerald-400/10" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          data-sim-canvas-clear
          className={`${verbClass} text-gray-500 dark:text-gray-400 hover:border-red-300 dark:hover:border-red-500/30 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10`}
        >
          <FiRefreshCw size={12} />
          Clear canvas
        </button>
      </div>
    </div>
  );
}
