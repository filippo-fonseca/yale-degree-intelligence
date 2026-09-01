"use client";

import React from "react";
import {
  ReqStats,
  ReqStatus,
  getReqStatus,
  getReqRatio,
  getHeatCellClasses,
} from "./requirementStatus";

const STATUS_LABELS: Record<ReqStatus, string> = {
  completed: "Complete",
  inProgress: "In progress",
  partial: "Partially done",
  notStarted: "Not started",
};

const LEGEND: { label: string; swatch: string }[] = [
  { label: "Complete", swatch: "bg-emerald-500" },
  { label: "In progress", swatch: "bg-blue-500" },
  { label: "Partially done", swatch: "bg-amber-400" },
  { label: "Not started", swatch: "bg-red-300" },
];

export default function HeatMapView({
  cells,
  onOpenRequirement,
}: {
  cells: ReqStats[];
  onOpenRequirement: (req: any) => void;
}) {
  if (!cells || cells.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No requirements to display yet.
      </p>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${item.swatch}`} aria-hidden />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {cells.map((s) => {
          const required = s.req.required || 0;
          const status = getReqStatus(
            s.reqCompleted,
            s.reqInProgress,
            required,
          );
          const ratio = getReqRatio(s.reqCompleted, required);
          const cellClasses = getHeatCellClasses(status, ratio);
          const earned = s.reqCompleted + s.reqInProgress;
          const key = s.req.id ?? s.req.name;

          return (
            <div key={key} className="relative group">
              <button
                type="button"
                data-tour="major-heatmap-cell"
                onClick={() =>
                  onOpenRequirement({
                    id: s.req.id,
                    name: s.req.name,
                    description: s.req.description,
                    required: s.req.required,
                    options: s.req.options,
                  })
                }
                className={`flex flex-col justify-between w-full aspect-square rounded-lg border p-1.5 text-left hover:scale-[1.05] transition-transform focus:outline-none focus:ring-2 focus:ring-purple-400/50 ${cellClasses}`}
              >
                <span className="text-[9px] leading-tight line-clamp-2 font-medium">
                  {s.req.name}
                </span>
                <span className="text-[8px] opacity-80 mt-1">
                  {earned}/{required}
                </span>
              </button>

              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none absolute z-20 bottom-full mb-1 left-1/2 -translate-x-1/2 max-w-[12rem] bg-white dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-lg shadow-lg text-gray-700 dark:text-gray-200 p-2">
                <p className="text-[11px] font-bold leading-snug whitespace-normal">
                  {s.req.name}
                </p>
                <p className="text-[10px] opacity-80 mt-0.5 whitespace-nowrap">
                  {STATUS_LABELS[status]} · {earned}/{required}{" "}
                  {required === 1 ? "course" : "courses"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
