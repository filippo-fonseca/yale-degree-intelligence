"use client";

import { FiInfo, FiZap, FiSliders } from "react-icons/fi";

// ─── Allocation control ───────────────────────────────────────────────────────

export function AllocationControl({
  auto,
  onToggle,
}: {
  auto: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-gray-800/50 shadow-neu flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <FiInfo
          className="text-purple-500 dark:text-purple-300 mt-0.5 flex-shrink-0"
          size={15}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Some courses are tagged for more than one area or skill, but each
          course can only count toward <span className="font-medium text-gray-700 dark:text-gray-300">one</span>.
          {auto
            ? " Auto-allocate picks the split that satisfies the most requirements."
            : " Use the dropdowns below to choose where each course counts."}
        </p>
      </div>
      <div className="inline-flex shrink-0 rounded-lg border border-gray-200 dark:border-gray-800/60 bg-gray-100 dark:bg-gray-900/50 p-0.5">
        <button
          type="button"
          onClick={() => onToggle(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md transition-all ${
            auto
              ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-600/40"
              : "text-gray-400 dark:text-gray-500 border border-transparent hover:text-gray-600 dark:hover:text-gray-400"
          }`}
        >
          <FiZap size={11} />
          Auto
        </button>
        <button
          type="button"
          onClick={() => onToggle(false)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md transition-all ${
            !auto
              ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-600/40"
              : "text-gray-400 dark:text-gray-500 border border-transparent hover:text-gray-600 dark:hover:text-gray-400"
          }`}
        >
          <FiSliders size={11} />
          Manual
        </button>
      </div>
    </div>
  );
}
