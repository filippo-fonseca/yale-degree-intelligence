"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FiTrash2 } from "react-icons/fi";
import { Course } from "@/lib/types";
import { getDistPillStyle } from "@/lib/constants";
import { getGPAColor } from "@/lib/utils/utils";
import { getCourseNameFromCode } from "@/lib/courseCatalog";

interface CourseCardProps {
  course: Course;
  distSelectorCourseId: string | null;
  onCardClick: (course: Course) => void;
  onDeleteClick: (course: Course) => void;
  onDistSelectorToggle: (courseId: string) => void;
  onToggleDistributional: (courseId: string, dist: string) => void;
}

const DIST_AREAS = ["Hu", "So", "Sc"] as const;
const DIST_SKILLS = ["QR", "WR"] as const;
const DIST_LANGS = ["L1", "L2", "L3", "L4", "L5"] as const;

function getStatusClasses(
  status: Course["status"],
  skipped?: boolean,
): { card: string; badge: string; badgeText: string } {
  if (skipped) {
    return {
      card: "bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/50 dark:via-gray-900/30 dark:to-gray-950/50 border-gray-200 dark:border-gray-800/40",
      badge:
        "bg-gray-100 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-700/40",
      badgeText: "Skipped",
    };
  }
  if (status === "completed") {
    return {
      card: "bg-emerald-50/60 dark:bg-transparent dark:bg-gradient-to-br dark:from-emerald-950/25 dark:via-gray-900/50 dark:to-gray-950/50 border-emerald-200 dark:border-emerald-800/25 hover:border-emerald-300 dark:hover:border-emerald-600/35",
      badge:
        "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/30",
      badgeText: "",
    };
  }
  if (status === "in-progress") {
    return {
      card: "bg-blue-50/60 dark:bg-transparent dark:bg-gradient-to-br dark:from-blue-950/25 dark:via-gray-900/50 dark:to-gray-950/50 border-blue-200 dark:border-blue-800/25 hover:border-blue-300 dark:hover:border-blue-600/35",
      badge:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-300 dark:border-blue-700/30",
      badgeText: "In Progress",
    };
  }
  return {
    card: "bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/50 dark:via-gray-900/30 dark:to-gray-950/50 border-gray-200 dark:border-gray-800/40",
    badge:
      "bg-gray-100 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-700/40",
    badgeText: "Not taken",
  };
}

export function CourseCard({
  course,
  distSelectorCourseId,
  onCardClick,
  onDeleteClick,
  onDistSelectorToggle,
  onToggleDistributional,
}: CourseCardProps) {
  const courseName = getCourseNameFromCode(course.code);
  const { card, badge, badgeText } = getStatusClasses(
    course.status,
    course.skipped,
  );

  const gradeBadge =
    course.status === "completed" && !course.skipped && course.grade
      ? course.grade
      : badgeText;

  const gradeColor =
    course.status === "completed" && !course.skipped && course.grade
      ? getGPAColor(course.grade)
      : "";

  const distributionals = course.distributionals || [];
  const selectorOpen = distSelectorCourseId === course.id;

  return (
    <motion.div
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.12 }}
      className={`relative p-4 cursor-pointer rounded-xl backdrop-blur-sm border transition-all shadow-sm dark:shadow-none ${card}`}
      onClick={() => onCardClick(course)}
    >
      {/* Top row */}
      <div className="flex justify-between items-start">
        <div className="pr-8 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm leading-snug">
              {course.code}
            </h4>
            {course.skipped && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                skipped
              </span>
            )}
          </div>
          {courseName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug line-clamp-1">
              {courseName}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge} ${gradeColor}`}
            >
              {gradeBadge || "Completed"}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {course.credits} credit{course.credits !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Delete button (non-skipped only) */}
        {!course.skipped && (
          <button
            aria-label="Delete course"
            className="absolute top-3 right-3 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 hover:border-red-400 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(course);
            }}
            title="Delete course"
          >
            <FiTrash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Distributional tags + editor */}
      <div
        className="mt-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {distributionals.map((d, dIdx) => (
            <span
              key={`${d}-${dIdx}`}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getDistPillStyle(d)}`}
            >
              {d}
            </span>
          ))}
          {distributionals.length === 0 ? (
            <button
              onClick={() => onDistSelectorToggle(course.id)}
              className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-purple-500/50 hover:border-purple-400/70 transition-all"
            >
              + assign distributional
            </button>
          ) : (
            <button
              onClick={() => onDistSelectorToggle(course.id)}
              className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800/50 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-dashed border-gray-300 dark:border-gray-700/50 transition-all"
            >
              edit distribs.
            </button>
          )}
        </div>

        <AnimatePresence>
          {selectorOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 space-y-2.5">
                <DistSection
                  label="Areas"
                  items={[...DIST_AREAS]}
                  selected={distributionals}
                  courseId={course.id}
                  onToggle={onToggleDistributional}
                />
                <DistSection
                  label="Skills"
                  items={[...DIST_SKILLS]}
                  selected={distributionals}
                  courseId={course.id}
                  onToggle={onToggleDistributional}
                />
                <DistSection
                  label="Language"
                  items={[...DIST_LANGS]}
                  selected={distributionals}
                  courseId={course.id}
                  onToggle={onToggleDistributional}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function DistSection({
  label,
  items,
  selected,
  courseId,
  onToggle,
}: {
  label: string;
  items: string[];
  selected: string[];
  courseId: string;
  onToggle: (courseId: string, dist: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((d) => (
          <button
            key={d}
            onClick={() => onToggle(courseId, d)}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
              selected.includes(d)
                ? getDistPillStyle(d)
                : "bg-white dark:bg-gray-800/50 text-gray-500 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
