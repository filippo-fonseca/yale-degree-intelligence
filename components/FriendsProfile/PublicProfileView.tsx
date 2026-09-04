"use client";

import { motion } from "framer-motion";
import {
  FiBook,
  FiCalendar,
  FiCreditCard,
  FiLock,
  FiTrendingUp,
} from "react-icons/fi";
import { Course, FriendsProfileVisibility } from "@/lib/types";
import { resolveFriendsProfileVisibility } from "@/lib/types";
import { getFullMajorNameById } from "@/lib/majors";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import { truncate } from "@/lib/utils/utils";
import { YearBadge } from "@/components/ui/YearBadge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  allocateDistributionals,
  sumCourseCredits,
} from "@/lib/distributionalAllocation";
import { effectiveDistributionals } from "@/lib/utils/effectiveDistributionals";
import { primaryLanguageTrack } from "@/lib/languageRequirement";
import {
  getCompletedCoursesCount,
  getInProgressCount,
  getSemesterCount,
  getSortedYears,
  getTotalCreditsTaken,
  sortSemesters,
  type ProfileCourse,
} from "@/lib/utils/publicProfileStats";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublicProfileData {
  displayName?: string;
  email?: string;
  photoURL?: string;
  majors: string[];
  graduationYear?: number;
  bio?: string;
}

