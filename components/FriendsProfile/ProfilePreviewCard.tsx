"use client";

import { Course, FriendsProfileVisibility, DEFAULT_FRIENDS_PROFILE_VISIBILITY, resolveFriendsProfileVisibility } from "@/lib/types";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { YearBadge } from "@/components/ui/YearBadge";
import { getFullMajorNameById } from "@/lib/majors";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import { truncate } from "@/lib/utils/utils";
import { FiBook, FiCreditCard } from "react-icons/fi";
import { motion } from "framer-motion";

export type ProfilePreviewUser = {
  displayName?: string;
  photoURL?: string | null;
  majors: string[];
  graduationYear?: number;
  bio?: string;
};

type ProfilePreviewCardProps = {
  user: ProfilePreviewUser;
  courses: Course[];
  visibility?: FriendsProfileVisibility;
  isDemo?: boolean;
  compact?: boolean;
};

function stripGrades(courses: Course[]): Course[] {
  return courses.map((c) => ({ ...c, grade: null }));
}

function getCompletedCount(courses: Course[]) {
  return courses.filter((c) => c.status === "completed" || c.skipped).length;
}

function getTotalCredits(courses: Course[]) {
  return courses
    .filter((c) => c.status === "completed" || c.skipped)
    .reduce((sum, c) => sum + (c.credits || 0), 0);
}

function getDistCount(courses: Course[]) {
  const tags = new Set<string>();
  courses.forEach((c) => {
    (c.distributionals || []).forEach((d) => tags.add(d));
  });
  return tags.size;
}

export default function ProfilePreviewCard({
  user,
  courses,
  visibility,
  isDemo = false,
  compact = false,
}: ProfilePreviewCardProps) {
  const vis = resolveFriendsProfileVisibility(visibility);
  const safeCourses = stripGrades(courses);
  const displayName = user.displayName || "Yale Student";
  const majorsLabel =
    user.majors.length > 0
      ? user.majors.map((m) => getFullMajorNameById(m) || m).join(", ")
      : null;

  const years = Array.from(
    new Set(safeCourses.map((c) => c.year).filter((y): y is number => !!y)),
  ).sort((a, b) => a - b);

  const previewCourses = safeCourses
    .filter((c) => c.year && c.semester)
    .slice(0, compact ? 4 : 8);

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        isDemo
          ? "border-pink-500/20 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-transparent"
          : "border-gray-200 dark:border-white/[0.08] bg-white dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60"
      }`}
    >
      {/* Header */}
      <div className={`${compact ? "p-3" : "p-4"} text-center border-b border-gray-200/80 dark:border-white/[0.06]`}>
        <div className="flex flex-col items-center">
          <UserAvatar
            photoURL={user.photoURL}
            displayName={displayName}
            size={compact ? 48 : 56}
          />
          <p className={`mt-2 font-medium text-gray-900 dark:text-white ${compact ? "text-sm" : "text-base"}`}>
            {displayName}
          </p>
          {majorsLabel && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-xs truncate">
              {truncate(majorsLabel, 60)}
            </p>
          )}
          {user.graduationYear && (
            <div className="mt-1">
              <YearBadge graduationYear={user.graduationYear} noPadding />
            </div>
          )}
          {vis.showBio && user.bio && (
            <p className="mt-2 text-[11px] text-gray-600 dark:text-gray-300 max-w-sm line-clamp-2">
              {user.bio}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      {vis.showStats && (
        <div className={`grid grid-cols-2 gap-2 ${compact ? "p-2" : "p-3"}`}>
          <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/15 flex items-center gap-2">
            <FiBook className="text-blue-500 shrink-0" size={12} />
            <div>
              <p className="text-[9px] text-gray-500">Courses</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {getCompletedCount(safeCourses)}
              </p>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/15 flex items-center gap-2">
            <FiCreditCard className="text-purple-500 shrink-0" size={12} />
            <div>
              <p className="text-[9px] text-gray-500">Credits</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {getTotalCredits(safeCourses)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Distributionals hint */}
      {vis.showDistributionals && getDistCount(safeCourses) > 0 && (
        <div className={`${compact ? "px-2 pb-2" : "px-3 pb-3"}`}>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 px-1">
            {getDistCount(safeCourses)} distributional area
            {getDistCount(safeCourses) !== 1 ? "s" : ""} tagged
          </p>
        </div>
      )}

      {/* Courses by semester skeleton */}
      {vis.showCourses && (
        <div className={`border-t border-gray-200/80 dark:border-white/[0.06] ${compact ? "p-2" : "p-3"}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
            Courses by semester
          </p>
          {previewCourses.length === 0 ? (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 italic px-1">
              {isDemo ? "Your courses appear here once you enable sharing." : "No courses yet."}
            </p>
          ) : (
            <div className="space-y-1.5">
              {previewCourses.map((course) => (
                <motion.div
                  key={course.id}
                  layout
                  className="flex items-center justify-between px-2 py-1.5 rounded-md bg-gray-50 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06]"
                >
                  <div className="min-w-0 text-left">
                    <p className="text-[11px] font-medium text-gray-800 dark:text-gray-200 truncate">
                      {course.code}
                    </p>
                    <p className="text-[9px] text-gray-400 truncate">
                      {truncate(getCourseNameFromCode(course.code) || "Course", 36)}
                    </p>
                  </div>
                  <span className="text-[9px] text-gray-400 shrink-0 ml-2">
                    {course.semester?.slice(0, 3)} {course.year}
                  </span>
                </motion.div>
              ))}
              {safeCourses.length > previewCourses.length && (
                <p className="text-[9px] text-pink-500 dark:text-pink-400 text-center pt-0.5">
                  +{safeCourses.length - previewCourses.length} more
                </p>
              )}
            </div>
          )}
          {years.length > 0 && !compact && (
            <p className="text-[9px] text-gray-400 mt-2 text-center">
              {years.length} year{years.length !== 1 ? "s" : ""} of coursework
            </p>
          )}
        </div>
      )}

      {isDemo && (
        <div className="px-3 py-2 bg-pink-500/5 border-t border-pink-500/15 text-center">
          <p className="text-[10px] text-pink-600 dark:text-pink-300">
            Preview — grades are never shown
          </p>
        </div>
      )}
    </div>
  );
}

/** Demo data for the enable-friends screen */
export const DEMO_PREVIEW_USER: ProfilePreviewUser = {
  displayName: "Alex Chen",
  majors: ["CPSC"],
  graduationYear: 2027,
  bio: "CS major — happy to chat about course sequencing!",
};

export const DEMO_PREVIEW_COURSES: Course[] = [
  {
    id: "demo-1",
    code: "CPSC 201",
    grade: null,
    semester: "Fall",
    year: 2024,
    userId: "demo",
    status: "completed",
    credits: 1,
    distributionals: ["QR"],
  },
  {
    id: "demo-2",
    code: "ECON 115",
    grade: null,
    semester: "Spring",
    year: 2025,
    userId: "demo",
    status: "completed",
    credits: 1,
    distributionals: ["So"],
  },
  {
    id: "demo-3",
    code: "PHIL 115",
    grade: null,
    semester: "Fall",
    year: 2025,
    userId: "demo",
    status: "in-progress",
    credits: 1,
    distributionals: ["Hu"],
  },
];
