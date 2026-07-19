"use client";

import { motion } from "framer-motion";
import { Course } from "@/lib/types";
import { Simulator } from "./dynamicTabs";
import { buildSimulatorRemainingCourses } from "./buildSimulatorRemainingCourses";
import type { UserProfile } from "./types";

interface SimulatorTabPanelProps {
  userId: string;
  userProfile: UserProfile;
  courses: Course[];
  onRegisterNavCheck: (
    check: ((callback: () => void) => void) | null,
  ) => void;
}

export function SimulatorTabPanel({
  userId,
  userProfile,
  courses,
  onRegisterNavCheck,
}: SimulatorTabPanelProps) {
  return (
    <motion.div
      key="simulator"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Simulator
        remainingCourses={buildSimulatorRemainingCourses(
          userProfile.majors,
          courses,
          userId,
        )}
        completedCourses={courses.filter(
          (c) => c.status === "completed" || c.status === "in-progress",
        )}
        graduationYear={userProfile.graduationYear}
        userMajors={userProfile.majors}
        onRegisterNavCheck={onRegisterNavCheck}
      />
    </motion.div>
  );
}
