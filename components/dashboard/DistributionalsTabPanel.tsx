"use client";

import { motion } from "framer-motion";
import { Course } from "@/lib/types";
import { TabNeedsCoursesEmpty } from "@/components/ui/TabNeedsCoursesEmpty";
import { DistributionalsView } from "./dynamicTabs";

interface DistributionalsTabPanelProps {
  courses: Course[];
  hasData: boolean;
  onGoToCourses: () => void;
}

export function DistributionalsTabPanel({
  courses,
  hasData,
  onGoToCourses,
}: DistributionalsTabPanelProps) {
  return (
    <motion.div
      key="distributionals"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {!hasData ? (
        <TabNeedsCoursesEmpty
          tabLabel="Distributionals"
          onGoToCourses={onGoToCourses}
        />
      ) : (
        <DistributionalsView courses={courses} onGoToCourses={onGoToCourses} />
      )}
    </motion.div>
  );
}
