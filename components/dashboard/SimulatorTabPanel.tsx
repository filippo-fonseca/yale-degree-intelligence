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
  const certificates = userProfile.certificates ?? [];

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
          certificates,
          courses,
          userId,
        )}
        completedCourses={courses.filter(
          (c) => c.status === "completed" || c.status === "in-progress",
        )}
        graduationYear={userProfile.graduationYear}
        userMajors={userProfile.majors}
        userCertificates={certificates}
        majorPermanentManuals={courses.flatMap((course) =>
          (course.manualRequirementsFulfilled || [])
            .filter((m) => m.major_id && !m.certificate_id)
            .map((m) => ({
              code: course.code,
              requirement: m.requirement_title,
              credits: course.credits || 1,
              programType: "major" as const,
              programId: m.major_id,
            })),
        )}
        certificatePermanentManuals={courses.flatMap((course) =>
          (course.manualRequirementsFulfilled || [])
            .filter((m) => m.certificate_id)
            .map((m) => ({
              code: course.code,
              requirement: m.requirement_title,
              credits: course.credits || 1,
              programType: "certificate" as const,
              programId: m.certificate_id,
            })),
        )}
        onRegisterNavCheck={onRegisterNavCheck}
      />
    </motion.div>
  );
}
