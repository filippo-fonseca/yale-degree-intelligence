"use client";

import type { User } from "firebase/auth";
import { motion } from "framer-motion";
import { Course } from "@/lib/types";
import { MAJORS } from "@/lib/majors";
import { MajorProgressView } from "./dynamicTabs";
import { SharedCoursesConflictManager } from "./SharedCoursesConflictManager";
import type { UserProfile } from "./types";
import type { MajorProgress } from "@/lib/majors";

interface MajorTabPanelProps {
  user: User;
  userProfile: UserProfile | null;
  courses: Course[];
  selectedMajor: string;
  onSelectMajor: (major: string) => void;
  getMajorProgress: () => MajorProgress | null;
  onRequirementChange: () => void;
  onTogglePrereqOverride: (code: string) => void;
}

export function MajorTabPanel({
  user,
  userProfile,
  courses,
  selectedMajor,
  onSelectMajor,
  getMajorProgress,
  onRequirementChange,
  onTogglePrereqOverride,
}: MajorTabPanelProps) {
  const progress = getMajorProgress();

  return (
    <motion.div
      key="major"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {user && userProfile && (
        <div className="mb-6">
          <h2 className="text-3xl font-medium text-gray-900 dark:text-white">
            This is how you&apos;re doing for your{" "}
            {userProfile?.majors?.length > 1 ? "majors" : "major"},{" "}
            {user?.displayName?.split(" ")[0]}.
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            This is based on data from your transcript and the{" "}
            {userProfile?.majors?.length > 1 ? "majors" : "major"} you indicated
            to us.
          </p>
        </div>
      )}
      {userProfile && userProfile?.majors?.length > 1 && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
            Viewing Progress For
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {userProfile.majors.map((major) => (
              <button
                key={major}
                onClick={() => onSelectMajor(major)}
                className={`px-3 py-1.5 rounded-xl text-sm transition-all duration-200 ${
                  selectedMajor === major
                    ? "bg-blue-600 text-white border border-blue-600 shadow-[0_2px_8px_rgba(59,130,246,0.25)]"
                    : "bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800/60 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-800 dark:hover:text-gray-300"
                }`}
              >
                {major} - {MAJORS[major] || major}
              </button>
            ))}
            <SharedCoursesConflictManager
              userProfile={userProfile}
              courses={courses}
              onTogglePrereqOverride={onTogglePrereqOverride}
            />
          </div>
        </div>
      )}
      {progress ? (
        <MajorProgressView
          selectedMajor={selectedMajor}
          progress={progress}
          onRequirementChange={onRequirementChange}
          courses={courses}
          userMajors={userProfile?.majors ?? []}
          userCertificates={userProfile?.certificates ?? []}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {!selectedMajor
              ? "Please select a major to view your progress."
              : "Loading your major progress..."}
          </p>
        </div>
      )}
    </motion.div>
  );
}
