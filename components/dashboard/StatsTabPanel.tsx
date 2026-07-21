"use client";

import { motion } from "framer-motion";
import { Course } from "@/lib/types";
import { TabNeedsCoursesEmpty } from "@/components/ui/TabNeedsCoursesEmpty";
import { StatsView } from "./dynamicTabs";

interface StatsTabPanelProps {
  courses: Course[];
  hasData: boolean;
  onGoToCourses: () => void;
}

export function StatsTabPanel({
  courses,
  hasData,
  onGoToCourses,
}: StatsTabPanelProps) {
  return (
    <motion.div
      key="stats"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {!hasData ? (
        <TabNeedsCoursesEmpty
          tabLabel="Academic Stats"
          onGoToCourses={onGoToCourses}
        />
      ) : (
        <>
          <div className="mb-4">
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white">
              Numbers aren&apos;t everything, but they&apos;re important.
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Here&apos;s a comprehensive visual overview of your academic
              trajectory over your time at Yale.
            </p>
          </div>
          <StatsView courses={courses} />
        </>
      )}
    </motion.div>
  );
}
