"use client";

import type { User } from "firebase/auth";
import { motion } from "framer-motion";
import { Course } from "@/lib/types";
import { FiPlus } from "react-icons/fi";
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
  onOpenSettings: () => void;
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
  onOpenSettings,
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
          <p className="font-sf text-gray-600 dark:text-gray-300">
            This is based on data from your transcript and the{" "}
            {userProfile?.majors?.length > 1 ? "majors" : "major"} you indicated
            to us.
          </p>
        </div>
      )}
      {/* From one major: the row is where you add a second one, and a lone
          chip still names what the progress below is measuring. */}
      {userProfile && (userProfile?.majors?.length ?? 0) >= 1 && (
        <div className="mb-4">
          <label className="mb-1.5 block font-sf text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-500">
            Viewing Progress For
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {userProfile.majors.map((major) => (
              <button
                key={major}
                onClick={() => onSelectMajor(major)}
                className={`rounded-xl border px-3 py-1.5 font-sf text-sm transition-colors ${
                  selectedMajor === major
                    ? "border-transparent bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "border-black/[0.08] bg-white text-gray-600 hover:text-gray-900 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {major} - {MAJORS[major] || major}
              </button>
            ))}
            {userProfile.majors.length < 2 && (
              <button
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1 rounded-xl border border-dashed border-black/[0.14] px-3 py-1.5 font-sf text-sm text-gray-500 transition-colors hover:border-black/25 hover:text-gray-900 dark:border-white/[0.14] dark:text-gray-400 dark:hover:border-white/25 dark:hover:text-white"
                title="Add a second major in Settings"
              >
                <FiPlus size={13} />
                Add a second major
              </button>
            )}
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
