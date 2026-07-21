"use client";

import { getMajorDescriptionById } from "@/lib/majors";
import { MAJORS } from "@/lib/majors";

export default function MajorProgressHeader({
  selectedMajor,
  showInProgressStats,
  completionPercentage,
  withInProgressPercentage,
}: {
  selectedMajor: string;
  showInProgressStats: boolean;
  completionPercentage: number;
  withInProgressPercentage: number;
}) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h3 className="text-xl font-medium text-gray-900 dark:text-white">
          {MAJORS[selectedMajor]}
        </h3>
        <p className="text-sm text-gray-500">
          {getMajorDescriptionById(selectedMajor)}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-2xl lg:text-3xl font-medium text-gray-900 dark:text-white">
          {showInProgressStats
            ? withInProgressPercentage.toFixed(0)
            : completionPercentage.toFixed(0)}
          %
        </div>
      </div>
    </div>
  );
}
