"use client";

import {
  getReqStatus,
  getReqRatio,
  getHeatCellClasses,
} from "../MajorProgressView/requirementStatus";
import { DIST_HEAT_ITEMS, DIST_STATUS_LABEL } from "./constants";

// ─── Heat-map grid for distributionals ────────────────────────────────────────

export function DistHeatMap({
  getCount,
}: {
  getCount: (code: string) => number;
}) {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-gray-800/50 shadow-neu">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {[
          { label: "Met", swatch: "bg-emerald-500" },
          { label: "Partial", swatch: "bg-amber-400" },
          { label: "Not started", swatch: "bg-red-300" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${item.swatch}`} aria-hidden />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 gap-2">
        {DIST_HEAT_ITEMS.map((item) => {
          const count = getCount(item.code);
          const status = getReqStatus(count, 0, item.target);
          const ratio = getReqRatio(count, item.target);
          const cellClasses = getHeatCellClasses(status, ratio);

          return (
            <div key={item.code} className="relative group">
              <div
                className={`flex flex-col items-center justify-center aspect-square rounded-xl border p-2 ${cellClasses}`}
              >
                <span className="text-sm font-bold">{item.code}</span>
                <span className="text-[10px] opacity-80 mt-0.5">{Math.min(count, item.target)}/{item.target}</span>
              </div>
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none absolute z-20 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-lg shadow-lg text-gray-700 dark:text-gray-200 p-2 whitespace-nowrap">
                <p className="text-[11px] font-bold">{item.name}</p>
                <p className="text-[10px] opacity-75 mt-0.5">{DIST_STATUS_LABEL[status]} · {count}/{item.target} credits</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
