"use client";

import { FiUpload } from "react-icons/fi";
import { EmptyState } from "@/components/ui/EmptyState";

type TabNeedsCoursesEmptyProps = {
  tabLabel: string;
  onGoToCourses: () => void;
};

export function TabNeedsCoursesEmpty({
  tabLabel,
  onGoToCourses,
}: TabNeedsCoursesEmptyProps) {
  return (
    <EmptyState
      icon={<FiUpload className="w-7 h-7 text-purple-500 dark:text-purple-300" />}
      title={`Upload your transcript to unlock ${tabLabel}`}
      description="Add your courses on the My courses tab — we'll parse your transcript and unlock stats, friends, and distributionals."
      primaryAction={{
        label: "Go to My courses",
        onClick: onGoToCourses,
      }}
    />
  );
}
