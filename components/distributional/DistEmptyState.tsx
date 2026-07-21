"use client";

import { FiGrid } from "react-icons/fi";
import { EmptyState } from "@/components/ui/EmptyState";

// ─── Empty State ──────────────────────────────────────────────────────────────

export function DistEmptyState({ onGoToCourses }: { onGoToCourses?: () => void }) {
  return (
    <EmptyState
      icon={<FiGrid className="text-blue-400 dark:text-blue-300" size={28} />}
      title="No distributionals tagged yet"
      description="Open My courses and tap + assign distributional on a course to start tracking Yale's area and skill requirements."
      primaryAction={
        onGoToCourses
          ? { label: "Go to My courses", onClick: onGoToCourses }
          : undefined
      }
    />
  );
}
