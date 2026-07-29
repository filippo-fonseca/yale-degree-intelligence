"use client";

import { motion } from "framer-motion";

export default function MajorProgressBar({
  showInProgressStats,
  setShowInProgressStats,
  completionPercentage,
  withInProgressPercentage,
}: {
  showInProgressStats: boolean;
  setShowInProgressStats: (value: boolean) => void;
  completionPercentage: number;
  withInProgressPercentage: number;
}) {
  return (
    <div
      data-tour="major-progress-bar"
      className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-gray-800/50 shadow-neu"
    >
      {/* Same light-mode ramp the certificate bar uses: purple-400 sits at
          2.1:1 on the gray-200 track, which is too faint to show where the
          in-progress fill ends. Light steps both fills down; dark: keeps the
          shades this bar has always had. */}
      <div className="relative w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
        {showInProgressStats && (
          <motion.div
            key="inprogress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${withInProgressPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full bg-purple-500 dark:bg-purple-500/70"
          />
        )}
        <motion.div
          key={showInProgressStats ? "completed-fill-ip" : "completed-fill-only"}
          initial={{ width: 0 }}
          animate={{ width: `${completionPercentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 rounded-full bg-violet-700 dark:bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]"
        />
      </div>

      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Show:
        </span>
        <button
          onClick={() => setShowInProgressStats(false)}
          className={`px-2.5 py-1 text-[11px] rounded-lg transition-all duration-200 ${
            !showInProgressStats
              ? "bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-600/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/50"
          }`}
        >
          Completed Only
        </button>
        <button
          onClick={() => setShowInProgressStats(true)}
          className={`px-2.5 py-1 text-[11px] rounded-lg transition-all duration-200 ${
            showInProgressStats
              ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-600/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/50"
          }`}
        >
          + In Progress
        </button>
      </div>
    </div>
  );
}
