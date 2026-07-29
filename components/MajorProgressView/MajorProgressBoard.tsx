"use client";

import RequirementCard from "./RequirementCard";
import { STATUS_CLASSES } from "./requirementStatus";
import type { BoardColumn } from "./useMajorProgressData";
import type { RequirementCardHandlers } from "./RequirementCard";

export default function MajorProgressBoard({
  columns,
  mobileColumn,
  setMobileColumn,
  cardHandlers,
}: {
  columns: BoardColumn[];
  mobileColumn: "remaining" | "inProgress" | "completed";
  setMobileColumn: (col: "remaining" | "inProgress" | "completed") => void;
  cardHandlers: RequirementCardHandlers;
}) {
  return (
    <div>
      <div className="md:hidden flex items-center gap-1.5 mb-3">
        {columns.map((col) => (
          <button
            key={col.key}
            type="button"
            onClick={() => setMobileColumn(col.key)}
            className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg transition-all duration-200 border ${
              mobileColumn === col.key
                ? "bg-gray-100 dark:bg-gray-800/60 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                : "bg-transparent border-gray-200 dark:border-gray-800/50 text-gray-400 dark:text-gray-500"
            }`}
          >
            {col.label} ({col.items.length})
          </button>
        ))}
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        data-tour="major-requirements-board"
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className={`${
              mobileColumn === col.key ? "flex" : "hidden"
            } md:flex flex-col rounded-xl border border-gray-200 dark:border-gray-800/50 bg-white/40 dark:bg-gray-900/20 max-h-[70vh]`}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b border-gray-200 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md">
              <h4
                className={`font-medium text-sm ${STATUS_CLASSES[col.status].accent}`}
              >
                {col.label}
              </h4>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {col.items.length} reqs · {col.credits} cr
              </span>
            </div>
            <div className="overflow-y-auto p-3 space-y-3">
              {col.items.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {col.emptyText}
                </p>
              ) : (
                col.items.map((stats) => (
                  <RequirementCard
                    key={stats.req.id ?? stats.req.name}
                    stats={stats}
                    handlers={cardHandlers}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