export interface PublicProfileViewProps {
  profile: PublicProfileData;
  courses: ProfileCourse[];
  visibility?: FriendsProfileVisibility;
  isPreview?: boolean;
  isOwnProfile?: boolean;
  friendsFeatureDisabled?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AREA_REQS = [
  { code: "Hu", name: "Humanities", color: "purple" },
  { code: "So", name: "Social Sciences", color: "sky" },
  { code: "Sc", name: "Sciences", color: "emerald" },
] as const;

const SKILL_REQS = [
  { code: "QR", name: "QR", color: "red" },
  { code: "WR", name: "Writing", color: "orange" },
] as const;

const CARD_SURFACE =
  "rounded-xl bg-gradient-to-br from-gray-900/60 via-gray-900/40 to-gray-950/60 backdrop-blur-md border border-gray-800/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.25)]";

/**
 * One colour per distributional, driving both the badge and the bar under it so
 * the two cannot drift apart. Spelled out per code rather than composed from a
 * hue name, because Tailwind only emits classes it can see literally.
 *
 * Dark-only by design, like the rest of this view. The shared `getDistPillStyle`
 * helper is wrong here: it carries a light-mode ink (`text-*-700`) that lands on
 * this permanently dark card whenever the viewer's own app is in light mode,
 * which is what made the badges look muddy. Matching the badge tint to its bar
 * also fixes the other half of it, a washed-out chip sitting above a fully
 * saturated bar.
 *
 * Hues intentionally match lib/constants DIST_PILL_STYLES so a distributional is
 * the same colour here as it is inside the app.
 */
const DIST_COLORS: Record<string, { bar: string; pill: string }> = {
  Hu: {
    bar: "bg-purple-400",
    pill: "bg-purple-400/15 text-purple-200 border-purple-400/30",
  },
  So: {
    bar: "bg-sky-400",
    pill: "bg-sky-400/15 text-sky-200 border-sky-400/30",
  },
  Sc: {
    bar: "bg-emerald-400",
    pill: "bg-emerald-400/15 text-emerald-200 border-emerald-400/30",
  },
  QR: {
    bar: "bg-red-400",
    pill: "bg-red-400/15 text-red-200 border-red-400/30",
  },
  WR: {
    bar: "bg-orange-400",
    pill: "bg-orange-400/15 text-orange-200 border-orange-400/30",
  },
};

const DIST_FALLBACK = {
  bar: "bg-gray-500",
  pill: "bg-gray-500/15 text-gray-300 border-gray-500/30",
};

const distColors = (code: string) => DIST_COLORS[code] ?? DIST_FALLBACK;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayName(profile: PublicProfileData): string {
  if (profile.displayName?.trim()) return profile.displayName.trim();
  if (profile.email?.endsWith("@yale.edu")) {
    const namePart = profile.email.split("@")[0];
    const [firstName, lastName] = namePart.split(".");
    if (firstName && lastName) {
      return `${firstName.charAt(0).toUpperCase() + firstName.slice(1)} ${lastName.charAt(0).toUpperCase() + lastName.slice(1)}`;
    }
  }
  if (profile.email) return profile.email.split("@")[0];
  return "Yale Student";
}

function toCourseWithId(c: ProfileCourse, idx: number): Course {
  if ("id" in c && c.id) return c as Course;
  return {
    id: `public-${idx}`,
    code: c.code,
    semester: c.semester,
    year: c.year,
    credits: c.credits,
    status: c.status,
    grade: null,
    userId: "",
    skipped: c.skipped,
    manualRequirementsFulfilled: c.manualRequirementsFulfilled,
    distributionals: c.distributionals,
  };
}

function courseStatusBadge(course: ProfileCourse): {
  label: string;
  className: string;
} {
  if (course.skipped || course.status === "skipped") {
    return {
      label: "Credit elsewhere",
      className:
        "bg-gray-800/50 text-gray-400 border-gray-700/50",
    };
  }
  if (course.status === "in-progress") {
    return {
      label: "In progress",
      className:
        "bg-purple-900/30 text-purple-300 border-purple-700/40",
    };
  }
  return {
    label: "Completed",
    className:
      "bg-emerald-900/30 text-emerald-300 border-emerald-700/40",
  };
}

function courseCardSurface(course: ProfileCourse): string {
  if (course.skipped || course.status === "skipped") {
    return "bg-gray-800/20 border-gray-700/40";
  }
  if (course.status === "in-progress") {
    return "bg-purple-900/15 border-purple-800/40";
  }
  return "bg-emerald-900/15 border-emerald-800/40";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatTile({
  icon,
  label,
  value,
  iconBg,
  compact,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBg: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`${CARD_SURFACE} ${compact ? "p-2.5" : "p-3"}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`${compact ? "p-1" : "p-1.5"} rounded-lg border ${iconBg}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 truncate">{label}</p>
          <p className={`${compact ? "text-base" : "text-lg"} font-medium text-white`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function CompactDistributionalProgress({ courses }: { courses: Course[] }) {
  const allocation = allocateDistributionals(courses, {
    auto: true,
    overrides: {},
  });
  const allocCredits = (code: string) =>
    sumCourseCredits(allocation.coursesByReq[code] || []);

  const distMap: Record<string, Course[]> = {};
  courses.forEach((course) => {
    if (course.skipped) return;
    effectiveDistributionals(course).forEach((d) => {
      if (!distMap[d]) distMap[d] = [];
      distMap[d].push(course);
    });
  });
  // Language progress belongs to one language at a time, so report the track
  // that gets furthest rather than mixing every L-tag together.
  const langTrack = primaryLanguageTrack(distMap);
  const placementLevel = langTrack?.placement ?? null;
  const requiredLevels = langTrack?.requiredLevels ?? [];
  const completedRequired = langTrack?.completedRequired ?? [];

  const allReqs = [...AREA_REQS, ...SKILL_REQS];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {allReqs.map((req) => {
          const credits = allocCredits(req.code);
          const target = 2;
          const pct = Math.min(100, (credits / target) * 100);
          const met = credits >= target;

          return (
            <div
              key={req.code}
              className="p-2.5 rounded-lg bg-gray-800/30 border border-gray-700/40"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${distColors(req.code).pill}`}
                >
                  {req.code}
                </span>
                {met && (
                  <span className="text-[9px] text-emerald-400">✓</span>
                )}
              </div>
              <div className="relative w-full bg-gray-800/70 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all ${distColors(req.code).bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                {credits}/{target} cr
              </p>
            </div>
          );
        })}
      </div>

      {placementLevel !== null && (
        <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-700/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">
              {langTrack ? langTrack.label : "Language"}
            </span>
            <span className="text-[10px] text-teal-300">
              Placement L{placementLevel}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {requiredLevels.map((level) => {
              const done = completedRequired.includes(level);
              return (
                <span
                  key={level}
                  className={`text-[10px] px-2 py-0.5 rounded-md border ${
                    done
                      ? "bg-teal-900/30 text-teal-300 border-teal-700/40"
                      : "bg-gray-800/40 text-gray-500 border-gray-700/40"
                  }`}
                >
                  {level}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CoursesBySemester({
  courses,
  compact,
}: {
  courses: ProfileCourse[];
  compact?: boolean;
}) {
  const years = getSortedYears(courses);
  const ungrouped = courses.filter((c) => !c.year || !c.semester);

  if (courses.length === 0) {
    return (
      <div className={`${CARD_SURFACE} p-8 text-center`}>
        <p className="text-sm text-gray-400">No courses shared yet</p>
        <p className="text-xs text-gray-500 mt-1">
          Course history will appear here once shared.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {years.map((year) => {
        const yearCourses = courses.filter((c) => c.year === year);
        const semesters = sortSemesters(
          Array.from(new Set(yearCourses.map((c) => c.semester))).filter(
            Boolean,
          ) as string[],
        );

        return (
          <div key={year} className={`${CARD_SURFACE} overflow-hidden`}>
            <div className="px-4 py-3 border-b border-gray-800/40 bg-gradient-to-r from-gray-900/60 to-gray-900/20">
              <h3 className="text-sm font-medium text-blue-200">
                {year}
              </h3>
            </div>

            <div className="divide-y divide-gray-800/40">
              {semesters.map((semester) => {
                const semesterCourses = yearCourses.filter(
                  (c) => c.semester === semester,
                );
                const semesterCredits = semesterCourses.reduce(
                  (sum, c) => sum + (c.credits || 0),
                  0,
                );

                return (
                  <div
                    key={`${year}-${semester}`}
                    className={compact ? "p-3" : "p-4"}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm text-gray-300">
                        {semester}
                      </h4>
                      <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-800/40 rounded-md border border-gray-700/40">
                        {semesterCredits} cr
                      </span>
                    </div>

                    <div
                      className={`grid gap-2 ${
                        compact
                          ? "grid-cols-1"
                          : "grid-cols-1 md:grid-cols-2"
                      }`}
                    >
                      {semesterCourses.map((course, idx) => {
                        const badge = courseStatusBadge(course);
                        return (
                          <div
                            key={`${course.code}-${idx}`}
                            className={`p-3 rounded-lg border backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${courseCardSurface(course)}`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <h5 className="font-medium text-sm text-white">
                                  {course.code}
                                </h5>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                  {truncate(
                                    getCourseNameFromCode(course.code) ||
                                      "Course",
                                    compact ? 40 : 50,
                                  )}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded-md border ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  {course.credits} cr
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {ungrouped.length > 0 && (
        <div className={`${CARD_SURFACE} overflow-hidden`}>
          <div className="px-4 py-3 border-b border-gray-800/40 bg-gradient-to-r from-gray-900/60 to-gray-900/20">
            <h3 className="text-sm font-medium text-blue-200">Other</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ungrouped.map((course, idx) => {
                const badge = courseStatusBadge(course);
                return (
                  <div
                    key={`other-${idx}`}
                    className={`p-3 rounded-lg border ${courseCardSurface(course)}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h5 className="font-medium text-sm">{course.code}</h5>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {getCourseNameFromCode(course.code) || "Course"}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md border shrink-0 ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PublicProfileView({
  profile,
  courses,
  visibility,
  isPreview = false,
  isOwnProfile = false,
  friendsFeatureDisabled = false,
}: PublicProfileViewProps) {
  const vis = resolveFriendsProfileVisibility(visibility);
  const displayName = getDisplayName(profile);
  const majorsLabel = profile.majors
    .map((m) => getFullMajorNameById(m) || m)
    .join(", ");

  const coursesWithIds = courses.map(toCourseWithId);
  const hasDistributionals = coursesWithIds.some(
    (c) => !c.skipped && effectiveDistributionals(c).length > 0,
  );

  const showCourseContent = !friendsFeatureDisabled && vis.showCourses;
  const showStatsContent =
    !friendsFeatureDisabled && vis.showStats && courses.length > 0;
  const showDistContent =
    !friendsFeatureDisabled &&
    vis.showDistributionals &&
    hasDistributionals;

  const sectionDelay = isPreview ? 0 : 0.1;

  return (
    <div className={isPreview ? "space-y-4" : "space-y-8"}>
      {/* Header */}
      <motion.div
        initial={isPreview ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: sectionDelay }}
        className={`${CARD_SURFACE} ${isPreview ? "p-4" : "p-6"}`}
      >
        <div className="flex flex-col items-center text-center">
          <UserAvatar
            photoURL={profile.photoURL}
            displayName={displayName}
            email={profile.email}
            size={isPreview ? 56 : 80}
          />

          <h1
            className={`${isPreview ? "text-lg" : "text-xl"} font-medium text-white mt-3`}
          >
            {displayName}
          </h1>

          {profile.majors.length > 0 && (
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              {truncate(majorsLabel, isPreview ? 50 : 70)}
            </p>
          )}

          {profile.graduationYear && (
            <div className="mt-1.5">
              <YearBadge graduationYear={profile.graduationYear} />
            </div>
          )}

          {vis.showBio && profile.bio && (
            <div className="mt-4 w-full">
              <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-700/40">
                <p className="text-sm text-gray-300">{profile.bio}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Friends feature disabled */}
      {friendsFeatureDisabled && !isOwnProfile && (
        <motion.div
          initial={isPreview ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CARD_SURFACE} p-6 text-center`}
        >
          <div className="flex justify-center mb-3">
            <div className="p-2.5 rounded-full bg-gray-800/40 border border-gray-700/40">
              <FiLock className="text-gray-500 w-5 h-5" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-300 mb-1">
            Profile not shared
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            This student hasn&apos;t enabled course sharing yet. They can turn it
            on in Settings to share their academic progress with friends.
          </p>
        </motion.div>
      )}

      {/* Stats */}
      {showStatsContent && (
        <motion.section
          initial={isPreview ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: sectionDelay + 0.1 }}
        >
          <h2 className="text-sm font-medium mb-3 text-gray-300">
            At a glance
          </h2>
          <div
            className={`grid gap-2 ${
              isPreview
                ? "grid-cols-2"
                : "grid-cols-2 md:grid-cols-4"
            }`}
          >
            <StatTile
              icon={<FiBook className="text-blue-400" size={14} />}
              iconBg="bg-blue-900/25 border-blue-700/40"
              label="Completed"
              value={getCompletedCoursesCount(courses)}
              compact={isPreview}
            />
            <StatTile
              icon={<FiCreditCard className="text-purple-400" size={14} />}
              iconBg="bg-purple-900/25 border-purple-700/40"
              label="Credits taken"
              value={getTotalCreditsTaken(courses)}
              compact={isPreview}
            />
            <StatTile
              icon={<FiCalendar className="text-pink-400" size={14} />}
              iconBg="bg-pink-900/25 border-pink-700/40"
              label="Semesters"
              value={getSemesterCount(courses)}
              compact={isPreview}
            />
            <StatTile
              icon={<FiTrendingUp className="text-emerald-400" size={14} />}
              iconBg="bg-emerald-900/25 border-emerald-700/40"
              label="In progress"
              value={getInProgressCount(courses)}
              compact={isPreview}
            />
          </div>
        </motion.section>
      )}

      {/* Distributionals */}
      {showDistContent && (
        <motion.section
          initial={isPreview ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: sectionDelay + 0.2 }}
        >
          <h2 className="text-sm font-medium mb-3 text-gray-300">
            Distributional progress
          </h2>
          <div className={CARD_SURFACE + " p-4"}>
            <CompactDistributionalProgress courses={coursesWithIds} />
          </div>
        </motion.section>
      )}

      {/* Courses */}
      {showCourseContent && (
        <motion.section
          initial={isPreview ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: sectionDelay + 0.3 }}
        >
          <h2 className="text-sm font-medium mb-3 text-gray-300">
            Courses by semester
          </h2>
          <CoursesBySemester courses={courses} compact={isPreview} />
        </motion.section>
      )}

      {/* Empty courses when sharing enabled but no courses */}
      {!friendsFeatureDisabled &&
        vis.showCourses &&
        courses.length === 0 && (
          <motion.section
            initial={isPreview ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-sm font-medium mb-3 text-gray-300">
              Courses by semester
            </h2>
            <CoursesBySemester courses={[]} compact={isPreview} />
          </motion.section>
        )}
    </div>
  );
}
