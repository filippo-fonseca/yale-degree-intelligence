"use client";

import { Course } from "@/lib/types";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import { motion } from "framer-motion";
import { FiCheck } from "react-icons/fi";
import { getDistPillStyle } from "@/lib/constants";
import { type DistAllocation } from "@/lib/distributionalAllocation";
import { CREDIT_D_FAIL_DIST_NOTE } from "@/lib/utils/creditDFail";
import {
  getReqStatus,
  STATUS_CLASSES,
} from "../MajorProgressView/requirementStatus";
import { CARD_COLORS } from "./constants";

// ─── Individual Requirement Card ──────────────────────────────────────────────

export function DistReqCard({
  req,
  count,
  courses: coursesForReq,
  target = 2,
  manual = false,
  allocation,
  onReassign,
  creditDFailCourses = [],
}: {
  req: { code: string; name: string; color: string };
  count: number;
  courses: Course[];
  /** Courses tagged for this requirement but taken Credit/D/Fail. */
  creditDFailCourses?: Course[];
  target?: number;
  manual?: boolean;
  allocation?: DistAllocation;
  onReassign?: (courseCode: string, reqCode: string) => void;
}) {
  const fulfilled = count >= target;
  const progress = Math.min(count / target, 1);
  const colors = CARD_COLORS[req.color] ?? CARD_COLORS.purple;

  // Use STATUS_CLASSES for card surface theming
  const status = getReqStatus(count, 0, target);
  const statusClasses = STATUS_CLASSES[status];

  // Pill from constants (matches the rest of the app)
  const pillStyle = getDistPillStyle(req.code);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`p-4 rounded-xl border transition-all relative backdrop-blur-md shadow-neu ${statusClasses.card}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg border ${pillStyle}`}>
            {req.code}
          </span>
          <span className={`text-sm font-medium ${statusClasses.title}`}>{req.name}</span>
        </div>
        {fulfilled ? (
          <span className="text-emerald-500 dark:text-emerald-400">
            <FiCheck size={18} strokeWidth={3} />
          </span>
        ) : (
          <span className={`text-xs px-1.5 py-0.5 rounded-md ${statusClasses.badge}`}>
            {Math.min(count, target)}/{target}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-800/70 rounded-full overflow-hidden mb-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            backgroundColor: fulfilled ? "#34d399" : colors.bar,
            boxShadow: fulfilled
              ? "0 0 10px rgba(52,211,153,0.75)"
              : `0 0 10px ${colors.bar}bf`,
          }}
        />
      </div>

      {/* Ratio text */}
      <div className="flex justify-between items-center mb-0">
        <span className={`text-xs ${statusClasses.description}`}>
          {Math.min(count, target)} of {target} credits
        </span>
        {count > target && (
          <span className="text-xs text-gray-400 dark:text-gray-500">(+{count - target} extra)</span>
        )}
      </div>

      {/* Course list */}
      {coursesForReq.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-800/50 space-y-1.5">
          {coursesForReq.map((course) => {
            const options =
              allocation?.optionsByCourseKey[allocation.keyOf(course)] ?? [];
            const canReassign = manual && options.length > 1 && onReassign;
            const isCompleted =
              course.status === "completed" && !course.skipped;
            const isInProgress = course.status === "in-progress";
            const courseName =
              course.name ?? getCourseNameFromCode(course.code);
            return (
              <div
                key={course.id}
                className="flex items-center justify-between gap-2"
              >
                {/* Code and name stay visible even when the reassign picker
                    is showing, so it is clear which course is being moved. */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span
                    className={`text-xs font-medium shrink-0 ${
                      isCompleted
                        ? "text-gray-700 dark:text-gray-300"
                        : isInProgress
                        ? "text-blue-600 dark:text-blue-300"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {course.code}
                  </span>
                  {isInProgress && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-300/50 dark:border-blue-700/40 shrink-0">
                      IP
                    </span>
                  )}
                  {canReassign && courseName && (
                    <span
                      className="text-xs text-gray-400 dark:text-gray-500 truncate min-w-0"
                      title={courseName}
                    >
                      {courseName}
                    </span>
                  )}
                </div>
                {canReassign ? (
                  <select
                    value={req.code}
                    onChange={(e) => onReassign!(course.code, e.target.value)}
                    className="shrink-0 text-[11px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/80 text-gray-700 dark:text-gray-200 px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    title={`Count ${course.code} toward a different requirement`}
                    aria-label={`Requirement that ${course.code}${
                      courseName ? ` (${courseName})` : ""
                    } counts toward`}
                  >
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-500 truncate ml-2 max-w-[150px] text-right">
                    {courseName}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tagged for this requirement but taken Credit/D/Fail: listed so the
          course does not silently vanish, struck through because it counts
          for nothing here. */}
      {creditDFailCourses.length > 0 && (
        <div
          className={`${
            coursesForReq.length > 0 ? "mt-1.5" : "mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-800/50"
          } space-y-1.5`}
        >
          {creditDFailCourses.map((course) => (
            <div
              key={`crdf-${course.id}`}
              className="flex items-center justify-between gap-2"
              title={CREDIT_D_FAIL_DIST_NOTE}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 line-through">
                  {course.code}
                </span>
                <span className="text-[9px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 border border-gray-300/60 dark:border-gray-700/50 shrink-0">
                  Cr/D/F
                </span>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate ml-2 max-w-[150px] text-right">
                Does not count
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
