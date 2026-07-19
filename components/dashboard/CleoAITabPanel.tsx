"use client";

import { motion } from "framer-motion";
import { Course } from "@/lib/types";
import { CleoAITab } from "./dynamicTabs";
import type { UserProfile } from "./types";
import type { AcademicStatsSummary } from "@/lib/utils/academicStats";

interface CleoAITabPanelProps {
  courses: Course[];
  selectedMajor: string;
  userProfile: UserProfile | null;
  stats: AcademicStatsSummary | null;
}

export function CleoAITabPanel({
  courses,
  selectedMajor,
  userProfile,
  stats,
}: CleoAITabPanelProps) {
  return (
    <motion.div
      key="cleoai"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-[calc(100vh-200px)]"
    >
      <CleoAITab
        courses={courses}
        selectedMajor={selectedMajor}
        userProfile={userProfile}
        stats={stats}
      />
    </motion.div>
  );
}
