"use client";

import { RequirementDot, type RequirementDotKind } from "./CourseRequirementBadge";

const LABELS: Record<RequirementDotKind, string> = {
  major: "Counts toward a major",
  certificate: "Counts toward a certificate",
  both: "Both",
};

/**
 * Key for the requirement dots on the canvas cards. Lists only the kinds that
 * appear on the current plan, so a student with no certificate never sees a
 * teal entry, and it hides entirely when no course counts toward anything.
 */
export default function SimulatorRequirementLegend({
  kinds,
}: {
  kinds: RequirementDotKind[];
}) {
  if (kinds.length === 0) return null;
  return (
    <div
      data-sim-req-legend
      className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500 dark:text-gray-400"
    >
      {kinds.map((kind) => (
        <span key={kind} className="inline-flex items-center gap-1.5">
          <RequirementDot kind={kind} />
          {LABELS[kind]}
        </span>
      ))}
      <span className="text-gray-400 dark:text-gray-500">
        Hover a dot to see which requirement; click one to open it in
        Projected progress.
      </span>
    </div>
  );
}
