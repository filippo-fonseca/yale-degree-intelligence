"use client";

import { motion } from "framer-motion";
import { Course } from "@/lib/types";
import { TabNeedsCoursesEmpty } from "@/components/ui/TabNeedsCoursesEmpty";
import { DistributionalsView } from "./dynamicTabs";
import type { Plan } from "@/components/Simulator/planTypes";

interface DistributionalsTabPanelProps {
  courses: Course[];
  hasData: boolean;
  /** Drives the milestone chart's deadline terms. */
  graduationYear?: number | null;
  /** The student's main Simulator plan, so planned courses show as planned. */
  plan?: Plan | null;
  onGoToCourses: () => void;
}

export function DistributionalsTabPanel({
  courses,
  hasData,
  graduationYear,
  plan,
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
        <DistributionalsView
          courses={courses}
          graduationYear={graduationYear}
          plan={plan}
          onGoToCourses={onGoToCourses}
        />
      )}
    </motion.div>
  );
}
