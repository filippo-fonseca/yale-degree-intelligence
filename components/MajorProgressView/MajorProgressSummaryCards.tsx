"use client";

import MajorStatCard from "./MajorStatCard";

export default function MajorProgressSummaryCards({
  showInProgressStats,
  completedCredits,
  inProgressCredits,
  totalCredits,
  completionPercentage,
  withInProgressPercentage,
}: {
  showInProgressStats: boolean;
  completedCredits: number | undefined;
  inProgressCredits: number;
  totalCredits: number | undefined;
  completionPercentage: number;
  withInProgressPercentage: number;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 ${
        showInProgressStats ? "md:grid-cols-3" : "md:grid-cols-2"
      }`}
    >
      <MajorStatCard
        label="Total Credits"
        value={
          showInProgressStats
            ? `${completedCredits! + inProgressCredits}/${totalCredits}`
            : `${completedCredits}/${totalCredits}`
        }
        color={
          showInProgressStats
            ? "text-purple-600 dark:text-purple-300"
            : "text-blue-600 dark:text-blue-300"
        }
        infoTooltip="This shows your completed credits out of the total (including any prereqs!) required for your indicated major."
      />
      <MajorStatCard
        label="Completion"
        value={`${(showInProgressStats
          ? withInProgressPercentage
          : completionPercentage
        ).toFixed(0)}%`}
        color="text-emerald-600 dark:text-emerald-300"
      />
      {showInProgressStats && (
        <MajorStatCard
          label="In-progress Credits"
          value={`${inProgressCredits}`}
          color="text-blue-600 dark:text-blue-300"
          infoTooltip="Credits from courses you're currently taking that count toward this major but aren't finished yet."
        />
      )}
    </div>
  );
}
